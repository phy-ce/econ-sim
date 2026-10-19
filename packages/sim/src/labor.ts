import { BUILDING_BY_ID, CLASS_DEFS, GOOD_IDS, SKILL_DEFS, SUBSISTENCE, TUNE, getMethod } from './data';
import { borrow, companyById, emptyJobs, emptyStats, isGovFunded, isSubsistence, paysDividend, paysWage, peasantSlots, regionById, slots, staffing } from './economy';
import { settleSubsidy } from './finance';
import { harvestShares } from './market';
import { findPop, getPop, movePeople, popsIn, workforce } from './pops';
import { clamp, round2 } from './rng';
import { POP_CLASSES, SKILLS } from './types';
import type { Building, Company, GoodBag, Pop, PopClass, Region, Skill, World } from './types';

// 노동시장 (빅토리아3 방식): 직종 이동은 따로 정한 비율이 아니라 건물의 채용으로만 일어난다.
// 빈자리가 있는 건물은 같은 직종 실업자 → 임금이 더 낮은 곳에서 일하는 같은 직종 → 그 직종 자격을 가진 다른 직종 순으로 뽑는다.

/** 하루 채용 상한: 자리의 이 비율 (최소 3명) */
export const HIRE_RATE = 0.01;
/** 임금을 다 못 받으면 하루에 떠나는 비율 */
const UNPAID_QUIT = 0.03;
/** 노동자는 다른 직종이 이 비율 이상 차야 다 뽑힌다 (직종 비율 유지) */
const RATIO_GATE = 0.9;

interface Seat { b: Building; prof: PopClass; slots: number; wage: number }

const PROF_INDEX = Object.fromEntries(POP_CLASSES.map((s, i) => [s, i])) as Record<PopClass, number>;
/** (일터, 직종) 의 숫자 키 */
const seatKey = (work: number, prof: PopClass) => work * POP_CLASSES.length + PROF_INDEX[prof];

/** 소작농 1인당 하루 소득 가치 (현물 + 판매분에서 수확과 같은 지대·토지세 몫을 뺀 것). 노동자 일자리와 비교하는 기준 */
export function subsistenceWage(w: World, r: Region): number {
  const m = r.market;
  const gross = SUBSISTENCE.grainPerWorker * m.grain.price + SUBSISTENCE.fiberPerWorker * m.fiber.price + SUBSISTENCE.timberPerWorker * m.timber.price;
  const { rent, tax } = harvestShares(w, r);
  return gross * (1 - rent - tax);
}

/** 소작지 노동 인구 wf 의 하루 현물 (수확 중 시장에 팔지 않는 몫) */
export function subsistenceKind(wf: number): GoodBag {
  const k = wf * (1 - TUNE.peasantMarketShare);
  return {
    grain: k * SUBSISTENCE.grainPerWorker, fiber: k * SUBSISTENCE.fiberPerWorker, timber: k * SUBSISTENCE.timberPerWorker,
  };
}

/** 소유 건물 자리 하나가 기대하는 하루 배당·지대 (채용 순서용 추정) */
function dividendWage(b: Building, s: Skill): number {
  const jobs = slots(b, s);
  return jobs > 0 ? Math.max(0, b.profitEma) / jobs : 0;
}

function seatsOf(w: World, r: Region, b: Building): Seat[] {
  const out: Seat[] = [];
  if (isSubsistence(b.typeId)) {
    out.push({ b, prof: 'peasant', slots: peasantSlots(b), wage: subsistenceWage(w, r) });
    return out;
  }
  for (const s of SKILLS) {
    const n = slots(b, s);
    if (n > 0) out.push({ b, prof: s, slots: n, wage: paysDividend(b.stateOwned, s) ? dividendWage(b, s) : b.wages[s] });
  }
  return out;
}

