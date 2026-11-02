// 마이크로 세계 관측 (읽기만 한다): 하루치 상태를 한 줄(객체)로. pop 하나하나, 건물 하나하나, 지역 시장의 상품마다, 지역·직종별 노동시장, 회사, 화폐.
// pop 은 (지역, 직종, 일터) 의 사람 묶음이다 (sim 의 단위). 인구 400명 세계에서 묶음은 수십 개라 전부 남긴다.
import { BUILDING_BY_ID, GOOD_IDS, GOODS } from '../data';
import { moneyIdentity, paysShare, slots, totalMoney, wagesAt } from '../economy';
import { dividendWage, labourTable, subsistenceWage } from '../labor';
import { workforce } from '../pops';
import type { Building, GoodId, PopClass, Skill, World } from '../types';
import { SKILLS, isLowerJob } from '../types';

export interface PopRow {
  id: number; r: number; prof: PopClass; work: number; workType: string | null;
  size: number; wf: number;
  /** 지금 자리의 1인(노동 인구) 하루 소득: 임금 자리는 회사 임금, 소작지는 소작 소득, 저택·금융가는 1인 몫 추정. 실업 0 */
  wage: number;
  /** 그날 받은 돈 (pop 전체), 원천별, 소득 이동평균, 그날 쓴 돈 */
  inc: number; src: Record<string, number>; incEma: number; spend: number;
  /** 그날 소작으로 직접 먹은 현물의 시장가 (pop 전체). 소작농 소득 = 현금 소득 + 이것 */
  kind: number;
  savings: number; wealth: number; sol: number; fulfil: number; food: number;
  quals: Record<string, number>;
}
export interface BldRow {
  id: number; r: number; type: string; method: string; co: number; state: boolean; lvl: number; util: number; active: boolean;
  slots: Partial<Record<Skill, number>>; emp: Partial<Record<Skill, number>>; wage: Partial<Record<Skill, number>>;
  vac: number; staffing: number; fill: number;
  out: Partial<Record<GoodId, number>>;
  /** 판 양 추정: 산출 × 그 지역 시장의 그날 체결률(팔린 양 ÷ 공급) */
  soldQ: Partial<Record<GoodId, number>>;
  rev: number; inCost: number; wageCost: number; profit: number; profitEma: number; cash?: number; reserve?: number;
}
export interface MktRow { r: number; g: GoodId; p: number; base: number; S: number; D: number; Sema: number; Dema: number; sold: number; inv: number }
export interface LaborRow {
  r: number; s: Skill;
  /** 일자리(가동 중 자리), 고용, 빈자리 (노동 인구) */
  jobs: number; emp: number; vac: number;
  /** 그 직종 실업 노동 인구 (노동자·농부는 실업 소작농 포함) */
  unemp: number;
  /** 소작지에서 일하는 소작농 노동 인구 (노동자·농부 자리의 잠재 구직자) */
  tenants: number;
  /** 그 직종 자격자 (기술자·전문가: quals 합 + 그 직종 pop) */
  qual: number;
  /** 고용 가중 평균 임금, 소작 1인 하루 소득 (노동자·농부 임금 바닥의 기준) */
  wage: number; tenantInc: number;
  /**
   * 지역 시장 임금 (Region.wages, 없으면 고용 가중 평균 임금, 고용이 없으면 민간 상회 임금표)과
   * 그 임금에서의 노동시장 표 (labor.ts labourTable): 자리 D (손해 보는 건물의 빈자리 제외), 오려는 사람 S
   */
  market: number; D: number; S: number;
}
/** weekProfit 는 이번 주 누계(주 끝 표본에서는 막 0 이 됐다), lastWeekProfit 는 지난주 손익 (AI 임금 판단이 본 값) */
export interface CoRow { id: number; state: boolean; cash: number; debt: number; weekProfit: number; lastWeekProfit: number; wages: Record<Skill, number> }
export interface MicroRow {
  t: number;
  money: { total: number; identity: number };
  pops: PopRow[]; blds: BldRow[]; mkts: MktRow[]; labor: LaborRow[]; cos: CoRow[];
  constructions: { co: number; type: string; r: number; levels: number; done: number }[];
}

const pick = <T extends string>(keys: readonly T[], f: (k: T) => number): Partial<Record<T, number>> => {
  const o: Partial<Record<T, number>> = {};
  for (const k of keys) { const v = f(k); if (v) o[k] = v; }
  return o;
};

