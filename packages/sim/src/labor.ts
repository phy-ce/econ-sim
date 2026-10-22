import { BUILDING_BY_ID, CLASS_DEFS, SKILL_DEFS, TUNE, getMethod } from './data';
import { borrow, disbanded, emptyJobs, emptyStats, isSubsistence, paysDividend, paysShare, peasantSlots, shareWage } from './economy';
import { tenantIncomePerWorker } from './market';
import { findPop, getPop, movePeople, workforce } from './pops';
import { clamp } from './rng';
import { LOWER_JOBS, POP_CLASSES, SKILLS, WEALTH_MIN, isLowerJob, wealthOf } from './types';
import type { Building, Company, MethodDef, Pop, PopClass, Region, Skill, World } from './types';

// 노동시장: 사람은 자격이 되는 자리 중 1인당 소득이 가장 높은 곳으로 옮긴다 (조금 나은 정도로는 안 옮긴다).
// 소득은 임금 자리는 회사 임금, 소유 자리(저택·금융가)는 한 사람이 받는 배당 추정, 소작지는 소작 소득이다.

/** 하루 채용 상한: 자리의 이 비율 (최소 3명) */
export const HIRE_RATE = 0.01;
/** 임금을 다 못 받으면 하루에 떠나는 비율 */
export const UNPAID_QUIT = 0.03;

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
  if (!m) return 0;
  if (s === 'aristocrat' && b.nobleSeats !== undefined) return b.nobleSeats;
  return (m.workers[s] ?? 0) * b.level * b.utilization;
}

// ----------------------------------------------------------------

/** 소작농 1인당 하루 소득 가치 (판매 대금에서 지대·토지세를 뺀 것 + 그날 쓴 현물, 기상 조건 포함, tenantIncomePerWorker). 노동자 일자리와 비교하는 기준 */
export function subsistenceWage(w: World, r: Region): number {
  const b = w.buildings.find((x) => x.regionId === r.id && isSubsistence(x.typeId));
  const pop = b ? findPop(w, r.id, 'peasant', b.id) : undefined;
  return tenantIncomePerWorker(w, r, pop ? wealthOf(pop) : WEALTH_MIN);
}

/**
 * 소유 건물(저택·금융가)에서 직종 s 한 사람이 받는 하루 배당·지대 추정: 받은 배당의 이동평균 × 1명 몫 ÷ 앉은 사람의 몫 합
 * (붐비는 자리일수록 낮다. 저택은 귀족 1몫·하급 귀족 TUNE.gentryShare 몫, economy.ts shareWage)
 */
export function dividendWage(b: Building, s: Skill): number {
  return shareWage(b, s);
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
      if (n > 0) out.push({ b, prof: s, slots: n, wage: paysShare(b, s) ? dividendWage(b, s) : c?.wages[s] ?? 0, m });
    }
  }
  return out;
}

/** 노동자·농부·소작농 자리는 귀족·자본가 말고 누구나 들어갈 수 있다 */
const OPEN: PopClass[] = ['unskilled', 'farmer', 'peasant'];
const isOwnerClass = (c: PopClass) => c === 'capitalist' || c === 'aristocrat';

/**
 * 일하는 사람이 지금 소득 cur 에서 소득 v 인 자리로 하루에 옮기는 비율: 소득이 switchPremium 배 넘게 나을 때만 옮기고,
 * switchPremium 배에서 switchRate, 배율 차이에 비례해 늘어 switchMax 에서 멈춘다 (지금 소득이 0 이면 switchMax)
 */
export function switchShare(cur: number, v: number): number {
  const premium = TUNE.switchPremium;
  if (!(v > cur * premium)) return 0;
  if (!(cur > 0)) return TUNE.switchMax;
  return Math.min(TUNE.switchMax, TUNE.switchRate * (v / cur - 1) / (premium - 1));
}

/** 후보 한 줄: pop 순번, 실업 여부, 지금 소득, 같은 직종이면 0, 남은 하루 몫 (처음 뽑힐 때 정한다, -1 = 아직), 몫의 바탕(노동 인구 또는 자격자) */
interface Cand { i: number; emp: boolean; cur: number; own: number; left: number; base: number }