/** 하루 노동시장: 해고 → 채용 → 건물 고용 합계 갱신 */
export function laborMarket(w: World) {
  const byId = new Map(w.buildings.map((b) => [b.id, b]));
  for (const r of w.regions) {
    const local = w.buildings.filter((b) => b.regionId === r.id);
    const seats = local.flatMap((b) => seatsOf(w, r, b));
    const seatOf = new Map(seats.map((s) => [seatKey(s.b.id, s.prof), s]));
    const pops = popsIn(w, r.id);

    // 1) 해고: 건물이 사라졌거나, 자리가 줄었거나, 임금을 못 받았으면 실업자가 된다
    const employed = new Map<number, number>();
    for (const p of pops) if (p.work !== 0) employed.set(seatKey(p.work, p.prof), (employed.get(seatKey(p.work, p.prof)) ?? 0) + workforce(p));
    for (const p of pops) {
      if (p.work === 0 || p.size <= 0) continue;
      const b = byId.get(p.work);
      const seat = seatOf.get(seatKey(p.work, p.prof));
      const have = employed.get(seatKey(p.work, p.prof)) ?? 0;
      let fire = 0;
      if (!b || !seat) fire = 1;
      else if (have > seat.slots + 1e-6) fire = 1 - seat.slots / have;
      if (b?.unpaid && SKILLS.includes(p.prof as Skill)) fire = Math.max(fire, UNPAID_QUIT);
      if (fire > 0) movePeople(w, p, getPop(w, r.id, p.prof, 0), workforce(p) * fire);
    }

    // 2) 채용: 임금이 높은 자리부터
    const emp = (b: Building, prof: PopClass) => {
      const p = findPop(w, r.id, prof, b.id);
      return p ? workforce(p) : 0;
    };
    // 지역 pop 목록: 새로 생긴 pop(getPop 은 w.pops 끝에 붙인다)만 더한다
    let here: Pop[] | null = null, seen = 0;
    const current = () => {
      if (!here) { here = popsIn(w, r.id); seen = w.pops.length; }
      for (; seen < w.pops.length; seen++) if (w.pops[seen].regionId === r.id) here.push(w.pops[seen]);
      return here;
    };
    seats.sort((a, b) => b.wage - a.wage || a.b.id - b.b.id);
    for (const seat of seats) {
      const { b, prof } = seat;
      if (!canHire(b, prof)) continue;
      let room = Math.min(seat.slots - emp(b, prof), Math.max(3, seat.slots * HIRE_RATE));
      if (prof === 'unskilled') room = Math.min(room, seat.slots * ratioGate(b) - emp(b, prof));
      if (room <= 0.01) continue;
      const dest = getPop(w, r.id, prof, b.id);
      const take = (src: Pop, n: number, qualified?: PopClass) => {
        const moved = movePeople(w, src, dest, Math.min(n, room), qualified);
        room -= moved;
      };
      const all = current();
      // 같은 직종 실업자
      for (const p of all) { if (room <= 0.01) break; if (p.prof === prof && p.work === 0 && p !== dest) take(p, workforce(p)); }
      // 지금보다 소득이나 생활수준이 TUNE.switchPremium 배 넘게 나은 자리로 옮긴다 (같은 직종, 아래 직종도 마찬가지)
      const better = (p: Pop) => {
        const from = seatOf.get(seatKey(p.work, p.prof));
        if (!from) return false;
        if (from.wage * TUNE.switchPremium < seat.wage) return true;
        const there = findPop(w, r.id, prof, b.id);
        return !!there && there.size > 0 && there.sol > p.sol * TUNE.switchPremium;
      };
      for (const p of all) {
        if (room <= 0.01) break;
        if (p.prof !== prof || p.work === 0 || p === dest) continue;
        if (better(p)) take(p, workforce(p) * TUNE.switchRate);
      }
      // 다른 직종: 노동자와 소작농 자리는 누구나, 그 위 직종은 자격자만
      const open = prof === 'unskilled' || prof === 'peasant';
      for (const p of all) {
        if (room <= 0.01) break;
        if (p.prof === prof || p === dest || p.size <= 0) continue;
        if (p.prof === 'capitalist' || p.prof === 'aristocrat') { if (open) continue; }
        const q = open ? workforce(p) : (p.quals[prof] ?? 0);
        if (q <= 1e-6) continue;
        if (p.work === 0) { take(p, q, open ? undefined : prof); continue; }
        if (better(p)) take(p, q * TUNE.switchRate, open ? undefined : prof);
      }
    }
  }
  syncEmployment(w);
}

