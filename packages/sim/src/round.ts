import { GOOD_IDS } from './data';
import { round2 } from './rng';
import { POP_CLASSES } from './types';
import type { Building, Household, MarketGood, Pop, World } from './types';

// 저장되는 값은 소수 둘째 자리까지 (CLAUDE.md). 하루가 끝날 때(step 끝), 세계를 만들 때, 화면이 틱 사이에 명령을 넣은 뒤에 맞춘다.
// - 돈: 계정을 센트로 반올림하고, 그 차액은 주인 없는 돈(fund)이 받는다. 국가가 만든 돈 장부도 센트로 맞춘다.
//   그래서 (화폐 총량 − 만든 돈)은 시작 값과 센트까지 같다. 계산 중에 생긴 부동소수점 찌꺼기도 매일 지워진다
// - 나머지 숫자는 그냥 반올림한다. 기록(history·metrics·events)은 쓸 때 반올림하므로 여기서 다시 훑지 않는다
// - 반올림하면 멈추는 느린 값은 규칙을 따로 두었다 (docs/DESIGN.md 2장 끝):
//   부·문해력·교육 접근도는 100배 값으로 저장하고(문해력·교육은 주 1회 7일치), 작업 인원(crew)은 하루 최소 0.01씩 움직이고,
//   상인 화물은 시장마다 하나로 합치고 상한 몫의 센트 아래를 버린다
// 수가 많은 pop·건물·시장 상품·계층 합계·공사·화물은 필드를 직접 적어 맞춘다 (모든 숫자를 훑는 roundAll 보다 몇 배 빠르다).
// 거기에 새 숫자 필드를 넣으면 여기에도 넣는다: 빠뜨리면 test/core/decimals.test.ts 가 그 경로를 알려 준다.
// 출처별 수요·공급(demandBy 등)은 매일 updatePrices 가 이동평균을 만들면서 반올림한다 (market.ts emaBy)

/** 소수 둘째 자리 (−0 은 0) */
const r = (x: number) => round2(x) + 0;

/** 훑지 않는 것: 기록(로그)은 쓸 때 반올림하고, 알림 상태는 틱(정수)만 담는다 */
const SKIP = new Set(['history', 'metrics', 'events', 'alertState']);
/** 아래에서 필드를 직접 적어 맞추는 것 */
const LISTED = new Set(['regions', 'pops', 'buildings', 'constructions', 'salvage', 'traders', 'bank', 'mint']);

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
  p.incomeEma = r(p.incomeEma);
  p.lastIncome = r(p.lastIncome);
  p.lastSpend = r(p.lastSpend);
  p.fulfillment = r(p.fulfillment);
  p.food = r(p.food);
  p.sol = r(p.sol);
  p.growth = r(p.growth);
  if (p.unsoldKind !== undefined) p.unsoldKind = r(p.unsoldKind);
  roundBag(p.quals);
  roundBag(p.inKind);
}

function roundBuilding(b: Building): void {
  b.utilization = r(b.utilization);
  b.exp = r(b.exp);
  b.profitEma = r(b.profitEma);
  if (b.privateShare !== undefined) b.privateShare = r(b.privateShare);
  if (b.tenants !== undefined) b.tenants = r(b.tenants);
  if (b.crew !== undefined) b.crew = r(b.crew);
  if (b.staffPeak !== undefined) b.staffPeak = r(b.staffPeak);
  const e = b.employed;
  e.unskilled = r(e.unskilled); e.skilled = r(e.skilled); e.expert = r(e.expert);
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
 * 돈 계정은 정해진 순서(pop, 회사, 투자 풀, 은행, 상인)로 센트에 맞추고, 늘거나 준 돈을 주인 없는 돈에 반대로 더한다.
 * 국가가 만든 돈 장부를 센트로 맞추면 장부가 늘어난 만큼 주인 없는 돈도 늘린다 (화폐 장부 = 화폐 총량 − 만든 돈이 그대로다)
 */
export function roundWorld(w: World): void {
  let rest = 0;
  const cents = (x: number) => {
    const y = r(x);
    rest += x - y;
    return y;
  };
  for (const p of w.pops) p.savings = cents(p.savings);
  for (const c of w.companies) c.cash = cents(c.cash);
  for (const k of w.kingdoms) k.investmentPool = cents(k.investmentPool);
  w.bank.cash = cents(w.bank.cash);
  w.traders.cash = cents(w.traders.cash);
  const m = w.mint;
  const ledger = (x: number, sign: 1 | -1) => {
    const y = r(x);
    rest += sign * (y - x);
    return y;
  };
  m.minted = ledger(m.minted, 1);
  m.issued = ledger(m.issued, 1);
  m.retired = ledger(m.retired, -1);
  m.interest = ledger(m.interest, -1);
  // 다른 계정이 모두 센트라 이 값도 센트다 (반올림은 부동소수점 찌꺼기만 지운다)
  w.fund = r(w.fund + rest);

  for (const p of w.pops) roundPop(p);
  for (const b of w.buildings) roundBuilding(b);
  for (const reg of w.regions) {
    reg.education100 = r(reg.education100);
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
