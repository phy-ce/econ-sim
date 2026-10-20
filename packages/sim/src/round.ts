import { GOOD_IDS } from './data';
import { mapMoney } from './economy';
import { round2 } from './rng';
import { POP_CLASSES } from './types';
import type { Building, Household, MarketGood, Pop, World } from './types';

// 저장되는 값은 소수 둘째 자리까지 (CLAUDE.md). 하루가 끝날 때(step 끝), 세계를 만들 때, 명령을 넣은 뒤(틱 사이든 step 의 명령 목록이든)에 맞춘다.
// - 돈: 계정은 센트 아래를 버리고, 버린 몫은 주인 없는 돈(fund)이 받는다 (그래서 주인 없는 돈은 음수가 되지 않는다).
//   국가가 만든 돈 장부도 센트로 맞추고 그 차액도 주인 없는 돈이 받는다.
//   그래서 (화폐 총량 − 만든 돈)은 시작 값과 센트까지 같다. 계산 중에 생긴 부동소수점 찌꺼기도 매일 지워진다.
//   마지막에 주인 없는 돈을 센트로 맞출 때 지운 양은 roundingDrift 로 본다: 누수가 없으면 찌꺼기(1e-6 아래)뿐이다
// - 나머지 숫자는 그냥 반올림한다. 기록(history·metrics·events)은 쓸 때 반올림하므로 여기서 다시 훑지 않는다
// - 반올림하면 멈추거나 빨라지는 느린 값은 규칙을 따로 두었다 (docs/DESIGN.md 2장 끝):
//   부·문해력·교육 접근도·숙련도·작업 인원은 100배 값으로 저장하고(문해력·교육은 주 1회 7일치),
//   상인 화물은 시장마다 하나로 합치고 상한 몫의 센트 아래를 버리고,
//   수요·공급 이동평균은 0.05 이하 찌꺼기를 0으로 둔다 (사고파는 사람이 없는 시장의 가격 규칙과 함께, market.ts updatePrices)
// 수가 많은 pop·건물·시장 상품·계층 합계·공사·화물은 필드를 직접 적어 맞춘다 (모든 숫자를 훑는 roundAll 보다 몇 배 빠르다).
// 거기에 새 숫자 필드를 넣으면 여기에도 넣는다: 빠뜨리면 test/core/decimals.test.ts 가 그 경로를 알려 준다.
// 출처별 수요·공급(demandBy 등)은 매일 updatePrices 가 이동평균을 만들면서 반올림한다 (market.ts emaBy)

/** 소수 둘째 자리 (−0 은 0) */
const r = (x: number) => round2(x) + 0;

/** 센트로 끝나는 값이 계산 중에 이만큼 덜 되거나 더 된 것은 부동소수점 찌꺼기로 본다 */
const NOISE = 1e-6;
/** 센트 아래를 버린다 (센트에 찌꺼기만큼 모자란 값은 그 센트로 본다) */
const down = (x: number) => { const y = r(x); return y - x > NOISE ? r(y - 0.01) : y; };
/** 센트 아래를 올린다 (센트를 찌꺼기만큼 넘는 값은 그 센트로 본다) */
const up = (x: number) => { const y = r(x); return x - y > NOISE ? r(y + 0.01) : y; };

/** 세계마다 마지막 반올림(주인 없는 돈)이 지운 양 중 가장 큰 것. 검증용으로만 쓰고 저장하지 않는다 */
const dropped = new WeakMap<World, number>();
/**
 * 이 세계에서 roundWorld 가 주인 없는 돈을 센트로 맞추며 지운 양 중 가장 큰 것 (불러온 세계는 0부터).
 * 다른 계정이 모두 센트이므로 누수가 없으면 부동소수점 찌꺼기뿐이다. 하루 0.005 미만의 누수는 장부(moneyIdentity)에는 안 보이고 여기에 보인다
 */
export const roundingDrift = (w: World): number => dropped.get(w) ?? 0;