/**
 * 이 자리에 사람을 뽑는가: 어제 임금을 다 못 준 건물은 임금 자리를 뽑지 않는다 (빅토리아3처럼 임금을 더 깎는 대신 줄인다).
 * 일꾼은 하루 3%씩 떠나고, 임금을 다 줄 수 있는 크기가 되면 다시 뽑는다. 소작지·배당 자리는 임금이 없어 늘 뽑는다
 */
export function canHire(b: Building, prof: PopClass): boolean {
  return !b.unpaid || !SKILLS.includes(prof as Skill) || !paysWage(b, prof as Skill);
}

/**
 * 그 건물이 내건 임금 중 마지막 지급(payWages)에서 실제로 준 비율. 임금을 다 줬으면 1.
 * 이주(지금 자리 소득)와 지표(실제 받는 임금)는 내건 임금이 아니라 이 비율을 곱한 임금을 쓴다
 */
export function paidShare(b: Building): number {
  if (!b.unpaid) return 1;
  let bill = 0;
  for (const s of SKILLS) if (paysWage(b, s)) bill += b.employed[s] * b.wages[s];
  return bill > 0 ? clamp(b.last.wageCost / bill, 0, 1) : 0;
}

/** 노동자 충원 상한 비율: 다른 직종(기술자·전문가) 중 가장 덜 찬 쪽 / 0.9 */
function ratioGate(b: Building): number {
  let gate = 1;
  for (const s of ['skilled', 'expert'] as const) {
    const n = slots(b, s);
    if (n > 0) gate = Math.min(gate, b.employed[s] / n / RATIO_GATE);
  }
  return clamp(gate, 0, 1);
}

/** pop 으로부터 건물의 고용·소유주·소작농 합계를 다시 센다 */
export function syncEmployment(w: World) {
  const byId = new Map(w.buildings.map((b) => [b.id, b]));
  for (const b of w.buildings) { b.employed = emptyJobs(); b.tenants = 0; }
  for (const p of w.pops) {
    if (p.work === 0) continue;
    const b = byId.get(p.work);
    if (!b) continue;
    const wf = workforce(p);
    if (p.prof === 'peasant') b.tenants = (b.tenants ?? 0) + wf;
    else b.employed[p.prof] += wf;
  }
}

/** 오늘 살 투입재 값 (collectOrders 와 같은 계산: 2일분 보유 목표 − 재고, 지역 가격). st 는 작업 인원 비율 */
export function inputNeed(w: World, b: Building, st: number): number {
  if (!b.active) return 0;
  const m = getMethod(b.typeId, b.methodId);
  const mk = regionById(w, b.regionId).market;
  let v = 0;
  for (const g of GOOD_IDS) {
    const per = m.inputs[g];
    if (per) v += Math.max(0, per * b.level * b.utilization * st * 2 - (b.stock[g] ?? 0)) * mk[g].price;
  }
  return v;
}

/**
 * 임금 지급 (매일): 건물이 자기 현금으로 자기 일꾼에게 그 건물 임금을 준다. 빌리지 않는다.
 * 현금이 오늘 임금 + 오늘 살 투입재보다 적으면 둘을 같은 비율로 줄인다 (미지급: 하루 3%가 떠나고, 다음 날 사람을 뽑지 않는다 canHire).
 * 임금에 다 쓰면 원료를 못 사 생산과 매출이 끊기기 때문이다. 흑자 건물은 하루 매출이 그날 비용보다 커 며칠 안에 다 준다.
 * 현금과 원료가 다 떨어진 건물은 매출도 없어 혼자 다시 일어서지 못한다 (보조금이나 철거, AI는 늘리지 않는다).
 * 보조금 건물은 국고가 그 주 적자만큼을 먼저 채운다 (settleSubsidy). 정부 자금 건물(왕실 행정청·건축사무소·학교)은 국고가 바로 낸다 (모자라면 국채).
 * 정부 자금 건물을 보조금 건물보다 먼저 낸다 (같은 국고에서 보조금이 먼저 나가면, 빌릴 수 없을 때 국고가 마이너스가 된다).
 * 소유 건물(저택·금융가)의 귀족·자본가는 배당과 지대를, 소작지의 소작농은 수확을 받으므로 임금이 없다.
 */
