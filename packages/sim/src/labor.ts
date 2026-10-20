import { BUILDING_BY_ID, CLASS_DEFS, SKILL_DEFS, TUNE, getMethod } from './data';
import { borrow, disbanded, emptyJobs, emptyStats, isSubsistence, paysDividend, paysShare, peasantSlots, shareWage } from './economy';
import { tenantIncomePerWorker } from './market';
import { findPop, getPop, movePeople, workforce } from './pops';
import { clamp } from './rng';
import { POP_CLASSES, SKILLS, WEALTH_MIN, wealthOf } from './types';
import type { Building, Company, MethodDef, Pop, PopClass, Region, Skill, World } from './types';

// 노동시장 (빅토리아3 방식): 직종 이동은 따로 정한 비율이 아니라 건물의 채용으로만 일어난다.
// 빈자리가 있는 건물은 같은 직종 실업자 → 임금이 더 낮은 곳에서 일하는 같은 직종 → 그 직종 자격을 가진 다른 직종 순으로 뽑는다.

/** 하루 채용 상한: 자리의 이 비율 (최소 3명) */
export const HIRE_RATE = 0.01;
/** 임금을 다 못 받으면 하루에 떠나는 비율 */
const UNPAID_QUIT = 0.03;
/** 노동자는 다른 직종이 이 비율 이상 차야 다 뽑힌다 (직종 비율 유지) */
const RATIO_GATE = 0.9;

interface Seat { b: Building; prof: PopClass; slots: number; wage: number; m: MethodDef | null }

const PROF_INDEX = Object.fromEntries(POP_CLASSES.map((s, i) => [s, i])) as Record<PopClass, number>;
/** (일터, 직종) 의 숫자 키 */
const seatKey = (work: number, prof: PopClass) => work * POP_CLASSES.length + PROF_INDEX[prof];

// ---------------------------------------------------------------- 한 번 호출 안에서 쓰는 색인 (저장하지 않는다)

const NO_BUILDINGS: Building[] = [];

/** id → 회사 (companyById 처럼 같은 id 면 앞의 것) */
function companyMap(w: World): Map<number, Company> {
  const m = new Map<number, Company>();
  for (const c of w.companies) if (!m.has(c.id)) m.set(c.id, c);
  return m;
}

/** id → 건물 (같은 id 면 뒤의 것) */
function buildingMap(w: World): Map<number, Building> {
  const m = new Map<number, Building>();
  for (const b of w.buildings) m.set(b.id, b);
  return m;
}

/** 키 → 건물 목록 (w.buildings 순서) */
function groupBuildings(w: World, keyOf: (b: Building) => number): Map<number, Building[]> {
  const m = new Map<number, Building[]>();
  for (const b of w.buildings) {
    const k = keyOf(b);
    const list = m.get(k);
    if (list) list.push(b); else m.set(k, [b]);
  }
  return m;
}

/**
 * 지역별 pop 목록 (w.pops 순서). getPop 은 새 pop 을 w.pops 끝에 붙이므로, catchUp() 이 그 뒤에 생긴 pop 을 지역 목록 끝에 더하면
 * 늘 popsIn(w, 지역) 과 같은 목록·순서가 된다 (pop 의 지역은 바뀌지 않는다)
 */
class RegionPops {
  private lists = new Map<number, Pop[]>();
  private seen = 0;
  constructor(private w: World) { this.catchUp(); }
  catchUp() {
    const pops = this.w.pops;
    for (; this.seen < pops.length; this.seen++) {
      const p = pops[this.seen];
      const list = this.lists.get(p.regionId);
      if (list) list.push(p); else this.lists.set(p.regionId, [p]);
    }
  }
  /** 그 지역 목록 (없으면 빈 목록을 만들어 둔다: 나중에 생기는 pop 도 같은 배열에 붙는다) */
  of(regionId: number): Pop[] {
    let list = this.lists.get(regionId);
    if (!list) this.lists.set(regionId, (list = []));
    return list;
  }
}

/** 가동 중인 건물의 방식 (slots 가 0 이 아닌 건물). 아니면 null */
function methodOf(b: Building): MethodDef | null {
  return !b.active || disbanded(b) ? null : getMethod(b.typeId, b.methodId);
}