/** 훑지 않는 것: 기록(로그)은 쓸 때 반올림하고, 알림 상태는 틱(정수)만 담는다 */
const SKIP = new Set(['history', 'metrics', 'events', 'alertState']);
/** 아래에서 필드를 직접 적어 맞추는 것 */
const LISTED = new Set(['regions', 'pops', 'buildings', 'constructions', 'salvage', 'traders', 'bank', 'mint']);

/**
 * 화면 표시용 사본(Pop.wealth·literacy, Region.education, Building.crew)을 100배 값에서 다시 쓴다 (roundWorld 가 하루 끝마다 같은 일을 한다).
 * 사본이 없는 6판 저장을 불러올 때 쓴다. sim 은 사본을 읽지 않는다
 */
export function writeMirrors(w: World): void {
  for (const p of w.pops) { p.wealth = r(p.wealth100 / 100); p.literacy = r(p.literacy100 / 100); }
  for (const reg of w.regions) reg.education = r(reg.education100 / 100);
  for (const b of w.buildings) { if (b.crew100 !== undefined) b.crew = r(b.crew100 / 100); else if (b.crew !== undefined) delete b.crew; }
}

/** 객체·배열 안의 모든 숫자를 소수 둘째 자리로 (제자리에서, −0 은 0) */
export function roundAll(o: object): void {
  if (Array.isArray(o)) {
    for (let i = 0; i < o.length; i++) {
      const v: unknown = o[i];
      if (typeof v === 'number') o[i] = r(v);
      else if (typeof v === 'object' && v !== null) roundAll(v);
    }
    return;
  }
  const rec = o as Record<string, unknown>;
  for (const k in rec) {
    const v = rec[k];
    if (typeof v === 'number') rec[k] = r(v);
    else if (typeof v === 'object' && v !== null) roundAll(v);
  }
}

/** 숫자만 담은 작은 묶음 (상품별 수량, 직종별 인원, 출처별 수요 등) */
function roundBag(o: Partial<Record<string, number>> | undefined): void {
  if (!o) return;
  for (const k in o) {
    const v = o[k];
    if (typeof v === 'number') o[k] = r(v);
  }
}

function roundPop(p: Pop): void {
  p.size = r(p.size);
  p.wealth100 = r(p.wealth100);
  p.literacy100 = r(p.literacy100);
  p.wealth = r(p.wealth100 / 100);
  p.literacy = r(p.literacy100 / 100);
  p.incomeEma = r(p.incomeEma);
  p.lastIncome = r(p.lastIncome);
  p.lastSpend = r(p.lastSpend);
  p.fulfillment = r(p.fulfillment);
  p.food = r(p.food);
  p.sol = r(p.sol);
  p.growth = r(p.growth);
  roundBag(p.quals);
  roundBag(p.inKind);
}

function roundBuilding(b: Building): void {
  b.utilization = r(b.utilization);
  b.exp100 = r(b.exp100);
  b.profitEma = r(b.profitEma);
  if (b.fillEma !== undefined) b.fillEma = r(b.fillEma);
  if (b.reserve !== undefined) b.reserve = r(b.reserve);
  if (b.privateShare !== undefined) b.privateShare = r(b.privateShare);
  if (b.tenants !== undefined) b.tenants = r(b.tenants);
  if (b.crew100 !== undefined) { b.crew100 = r(b.crew100); b.crew = r(b.crew100 / 100); } else if (b.crew !== undefined) delete b.crew;
  if (b.staffPeak !== undefined) b.staffPeak = r(b.staffPeak);
  const e = b.employed;
  e.unskilled = r(e.unskilled); e.farmer = r(e.farmer); e.skilled = r(e.skilled); e.expert = r(e.expert);
  e.gentry = r(e.gentry); e.capitalist = r(e.capitalist); e.aristocrat = r(e.aristocrat);
  roundBag(b.stock);
  roundBag(b.outStock);
  roundBag(b.materials);
  const l = b.last;
  l.revenue = r(l.revenue);
  l.inputCost = r(l.inputCost);
  l.wageCost = r(l.wageCost);
  l.staffing = r(l.staffing);
  l.inputFill = r(l.inputFill);
  l.points = r(l.points);
  if (l.tax !== undefined) l.tax = r(l.tax);
  roundBag(l.output);
}