export function payWages(w: World) {
  const byId = new Map(w.buildings.map((b) => [b.id, b]));
  const workersOf = new Map<number, Pop[]>();
  for (const p of w.pops) {
    if (p.work === 0 || !SKILLS.includes(p.prof as Skill)) continue;
    const b = byId.get(p.work);
    if (!b || !paysWage(b, p.prof as Skill)) continue;
    const list = workersOf.get(p.work);
    if (list) list.push(p); else workersOf.set(p.work, [p]);
  }
  const billOf = (b: Building) => {
    let bill = 0;
    for (const p of workersOf.get(b.id) ?? []) bill += workforce(p) * b.wages[p.prof as Skill];
    return bill;
  };
  // 정부 자금 건물은 왕국마다 합쳐서 국고가 낸다
  const govBill = new Map<Company, number>();
  for (const b of w.buildings) {
    if (!isGovFunded(b)) continue;
    const c = companyById(w, b.companyId);
    if (c) govBill.set(c, (govBill.get(c) ?? 0) + billOf(b));
  }
  const govRatio = new Map<Company, number>();
  for (const [c, bill] of govBill) {
    if (c.cash < bill) borrow(w, c, bill - c.cash);
    govRatio.set(c, bill > 0 ? clamp(c.cash / bill, 0, 1) : 1);
  }
  // 정부 자금 건물을 먼저 낸다: 보조금(settleSubsidy)이 같은 국고에서 먼저 나가면 위 비율로 낼 돈이 모자란다
  const order = [...w.buildings.filter((b) => isGovFunded(b)), ...w.buildings.filter((b) => !isGovFunded(b))];
  for (const b of order) {
    const bill = billOf(b);
    const gov = isGovFunded(b) ? companyById(w, b.companyId) : undefined;
    const st = isSubsistence(b.typeId) ? (b.tenants ?? 0) / Math.max(1, peasantSlots(b)) : staffing(b);
    let ratio = 1;
    if (gov) ratio = govRatio.get(gov) ?? 1;
    else if (bill > 0 && b.subsidized) {
      settleSubsidy(w, b, bill);
      ratio = clamp(b.cash / bill, 0, 1);
    } else if (bill > 0) {
      const need = bill + inputNeed(w, b, Math.max(st, b.crew ?? 0));
      ratio = b.cash >= need ? 1 : clamp(b.cash / need, 0, 1);
    }
    let paid = 0;
    for (const p of workersOf.get(b.id) ?? []) {
      const amt = workforce(p) * b.wages[p.prof as Skill] * ratio;
      p.savings += amt;
      p.lastIncome += amt;
      paid += amt;
    }
    if (gov) gov.cash -= paid; else b.cash -= paid;
    b.week.wages += paid;
    b.unpaid = ratio < 0.999;
    b.last = { ...emptyStats(), wageCost: paid, staffing: st };
  }
}

// ---------------------------------------------------------------- 건물 임금 (주간)

/** 빈자리 비율이 이보다 크면 사람이 모자란 것, 이보다 작으면 다 찬 것 */
const VACANT_HIGH = 0.05;
const VACANT_LOW = 0.02;
/** 지난주 고용이 빈자리의 이 비율 넘게 늘었으면 사람이 오고 있는 것 (올리지 않는다) */
const HIRING_PACE = 0.1;
/** 임금의 기술적 범위 (최저임금이 아니다): 기본 임금 × 0.1 ~ 3 */
const WAGE_MIN = 0.1;
const WAGE_MAX = 3;