/**
 * 하루 노동시장: 해고 → 채용 → 건물 고용 합계 갱신.
 * 채용 (지역마다): 자리를 1인당 소득이 높은 순으로 한 번 정렬하고, 직종마다 후보(그 직종 pop, 자격자, 노동자·소작농 자리는 귀족·자본가 말고 모두)를
 * 실업자 먼저, 그다음 지금 소득이 낮은 순으로 한 번 정렬해 둔다. 좋은 자리부터 그 직종 후보 목록 앞에서 빈자리만큼 데려간다.
 * 일하는 사람은 지금 소득 × switchPremium 보다 나은 자리만 가고, 하루에 switchShare 만큼만 옮긴다. 다 옮긴 후보는 목록 머리가 넘어가므로
 * 지역마다 O(자리 log 자리 + pop × 직종 × log pop) 이다.
 */
export function laborMarket(w: World) {
  const byId = buildingMap(w);
  const comp = companyMap(w);
  const localOf = groupBuildings(w, (b) => b.regionId);
  const regionPops = new RegionPops(w);
  const premium = TUNE.switchPremium;
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

    // 2) 채용. 후보는 지금 있는 pop 만 (채용으로 새로 생기는 pop 은 그 자리보다 나은 자리가 남아 있지 않으므로 오늘 다시 옮기지 않는다)
    regionPops.catchUp();
    const n = all.length;
    seats.sort((a, b) => b.wage - a.wage || a.b.id - b.b.id);
    const lists = new Map<PopClass, Cand[]>();
    const heads = new Map<PopClass, number>();
    let curOf: Float64Array | null = null;
    /** 직종 t 의 후보 목록 (처음 필요할 때 만든다) */
    const listOf = (t: PopClass): Cand[] => {
      let list = lists.get(t);
      if (list) return list;
      if (!curOf) {
        curOf = new Float64Array(n);
        for (let i = 0; i < n; i++) { const p = all[i]; curOf[i] = p.work === 0 ? 0 : seatOf.get(seatKey(p.work, p.prof))?.wage ?? 0; }
      }
      list = [];
      const open = OPEN.includes(t);
      for (let i = 0; i < n; i++) {
        const p = all[i];
        if (p.size <= 0) continue;
        let base: number;
        if (p.prof === t) base = workforce(p);
        else if (open) { if (isOwnerClass(p.prof)) continue; base = workforce(p); }
        else base = p.quals[t] ?? 0;
        if (base <= 1e-6) continue;
        list.push({ i, emp: p.work !== 0, cur: curOf[i], own: p.prof === t ? 0 : 1, left: -1, base });
      }
      list.sort((a, b) => (+a.emp - +b.emp) || a.cur - b.cur || a.own - b.own || a.i - b.i);
      lists.set(t, list);
      heads.set(t, 0);
      return list;
    };
    for (const seat of seats) {
      const { b, prof } = seat;
      const cap = prof === 'peasant' ? seat.slots : fillableWith(b, seat.m, prof as Skill, seat.slots);
      const cur = findPop(w, r.id, prof, b.id);
      let room = Math.min(cap - (cur ? workforce(cur) : 0), Math.max(3, seat.slots * HIRE_RATE));
      if (room <= 0.01) continue;
      const list = listOf(prof);
      let h = heads.get(prof)!;
      if (h >= list.length) continue;
      const wage = seat.wage;
      // dest 는 이 자리의 pop 이다 (findPop(w, r.id, prof, b.id) 도 늘 dest)
      const dest = getPop(w, r.id, prof, b.id);
      const qualified = OPEN.includes(prof) ? undefined : prof;
      for (let j = h; j < list.length && room > 0.01; j++) {
        const c = list[j];
        // 일하는 후보는 지금 소득이 낮은 순이므로, 이 자리가 충분히 낫지 않은 첫 후보에서 멈춘다
        if (c.emp && !(wage > c.cur * premium)) break;
        const p = all[c.i];
        if (p === dest) continue;
        // 하루 몫은 처음 뽑힐 때 (가장 좋은 자리에서) 정한다: 실업자는 전부, 일하는 사람은 switchShare
        if (c.left < 0) c.left = c.emp ? c.base * switchShare(c.cur, wage) : c.base;
        const want = Math.min(c.left, room);
        if (want <= 1e-9) continue;
        const moved = movePeople(w, p, dest, want, c.own ? qualified : undefined);
        room -= moved;
        c.left = moved < want - 1e-9 ? 0 : c.left - moved;
      }
      while (h < list.length && list[h].left >= 0 && list[h].left <= 1e-9) h++;
      heads.set(prof, h);
    }
  }
  syncEmployment(w);
}