/** slots(b, s) 와 같은 값 (m = methodOf(b)) */
function slotsWith(b: Building, m: MethodDef | null, s: Skill): number {
  return m ? (m.workers[s] ?? 0) * b.level * b.utilization : 0;
}

// ----------------------------------------------------------------

/** 소작농 1인당 하루 소득 가치 (판매 대금에서 지대·토지세를 뺀 것 + 그날 쓴 현물, 기상 조건 포함, tenantIncomePerWorker). 노동자 일자리와 비교하는 기준 */
export function subsistenceWage(w: World, r: Region): number {
  const b = w.buildings.find((x) => x.regionId === r.id && isSubsistence(x.typeId));
  const pop = b ? findPop(w, r.id, 'peasant', b.id) : undefined;
  return tenantIncomePerWorker(w, r, pop ? wealthOf(pop) : WEALTH_MIN);
}

/** 지역 건물의 자리 (건물 순서, 건물 안에서는 SKILLS 순서). 소작지 임금은 지역마다 한 번만 센다 (그 사이 바뀌는 것이 없다) */
function seatsIn(w: World, r: Region, local: Building[], comp: Map<number, Company>): Seat[] {
  const out: Seat[] = [];
  let sub = 0, subDone = false;
  for (const b of local) {
    if (isSubsistence(b.typeId)) {
      if (!subDone) { sub = subsistenceWage(w, r); subDone = true; }
      out.push({ b, prof: 'peasant', slots: peasantSlots(b), wage: sub, m: null });
      continue;
    }
    const m = methodOf(b);
    if (!m) continue;
    const c = comp.get(b.companyId);
    for (const s of SKILLS) {
      const n = slotsWith(b, m, s);
      if (n > 0) out.push({ b, prof: s, slots: n, wage: paysShare(b, s) ? shareWage(b, s) : c?.wages[s] ?? 0, m });
    }
  }
  return out;
}