/** 세계를 바꾸지 않고 하루치 관측 줄을 만든다 */
export function microTrace(w: World): MicroRow {
  const byId = new Map<number, Building>(w.buildings.map((b) => [b.id, b]));
  const coById = new Map(w.companies.map((c) => [c.id, c]));
  const tenantInc = new Map(w.regions.map((r) => [r.id, subsistenceWage(w, r)]));
  const seatWage = (b: Building, s: PopClass): number => {
    if (b.typeId === 'subsistence') return tenantInc.get(b.regionId) ?? 0;
    if (paysShare(b, s as Skill)) return dividendWage(b, s as Skill);
    const c = coById.get(b.companyId);
    return c ? wagesAt(c, b.typeId, w, b.regionId)[s as Skill] ?? 0 : 0;
  };
  const pops: PopRow[] = w.pops.filter((p) => p.size > 0).map((p) => {
    const b = p.work ? byId.get(p.work) : undefined;
    const mk = w.regions.find((r) => r.id === p.regionId)!.market;
    let kind = 0;
    for (const g in p.inKind) kind += (p.inKind[g as GoodId] ?? 0) * mk[g as GoodId].price;
    return {
      id: p.id, r: p.regionId, prof: p.prof, work: p.work, workType: b?.typeId ?? null, size: p.size, wf: workforce(p),
      wage: b ? seatWage(b, p.prof) : 0,
      inc: p.lastIncome, src: { ...(p.incomeBreakdown ?? {}) } as Record<string, number>, incEma: p.incomeEma, spend: p.lastSpend, kind,
      savings: p.savings, wealth: p.wealth, sol: p.sol, fulfil: p.fulfillment, food: p.food, quals: { ...p.quals } as Record<string, number>,
    };
  });
  const blds: BldRow[] = w.buildings.map((b) => {
    const c = coById.get(b.companyId);
    const sl = pick(SKILLS, (s) => slots(b, s));
    const emp = pick(SKILLS, (s) => b.employed[s]);
    const wage = c && !BUILDING_BY_ID[b.typeId].auto ? pick(SKILLS, (s) => (sl[s] ? wagesAt(c, b.typeId, w, b.regionId)[s] : 0)) : {};
    const out = { ...b.last.output } as Partial<Record<GoodId, number>>;
    const mk = w.regions.find((r) => r.id === b.regionId)!.market;
    const soldQ = pick(Object.keys(out) as GoodId[], (g) => (out[g] ?? 0) * (mk[g].supply > 0 ? Math.min(1, mk[g].sold / mk[g].supply) : 0));
    let vac = 0;
    for (const s of SKILLS) vac += Math.max(0, (sl[s] ?? 0) - (emp[s] ?? 0));
    return {
      id: b.id, r: b.regionId, type: b.typeId, method: b.methodId, co: b.companyId, state: !!b.stateOwned, lvl: b.level, util: b.utilization, active: b.active,
      slots: sl, emp, wage, vac, staffing: b.last.staffing, fill: b.last.inputFill, out, soldQ,
      rev: b.last.revenue, inCost: b.last.inputCost, wageCost: b.last.wageCost, profit: b.last.revenue - b.last.inputCost - b.last.wageCost, profitEma: b.profitEma,
      ...(b.cash !== undefined ? { cash: b.cash } : {}), ...(b.reserve !== undefined ? { reserve: b.reserve } : {}),
    };
  });
  const mkts: MktRow[] = [];
  for (const r of w.regions) for (const g of GOOD_IDS) {
    const m = r.market[g];
    if (!(m.supply > 0 || m.demand > 0 || m.supplyEma > 1e-6 || m.demandEma > 1e-6)) continue;
    mkts.push({ r: r.id, g, p: m.price, base: GOODS[g].basePrice, S: m.supply, D: m.demand, Sema: m.supplyEma, Dema: m.demandEma, sold: m.sold, inv: m.inventory });
  }
  const labor: LaborRow[] = [];
  const firm = w.companies.find((c) => !c.state);
  for (const r of w.regions) {
    const local = w.buildings.filter((b) => b.regionId === r.id && !BUILDING_BY_ID[b.typeId].auto);
    const rp = w.pops.filter((p) => p.regionId === r.id && p.size > 0);
    const seatAvg = (s: Skill) => {
      let e = 0, paid = 0;
      for (const b of local) { const c = coById.get(b.companyId); if (c && b.employed[s] > 0) { e += b.employed[s]; paid += b.employed[s] * wagesAt(c, b.typeId, w, r.id)[s]; } }
      return e > 0 ? paid / e : firm?.wages[s] ?? 0;
    };
    const marketOf = (s: Skill) => r.wages?.[s] ?? seatAvg(s);
    const tab = labourTable(w, r, w.buildings.filter((b) => b.regionId === r.id), rp, coById, tenantInc.get(r.id) ?? 0, marketOf);
    const tenants = rp.filter((p) => p.prof === 'peasant' && p.work && byId.get(p.work)?.typeId === 'subsistence').reduce((a, p) => a + workforce(p), 0);
    for (const s of SKILLS) {
      let jobs = 0, emp = 0, paid = 0;
      for (const b of local) {
        const n = slots(b, s);
        if (n <= 0) continue;
        jobs += n; emp += b.employed[s];
        const c = coById.get(b.companyId);
        if (c) paid += b.employed[s] * wagesAt(c, b.typeId, w, r.id)[s];
      }
      if (jobs <= 0 && s !== 'unskilled' && s !== 'farmer') continue;
      const unemp = rp.filter((p) => p.work === 0 && (p.prof === s || (isLowerJob(s) && p.prof === 'peasant'))).reduce((a, p) => a + workforce(p), 0);
      const qual = rp.reduce((a, p) => a + (p.prof === s ? workforce(p) : (p.quals[s] ?? 0)), 0);
      labor.push({ r: r.id, s, jobs, emp, vac: Math.max(0, jobs - emp), unemp, tenants: isLowerJob(s) ? tenants : 0, qual, wage: emp > 0 ? paid / emp : 0, tenantInc: tenantInc.get(r.id) ?? 0, market: marketOf(s), D: tab[s].jobs, S: tab[s].willing });
    }
  }
  const cos: CoRow[] = w.companies.map((c) => ({ id: c.id, state: c.state, cash: c.cash, debt: c.debt, weekProfit: c.weekProfit, lastWeekProfit: c.lastWeekProfit, wages: { ...c.wages } }));
  return {
    t: w.tick, money: { total: totalMoney(w), identity: moneyIdentity(w) }, pops, blds, mkts, labor, cos,
    constructions: w.constructions.map((k) => ({ co: k.companyId, type: k.typeId, r: k.regionId, levels: k.levels ?? 1, done: k.required > 0 ? k.points / k.required : 0 })),
  };
}