/**
 * 그 지역에서 이 직종 자리를 바로 채울 수 있는 실업자 (labourPool 과 같은 자격 규칙):
 * 노동자 자리는 귀족·자본가를 뺀 모든 실업자, 그 위 자리는 그 직종 실업자와 그 자격을 가진 다른 직종 실업자
 */
function idleFor(pops: Pop[], s: Skill): number {
  let n = 0;
  for (const p of pops) {
    if (p.work !== 0 || p.size <= 0) continue;
    if (p.prof === s) n += workforce(p);
    else if (s === 'unskilled') { if (p.prof !== 'capitalist' && p.prof !== 'aristocrat') n += workforce(p); }
    else n += p.quals[s] ?? 0;
  }
  return n;
}

/** 이 직종 자리 중 지금 채울 수 있는 몫: 노동자 자리는 기술자·전문가 충원율(ratioGate)을 넘게 채우지 않으므로 그만큼만 센다 */
function fillable(b: Building, s: Skill): number {
  const n = slots(b, s);
  return s === 'unskilled' ? n * ratioGate(b) : n;
}

/**
 * 건물 임금 (매주, 모든 건물이 같은 규칙. 플레이어도 임금을 손으로 정하지 않는다). 직종마다:
 * - 지난주 수지(매출 − 임금 − 원료, 보조금 전)가 마이너스이거나 임금을 다 못 줬으면 모든 직종 −TUNE.wageCut
 *   (보조금 건물과 정부 자금 건물은 깎지 않는다)
 * - 아니면 빈자리 > 5%이고, 지난주 고용이 빈자리의 10%도 못 늘었고, 그 지역 그 직종 실업 자격자가 지역 빈자리보다 적으면 (사람이 모자란다)
 *   +TUNE.wageRaise. 수지가 플러스이고 임금을 다 준 건물만 올린다 (보조금 건물도 보조금 전 수지로 본다).
 *   정부 자금 건물은 수지를 보지 않는 대신 그 왕국 보통 임금(현금 건물의 그 직종 평균, 없으면 기본 임금)까지만 올린다
 * - 빈자리 < 2%이고 그 지역 실업 자격자가 지역 빈자리보다 그 직종 지역 일자리의 1% 넘게 많으면 (사람이 남는다) −TUNE.wageDrift
 * - 빈자리는 지금 채울 수 있는 자리로 센다 (fillable: 노동자 자리는 기술자·전문가 충원율만큼)
 * - 바닥: 옮겨 올 사람의 지금 소득 × TUNE.wageOutside (wageFloor). 최저임금이 아니라 바깥 선택지다
 * - 기본 임금 × 0.1 ~ 3 으로 자른다 (기술적 범위, 최저임금이 아니다)
 * 끝으로 회사 화면용 평균 임금(Company.wages)을 다시 센다
 */