/** 하루 노동시장: 해고 → 채용 → 건물 고용 합계 갱신 */
export function laborMarket(w: World) {
  const byId = buildingMap(w);
  const comp = companyMap(w);
  const localOf = groupBuildings(w, (b) => b.regionId);
  const regionPops = new RegionPops(w);
  const premium = TUNE.switchPremium, rate = TUNE.switchRate;
  for (const r of w.regions) {
    const seats = seatsIn(w, r, localOf.get(r.id) ?? NO_BUILDINGS, comp);
    const seatOf = new Map<number, Seat>();
    for (const s of seats) seatOf.set(seatKey(s.b.id, s.prof), s);
    regionPops.catchUp();
    const all = regionPops.of(r.id);

    // 1) 해고: 건물이 사라졌거나, 자리가 줄었거나, 임금을 못 받았으면 실업자가 된다 (이 단계에서 새로 생긴 실업 pop 은 돌지 않는다)
    const n0 = all.length;
    const employed = new Map<number, number>();
    for (let i = 0; i < n0; i++) {
      const p = all[i];
      if (p.work === 0) continue;
      const k = seatKey(p.work, p.prof);
      employed.set(k, (employed.get(k) ?? 0) + workforce(p));
    }
    for (let i = 0; i < n0; i++) {
      const p = all[i];
      if (p.work === 0 || p.size <= 0) continue;
      const b = byId.get(p.work);
      const k = seatKey(p.work, p.prof);
      const seat = seatOf.get(k);
      const have = employed.get(k) ?? 0;
      let fire = 0;
      if (!b || !seat) fire = 1;
      else if (have > seat.slots + 1e-6) fire = 1 - seat.slots / have;
      if (b?.unpaid && p.prof !== 'peasant') fire = Math.max(fire, UNPAID_QUIT);
      if (fire > 0) movePeople(w, p, getPop(w, r.id, p.prof, 0), workforce(p) * fire);
    }

    // 2) 채용: 임금이 높은 자리부터. 각 pop 의 지금 자리(from)는 pop 의 일터·직종이 바뀌지 않으므로 한 번만 찾는다
    const from: (Seat | undefined)[] = [];
    seats.sort((a, b) => b.wage - a.wage || a.b.id - b.b.id);
    for (const seat of seats) {
      const { b, prof } = seat;
      const cap = prof === 'peasant' ? seat.slots : fillableWith(b, seat.m, prof as Skill, seat.slots);
      const cur = findPop(w, r.id, prof, b.id);
      let room = Math.min(cap - (cur ? workforce(cur) : 0), Math.max(3, seat.slots * HIRE_RATE));
      if (room <= 0.01) continue;
      // dest 는 이 자리의 pop 이다 (findPop(w, r.id, prof, b.id) 도 늘 dest)
      const dest = getPop(w, r.id, prof, b.id);
      regionPops.catchUp();
      const n = all.length;
      for (let i = from.length; i < n; i++) from.push(seatOf.get(seatKey(all[i].work, all[i].prof)));
      const wage = seat.wage;
      // 지금보다 소득이나 생활수준이 TUNE.switchPremium 배 넘게 나은 자리로 옮긴다 (같은 직종, 아래 직종도 마찬가지)
      const better = (i: number, p: Pop) => {
        const f = from[i];
        if (!f) return false;
        if (f.wage * premium < wage) return true;
        return dest.size > 0 && dest.sol > p.sol * premium;
      };
      // 같은 직종 실업자
      for (let i = 0; i < n; i++) {
        if (room <= 0.01) break;
        const p = all[i];
        if (p.prof === prof && p.work === 0 && p !== dest) room -= movePeople(w, p, dest, Math.min(workforce(p), room));
      }
      // 같은 직종, 다른 일터
      for (let i = 0; i < n; i++) {
        if (room <= 0.01) break;
        const p = all[i];
        if (p.prof !== prof || p.work === 0 || p === dest) continue;
        if (better(i, p)) room -= movePeople(w, p, dest, Math.min(workforce(p) * rate, room));
      }
      // 다른 직종: 노동자와 소작농 자리는 누구나, 그 위 직종은 자격자만
      const open = prof === 'unskilled' || prof === 'peasant';
      const qualified = open ? undefined : prof;
      for (let i = 0; i < n; i++) {
        if (room <= 0.01) break;
        const p = all[i];
        if (p.prof === prof || p === dest || p.size <= 0) continue;
        if (p.prof === 'capitalist' || p.prof === 'aristocrat') { if (open) continue; }
        const q = open ? workforce(p) : (p.quals[prof] ?? 0);
        if (q <= 1e-6) continue;
        if (p.work === 0) { room -= movePeople(w, p, dest, Math.min(q, room), qualified); continue; }
        if (better(i, p)) room -= movePeople(w, p, dest, Math.min(q * rate, room), qualified);
      }
    }
  }
  syncEmployment(w);
}

/** 건물이 실제로 채울 수 있는 그 직종 자리: 노동자는 직종 비율 상한(ratioGate)까지만 뽑는다 (채용과 이주 매력도가 같이 쓴다). n = slots(b, s) */
function fillableWith(b: Building, m: MethodDef | null, s: Skill, n: number): number {
  return s === 'unskilled' ? n * ratioGate(b, m) : n;
}

/** 노동자 충원 상한 비율: 다른 직종(기술자·전문가) 중 가장 덜 찬 쪽 / 0.9 */
function ratioGate(b: Building, m: MethodDef | null): number {
  let gate = 1;
  const skilled = slotsWith(b, m, 'skilled');
  if (skilled > 0) gate = Math.min(gate, b.employed.skilled / skilled / RATIO_GATE);
  const expert = slotsWith(b, m, 'expert');
  if (expert > 0) gate = Math.min(gate, b.employed.expert / expert / RATIO_GATE);
  return clamp(gate, 0, 1);
}

