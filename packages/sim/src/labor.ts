import { BUILDING_BY_ID, CLASS_DEFS, SUBSISTENCE, TUNE } from './data';
import { borrow, companyById, emptyJobs, emptyStats, harvestFactor, isSubsistence, paysDividend, peasantSlots, regionById, slots, staffing } from './economy';
import { harvestShares } from './market';
import { findPop, getPop, movePeople, popsIn, workforce } from './pops';
import { clamp } from './rng';
import { POP_CLASSES, SKILLS } from './types';
import type { Building, GoodBag, Pop, PopClass, Region, Skill, World } from './types';

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

/** 소작농 1인당 하루 소득 가치 (현물 + 판매분에서 수확과 같은 지대·토지세 몫을 뺀 것, 기상 조건 포함). 노동자 일자리와 비교하는 기준 */
export function subsistenceWage(w: World, r: Region): number {
  const m = r.market;
  const gross = SUBSISTENCE.grainPerWorker * m.grain.price + SUBSISTENCE.fiberPerWorker * m.fiber.price + SUBSISTENCE.timberPerWorker * m.timber.price;
  const { rent, tax } = harvestShares(w, r);
  return gross * (1 - rent - tax) * harvestFactor(w, r.id, 'arable');
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
  const c = companyById(w, b.companyId);
  for (const s of SKILLS) {
    const n = slots(b, s);
    if (n > 0) out.push({ b, prof: s, slots: n, wage: paysDividend(b.stateOwned, s) ? dividendWage(b, s) : c?.wages[s] ?? 0 });
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

/**
 * 임금 지급: 회사가 자기 건물에서 일하는 pop 에게 임금을 준다. 모자라면 자동 대출, 그래도 모자라면 비례로 덜 준다.
 * 소유 건물(저택·금융가)의 귀족·자본가는 배당과 지대를, 소작지의 소작농은 수확을 받으므로 임금이 없다.
 */
export function payWages(w: World) {
  const byId = new Map(w.buildings.map((b) => [b.id, b]));
  const workersOf = new Map<number, Pop[]>();
  for (const p of w.pops) {
    if (p.work === 0 || !SKILLS.includes(p.prof as Skill)) continue;
    const b = byId.get(p.work);
    if (!b || BUILDING_BY_ID[b.typeId].auto || paysDividend(b.stateOwned, p.prof as Skill)) continue;
    const list = workersOf.get(p.work);
    if (list) list.push(p); else workersOf.set(p.work, [p]);
  }
  for (const c of w.companies) {
    const mine = w.buildings.filter((b) => b.companyId === c.id);
    let bill = 0;
    for (const b of mine) for (const p of workersOf.get(b.id) ?? []) bill += workforce(p) * c.wages[p.prof as Skill];
    if (c.cash < bill) borrow(w, c, bill - c.cash);
    const ratio = bill > 0 ? clamp(c.cash / bill, 0, 1) : 1;
    for (const b of mine) {
      let paid = 0;
      for (const p of workersOf.get(b.id) ?? []) {
        const amt = workforce(p) * c.wages[p.prof as Skill] * ratio;
        p.savings += amt;
        p.lastIncome += amt;
        paid += amt;
      }
      c.cash -= paid;
      b.unpaid = ratio < 0.999;
      b.last = { ...emptyStats(), wageCost: paid, staffing: isSubsistence(b.typeId) ? (b.tenants ?? 0) / Math.max(1, peasantSlots(b)) : staffing(b) };
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
    if (slots(b, s) - b.employed[s] > 1) best = Math.max(best, paysDividend(b.stateOwned, s) ? dividendWage(b, s) : companyById(w, b.companyId)?.wages[s] ?? 0);
  }
  let food = 0, n = 0;
  for (const p of w.pops) if (p.regionId === r.id) { food += p.food * p.size; n += p.size; }
  return best * (n > 0 ? food / n : 1);
}

/** 일하는 pop 이 지금 자리에서 받는 1인당 하루 소득 (소작지는 수확 가치, 소유 자리는 배당 추정) */
function seatWage(w: World, r: Region, p: Pop, b: Building | undefined): number {
  if (!b) return 0;
  if (isSubsistence(b.typeId)) return subsistenceWage(w, r);
  const s = p.prof as Skill;
  return paysDividend(b.stateOwned, s) ? dividendWage(b, s) : companyById(w, b.companyId)?.wages[s] ?? 0;
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