export function adjustWages(w: World) {
  const idle = new Map<string, number>(), vacant = new Map<string, number>(), jobs = new Map<string, number>();
  const key = (r: number, s: Skill) => `${r}|${s}`;
  for (const r of w.regions) {
    const pops = popsIn(w, r.id);
    for (const s of SKILLS) idle.set(key(r.id, s), idleFor(pops, s));
  }
  // 왕국 보통 임금: 현금 건물(정부 자금 건물 제외)이 주는 직종별 평균 임금 (고용 가중)
  const kingdomOf = new Map(w.regions.map((r) => [r.id, r.kingdomId]));
  const paidK = new Map<string, number>(), empK = new Map<string, number>();
  for (const b of w.buildings) {
    if (BUILDING_BY_ID[b.typeId].auto) continue;
    const gov = isGovFunded(b);
    for (const s of SKILLS) {
      if (!paysWage(b, s)) continue;
      const n = fillable(b, s);
      if (n > 0) {
        const k = key(b.regionId, s);
        jobs.set(k, (jobs.get(k) ?? 0) + n);
        vacant.set(k, (vacant.get(k) ?? 0) + Math.max(0, n - b.employed[s]));
      }
      if (!gov && b.employed[s] > 0) {
        const kk = key(kingdomOf.get(b.regionId) ?? 0, s);
        paidK.set(kk, (paidK.get(kk) ?? 0) + b.employed[s] * b.wages[s]);
        empK.set(kk, (empK.get(kk) ?? 0) + b.employed[s]);
      }
    }
  }
  const normal = (b: Building, s: Skill) => {
    const kk = key(kingdomOf.get(b.regionId) ?? 0, s), n = empK.get(kk) ?? 0;
    return n > 0 ? paidK.get(kk)! / n : SKILL_DEFS[s].baseWage;
  };
  for (const b of w.buildings) {
    if (BUILDING_BY_ID[b.typeId].auto) continue;
    const gov = isGovFunded(b);
    const wk = b.lastWeek;
    const bal = wk.revenue - wk.wages - wk.inputs;
    const loss = !gov && (bal < 0 || b.unpaid);
    const canRaise = gov || (bal > 0 && !b.unpaid);
    const last = b.lastEmployed ?? {};
    const now: Partial<Record<Skill, number>> = {};
    const floor = TUNE.wageOutside > 0 ? wageFloor(w, b) : null;
    for (const s of SKILLS) {
      if (!paysWage(b, s) || slots(b, s) <= 0) continue;
      const n = fillable(b, s);
      const emp = b.employed[s];
      now[s] = round2(emp);
      const k = key(b.regionId, s);
      const vac = n - emp, grew = emp - (last[s] ?? emp);
      const free = idle.get(k) ?? 0, open = vacant.get(k) ?? 0;
      let wage = b.wages[s];
      if (loss && !b.subsidized) wage *= 1 - TUNE.wageCut;
      else if (canRaise && vac > n * VACANT_HIGH && grew < vac * HIRING_PACE && free < open) {
        wage *= 1 + TUNE.wageRaise;
        if (gov) wage = Math.min(wage, Math.max(b.wages[s], normal(b, s)));
      } else if (vac < n * VACANT_LOW && free > open + (jobs.get(k) ?? 0) * 0.01) wage *= 1 - TUNE.wageDrift;
      if (floor) wage = Math.max(floor[s] ?? 0, wage);
      const base = SKILL_DEFS[s].baseWage;
      b.wages[s] = round2(clamp(wage, base * WAGE_MIN, base * WAGE_MAX));
    }
    b.lastEmployed = now;
  }
  updateCompanyWages(w);
}

/**
 * 임금 바닥 (바깥 선택지, TUNE.wageOutside, 0이면 끔) = 그 자리로 옮겨 올 사람의 지금 소득 × wageOutside.
 * 노동자 ← 그 지역 소작 수확 가치, 기술자 ← 이 건물 노동자 임금, 그 위 ← 이 건물 기술자 임금
 */
function wageFloor(w: World, b: Building): Partial<Record<Skill, number>> {
  const floor: Partial<Record<Skill, number>> = {};
  const r = regionById(w, b.regionId);
  for (const s of SKILLS) floor[s] = (s === 'unskilled' ? subsistenceWage(w, r) : s === 'skilled' ? b.wages.unskilled : b.wages.skilled) * TUNE.wageOutside;
  return floor;
}

/** 회사 화면용 평균 임금: 회사 건물 임금의 고용 가중 평균 (고용이 없으면 자리 가중, 자리도 없으면 그대로) */
export function updateCompanyWages(w: World) {
  for (const c of w.companies) {
    for (const s of SKILLS) {
      let paid = 0, n = 0, seatPaid = 0, seats = 0;
      for (const b of w.buildings) {
        if (b.companyId !== c.id || !paysWage(b, s)) continue;
        paid += b.employed[s] * b.wages[s]; n += b.employed[s];
        const k = slots(b, s);
        seatPaid += k * b.wages[s]; seats += k;
      }
      if (n > 0) c.wages[s] = round2(paid / n);
      else if (seats > 0) c.wages[s] = round2(seatPaid / seats);
    }
  }
}

// ---------------------------------------------------------------- 이주

/** 이주가 시작되는 매력도 배율과 최대가 되는 배율, 하루 최대 이주 비율 */
const MIGRATE_START = 1.3;
const MIGRATE_FULL = 2;
const MIGRATE_MAX = 0.001;