/** pop 으로부터 건물의 고용·소유주·소작농 합계를 다시 센다 */
export function syncEmployment(w: World) {
  const byId = buildingMap(w);
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

/** staffing(b) 와 같은 값 (방식을 한 번만 찾는다) */
function staffingOf(b: Building): number {
  const m = methodOf(b);
  let need = 0, have = 0;
  for (const s of SKILLS) {
    const n = slotsWith(b, m, s);
    need += n * SKILL_DEFS[s].baseWage;
    have += Math.min(n, b.employed[s]) * SKILL_DEFS[s].baseWage;
  }
  return need > 0 ? have / need : 0;
}

/**
 * 임금 지급: 회사가 자기 건물에서 일하는 pop 에게 임금을 준다. 모자라면 자동 대출, 그래도 모자라면 비례로 덜 준다.
 * 소유 건물(저택·금융가)의 귀족·자본가는 배당과 지대를, 소작지의 소작농은 수확을 받으므로 임금이 없다.
 */
export function payWages(w: World) {
  const byId = buildingMap(w);
  const workersOf = new Map<number, Pop[]>();
  for (const p of w.pops) {
    if (p.work === 0 || p.prof === 'peasant') continue;
    const b = byId.get(p.work);
    if (!b || BUILDING_BY_ID[b.typeId].auto || paysDividend(b.stateOwned, p.prof as Skill)) continue;
    const list = workersOf.get(p.work);
    if (list) list.push(p); else workersOf.set(p.work, [p]);
  }
  const mineOf = groupBuildings(w, (b) => b.companyId);
  for (const c of w.companies) {
    const mine = mineOf.get(c.id) ?? NO_BUILDINGS;
    const wages = c.wages;
    let bill = 0;
    for (const b of mine) {
      const list = workersOf.get(b.id);
      if (list) for (const p of list) bill += workforce(p) * wages[p.prof as Skill];
    }
    if (c.cash < bill) borrow(w, c, bill - c.cash);
    const ratio = bill > 0 ? clamp(c.cash / bill, 0, 1) : 1;
    for (const b of mine) {
      let paid = 0;
      const list = workersOf.get(b.id);
      if (list) for (const p of list) {
        const amt = workforce(p) * wages[p.prof as Skill] * ratio;
        p.savings += amt;
        p.lastIncome += amt;
        paid += amt;
      }
      c.cash -= paid;
      b.unpaid = ratio < 0.999;
      const staffing = isSubsistence(b.typeId) ? (b.tenants ?? 0) / Math.max(1, peasantSlots(b)) : staffingOf(b);
      const last = emptyStats();
      last.wageCost = paid;
      last.staffing = staffing;
      b.last = last;
    }
  }
}

// ---------------------------------------------------------------- 이주

/** 이주가 시작되는 매력도 배율과 최대가 되는 배율, 하루 최대 이주 비율 */
const MIGRATE_START = 1.3;
const MIGRATE_FULL = 2;
const MIGRATE_MAX = 0.001;

/**
 * 이주: 이웃 지역 매력도가 여기보다 30% 넘게 높으면 조금씩 옮겨 간다 (모든 계급).
 * 실업 pop 은 이 지역 매력도와, 일하는 pop 은 지금 소득 × 식량 충족과 비교하고 TUNE.employedMigrate 배 속도로 옮긴다
 *
 * 이주 중에는 건물(고용·자리·임금)과 가격·지대가 바뀌지 않으므로 소작지 임금은 지역마다 한 번만 센다.
 * pop 은 바뀌므로 매력도는 처음 필요할 때 그때의 pop 으로 센다
 */
export function migrate(w: World) {
  const regions = new Map<number, Region>();
  for (const r of w.regions) if (!regions.has(r.id)) regions.set(r.id, r);
  const region = (id: number): Region => {
    const r = regions.get(id);
    if (!r) throw new Error(`unknown region ${id}`);
    return r;
  };
  const comp = companyMap(w);
  const byId = buildingMap(w);
  const localOf = groupBuildings(w, (b) => b.regionId);
  const regionPops = new RegionPops(w);
  const subWage = new Map<number, number>();
  const subsistence = (r: Region): number => {
    let v = subWage.get(r.id);
    if (v === undefined) { v = subsistenceWage(w, r); subWage.set(r.id, v); }
    return v;
  };

  /**
   * 지역 매력도: 그 직종 실업자 한 사람이 이 지역에서 기대할 수 있는 하루 소득 × 식량 충족률.
   * 빈자리를 임금이 높은 순으로 그 지역 실업자(하층은 소작농 + 노동자, 그 밖은 같은 직종)에게 나눠 준 1인당 소득이다.
   * 실업자가 빈자리보다 많으면 자리를 못 얻는 사람은 0으로 센다. 실업자가 없으면 가장 좋은 빈자리 임금이다.
   * 빈자리: 하층은 노동자 자리와 소작지 여유, 그 밖은 그 직종 자리. 실제로 뽑을 수 있는 자리만 센다 (fillable, 채용과 같은 규칙).
   */
  const attraction = (r: Region, prof: PopClass): number => {
    const lower = prof === 'peasant' || prof === 'unskilled';
    const s: Skill = lower ? 'unskilled' : (prof as Skill);
    const open: { wage: number; n: number }[] = [];
    for (const b of localOf.get(r.id) ?? NO_BUILDINGS) {
      if (isSubsistence(b.typeId)) {
        const n = lower ? peasantSlots(b) - (b.tenants ?? 0) : 0;
        if (n > 0) open.push({ wage: subsistence(r), n });
        continue;
      }
      const m = methodOf(b);
      const jobs = slotsWith(b, m, s);
      const n = fillableWith(b, m, s, jobs) - b.employed[s];
      if (n > 0) open.push({ wage: paysShare(b, s) ? shareWage(b, s) : comp.get(b.companyId)?.wages[s] ?? 0, n });
    }
    regionPops.catchUp();
    let food = 0, size = 0, seekers = 0;
    for (const p of regionPops.of(r.id)) {
      food += p.food * p.size; size += p.size;
      if (p.work === 0 && (lower ? p.prof === 'peasant' || p.prof === 'unskilled' : p.prof === prof)) seekers += workforce(p);
    }
    open.sort((a, b) => b.wage - a.wage);
    const want = Math.max(1, seekers);
    let left = want, income = 0;
    for (const o of open) {
      if (left <= 0) break;
      const t = Math.min(left, o.n);
      income += t * o.wage;
      left -= t;
    }
    return (income / want) * (size > 0 ? food / size : 1);
  };

  const cache = new Map<number, number>();
  const attr = (r: Region, prof: PopClass) => {
    // 소작농과 노동자는 같은 빈자리를 두고 다투므로 매력도가 같다
    const k = r.id * POP_CLASSES.length + PROF_INDEX[prof === 'peasant' ? 'unskilled' : prof];
    let v = cache.get(k);
    if (v === undefined) { v = attraction(r, prof); cache.set(k, v); }
    return v;
  };

  /** 일하는 pop 이 지금 자리에서 받는 1인당 하루 소득 (소작지는 수확 가치, 소유 자리는 배당 추정) */
  const seatWage = (r: Region, p: Pop, b: Building | undefined): number => {
    if (!b) return 0;
    if (isSubsistence(b.typeId)) return subsistence(r);
    const s = p.prof as Skill;
    return paysShare(b, s) ? shareWage(b, s) : comp.get(b.companyId)?.wages[s] ?? 0;
  };

  const foodOf = new Map<number, number>();
  const people = new Map<number, number>();
  for (const p of w.pops) { foodOf.set(p.regionId, (foodOf.get(p.regionId) ?? 0) + p.food * p.size); people.set(p.regionId, (people.get(p.regionId) ?? 0) + p.size); }
  const movers = w.pops.filter((p) => p.size > 0 && (p.work === 0 || CLASS_DEFS[p.prof].stratum !== 'upper'));
  for (const p of movers) {
    const r = region(p.regionId);
    const wf = workforce(p);
    const food = (foodOf.get(r.id) ?? 0) / Math.max(1, people.get(r.id) ?? 0);
    const here = p.work === 0 ? attr(r, p.prof) : seatWage(r, p, byId.get(p.work)) * food;
    let best: Region | null = null, bestA = 0;
    for (const nb of r.neighbors) {
      const a = attr(region(nb), p.prof);
      if (a > bestA) { best = region(nb); bestA = a; }
    }
    if (!best || bestA <= 0) continue;
    const ratio = here > 1e-9 ? bestA / here : MIGRATE_FULL;
    const share = MIGRATE_MAX * clamp((ratio - MIGRATE_START) / (MIGRATE_FULL - MIGRATE_START), 0, 1) * (p.work === 0 ? 1 : TUNE.employedMigrate);
    if (share <= 0) continue;
    movePeople(w, p, getPop(w, best.id, p.prof, 0), wf * share);
  }
}