function roundMarket(m: MarketGood): void {
  m.price = r(m.price);
  m.inventory = r(m.inventory);
  m.demand = r(m.demand);
  m.supply = r(m.supply);
  m.demandEma = r(m.demandEma);
  m.supplyEma = r(m.supplyEma);
  m.sold = r(m.sold);
  m.volumeEma = r(m.volumeEma);
  m.shippedIn = r(m.shippedIn);
  m.shippedOut = r(m.shippedOut);
}

function roundHousehold(h: Household): void {
  h.population = r(h.population);
  h.savings = r(h.savings);
  h.wealth = r(h.wealth);
  h.sol = r(h.sol);
  h.fulfillment = r(h.fulfillment);
  h.food = r(h.food);
  h.incomeEma = r(h.incomeEma);
  h.lastIncome = r(h.lastIncome);
  h.lastSpend = r(h.lastSpend);
  roundBag(h.inKind);
  roundBag(h.consumed);
}

/**
 * 세계의 저장값을 소수 둘째 자리로 맞춘다 (이미 맞춘 값은 그대로라 몇 번 불러도 같다).
 * 돈 계정(economy.ts mapMoney)은 센트 아래를 버리고, 버린 돈을 주인 없는 돈에 더한다.
 * 국가가 만든 돈 장부는 만든 돈(주조·국채 발행)을 올리고 거둔 돈(상환·이자)을 버린다: 장부가 늘어난 만큼 주인 없는 돈도 늘린다.
 * 그래서 화폐 장부(화폐 총량 − 만든 돈)가 그대로이고 주인 없는 돈은 줄지 않는다
 */
export function roundWorld(w: World): void {
  let rest = 0;
  // 계정·거둔 돈 장부는 버리고 만든 돈 장부는 올린다: 어느 쪽이든 그 차액만큼 주인 없는 돈이 받는다 (0 이상)
  const cut = (x: number) => { const y = down(x); rest += x - y; return y; };
  const made = (x: number) => { const y = up(x); rest += y - x; return y; };
  mapMoney(w, cut);
  const m = w.mint;
  m.minted = made(m.minted);
  m.issued = made(m.issued);
  m.retired = cut(m.retired);
  m.interest = cut(m.interest);
  // 다른 계정이 모두 센트라 이 값도 센트다 (반올림은 부동소수점 찌꺼기만 지운다. 지운 양이 크면 어딘가에서 돈이 새거나 생긴 것이다)
  const fund = w.fund + rest;
  w.fund = r(fund);
  const d = Math.abs(fund - w.fund);
  if (d > (dropped.get(w) ?? 0)) dropped.set(w, d);

  for (const p of w.pops) roundPop(p);
  for (const b of w.buildings) roundBuilding(b);
  for (const reg of w.regions) {
    reg.education100 = r(reg.education100);
    reg.education = r(reg.education100 / 100);
    for (const g of GOOD_IDS) roundMarket(reg.market[g]);
    const hh = reg.households;
    if (hh) for (const s of POP_CLASSES) if (hh[s]) roundHousehold(hh[s]);
  }
  for (const k of w.constructions) {
    k.points = r(k.points);
    k.spent = r(k.spent);
    if (k.privatePaid !== undefined) k.privatePaid = r(k.privatePaid);
    if (k.privateShare !== undefined) k.privateShare = r(k.privateShare);
  }
  for (const l of w.salvage) { l.q = r(l.q); l.ownerShare = r(l.ownerShare); }
  for (const sh of w.traders.shipments) sh.q = r(sh.q);
  w.traders.capital = r(w.traders.capital);
  w.bank.capital = r(w.bank.capital);
  const all = w as unknown as Record<string, unknown>;
  for (const k in all) {
    if (SKIP.has(k) || LISTED.has(k)) continue;
    const v = all[k];
    if (typeof v === 'object' && v !== null) roundAll(v);
  }
}