/**
 * 지역 매력도: 그 직종이 이 지역에서 기대할 수 있는 1인당 소득 × 식량 충족률.
 * 하층은 노동자 빈자리 임금과 소작지 여유 중 나은 쪽, 중층은 그 직종 빈자리 임금.
 */
function attraction(w: World, r: Region, prof: PopClass): number {
  let best = 0;
  const lower = prof === 'peasant' || prof === 'unskilled';
  for (const b of w.buildings) {
    if (b.regionId !== r.id) continue;
    if (isSubsistence(b.typeId)) {
      if (lower && peasantSlots(b) - (b.tenants ?? 0) > 1) best = Math.max(best, subsistenceWage(w, r));
      continue;
    }
    const s: Skill = lower ? 'unskilled' : (prof as Skill);
    if (slots(b, s) - b.employed[s] > 1 && canHire(b, s)) best = Math.max(best, paysDividend(b.stateOwned, s) ? dividendWage(b, s) : b.wages[s]);
  }
  let food = 0, n = 0;
  for (const p of w.pops) if (p.regionId === r.id) { food += p.food * p.size; n += p.size; }
  return best * (n > 0 ? food / n : 1);
}

/** 일하는 pop 이 지금 자리에서 받는 1인당 하루 소득 (소작지는 수확 가치, 소유 자리는 배당 추정, 임금 자리는 실제로 준 임금) */
function seatWage(w: World, r: Region, p: Pop, b: Building | undefined): number {
  if (!b) return 0;
  if (isSubsistence(b.typeId)) return subsistenceWage(w, r);
  const s = p.prof as Skill;
  return paysDividend(b.stateOwned, s) ? dividendWage(b, s) : b.wages[s] * paidShare(b);
}

/**
 * 이주: 이웃 지역 매력도가 여기보다 30% 넘게 높으면 조금씩 옮겨 간다 (모든 계급).
 * 실업 pop 은 이 지역 매력도와, 일하는 pop 은 지금 소득 × 식량 충족과 비교하고 TUNE.employedMigrate 배 속도로 옮긴다
 */
export function migrate(w: World) {
  const cache = new Map<string, number>();
  const attr = (r: Region, prof: PopClass) => {
    const k = `${r.id}|${prof}`;
    if (!cache.has(k)) cache.set(k, attraction(w, r, prof));
    return cache.get(k)!;
  };
  const byId = new Map(w.buildings.map((b) => [b.id, b]));
  const foodOf = new Map<number, number>();
  const people = new Map<number, number>();
  for (const p of w.pops) { foodOf.set(p.regionId, (foodOf.get(p.regionId) ?? 0) + p.food * p.size); people.set(p.regionId, (people.get(p.regionId) ?? 0) + p.size); }
  const movers = w.pops.filter((p) => p.size > 0 && (p.work === 0 || CLASS_DEFS[p.prof].stratum !== 'upper'));
  for (const p of movers) {
    const r = regionById(w, p.regionId);
    const wf = workforce(p);
    const food = (foodOf.get(r.id) ?? 0) / Math.max(1, people.get(r.id) ?? 0);
    const here = p.work === 0 ? attr(r, p.prof) : seatWage(w, r, p, byId.get(p.work)) * food;
    let best: Region | null = null, bestA = 0;
    for (const nb of r.neighbors) {
      const a = attr(regionById(w, nb), p.prof);
      if (a > bestA) { best = regionById(w, nb); bestA = a; }
    }
    if (!best || bestA <= 0) continue;
    const ratio = here > 1e-9 ? bestA / here : MIGRATE_FULL;
    const share = MIGRATE_MAX * clamp((ratio - MIGRATE_START) / (MIGRATE_FULL - MIGRATE_START), 0, 1) * (p.work === 0 ? 1 : TUNE.employedMigrate);
    if (share <= 0) continue;
    movePeople(w, p, getPop(w, best.id, p.prof, 0), wf * share);
  }
}