/** 건물이 실제로 채울 수 있는 그 직종 자리: 노동자·농부는 직종 비율 상한(ratioGate)까지만 뽑는다 (채용과 이주 매력도가 같이 쓴다). n = slots(b, s) */
function fillableWith(b: Building, m: MethodDef | null, s: Skill, n: number): number {
  return isLowerJob(s) ? n * ratioGate(b, m) : n;
}

/** 노동자·농부 충원 상한 비율: 다른 직종(기술자·전문가) 중 가장 덜 찬 쪽 / TUNE.ratioGate (0 = 끔) */
function ratioGate(b: Building, m: MethodDef | null): number {
  const g = TUNE.ratioGate;
  if (!(g > 0)) return 1;
  let gate = 1;
  const skilled = slotsWith(b, m, 'skilled');
  if (skilled > 0) gate = Math.min(gate, b.employed.skilled / skilled / g);
  const expert = slotsWith(b, m, 'expert');
  if (expert > 0) gate = Math.min(gate, b.employed.expert / expert / g);
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
 * 임금 지급: 회사가 자기 건물에서 일하는 pop 에게 임금을 준다. 모자라면 왕실은 국채로 빌리고, 그래도 모자라면(민간은 바로) 비례로 덜 준다.
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
    // 왕실만 빌린다. 민간은 가진 현금만큼 비례로 준다
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
export const MIGRATE_START = 1.3;
export const MIGRATE_FULL = 2;
export const MIGRATE_MAX = 0.001;

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
   * 빈자리: 하층은 노동자·농부 자리와 소작지 여유, 그 밖은 그 직종 자리. 실제로 뽑을 수 있는 자리만 센다 (fillable, 채용과 같은 규칙).
   */
  const attraction = (r: Region, prof: PopClass): number => {
    const lower = prof === 'peasant' || isLowerJob(prof);
    const kinds: Skill[] = lower ? LOWER_JOBS : [prof as Skill];
    const open: { wage: number; n: number }[] = [];
    for (const b of localOf.get(r.id) ?? NO_BUILDINGS) {
      if (isSubsistence(b.typeId)) {
        const n = lower ? peasantSlots(b) - (b.tenants ?? 0) : 0;
        if (n > 0) open.push({ wage: subsistence(r), n });
        continue;
      }
      const m = methodOf(b);
      for (const s of kinds) {
        const jobs = slotsWith(b, m, s);
        const n = fillableWith(b, m, s, jobs) - b.employed[s];
        if (n > 0) open.push({ wage: paysShare(b, s) ? dividendWage(b, s) : comp.get(b.companyId)?.wages[s] ?? 0, n });
      }
    }
    regionPops.catchUp();
    let food = 0, size = 0, seekers = 0;
    for (const p of regionPops.of(r.id)) {
      food += p.food * p.size; size += p.size;
      if (p.work === 0 && (lower ? p.prof === 'peasant' || isLowerJob(p.prof) : p.prof === prof)) seekers += workforce(p);
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
    // 소작농·노동자·농부는 같은 빈자리를 두고 다투므로 매력도가 같다
    const k = r.id * POP_CLASSES.length + PROF_INDEX[prof === 'peasant' || isLowerJob(prof) ? 'unskilled' : prof];
    let v = cache.get(k);
    if (v === undefined) { v = attraction(r, prof); cache.set(k, v); }
    return v;
  };

  /** 일하는 pop 이 지금 자리에서 받는 1인당 하루 소득 (소작지는 수확 가치, 소유 자리는 배당 추정) */
  const seatWage = (r: Region, p: Pop, b: Building | undefined): number => {
    if (!b) return 0;
    if (isSubsistence(b.typeId)) return subsistence(r);
    const s = p.prof as Skill;
    return paysShare(b, s) ? dividendWage(b, s) : comp.get(b.companyId)?.wages[s] ?? 0;
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
