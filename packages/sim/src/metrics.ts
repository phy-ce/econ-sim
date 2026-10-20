import { BUILDING_BY_ID, GOOD_IDS, GOODS } from './data';
import { CLASS_DEFS, WORKFORCE_RATIO } from './data';
import { builderOf, companyById, constructionEstimate, harvestCondition, isGovernment, kingdomGdp, slots } from './economy';
import { subsistenceWage } from './labor';
import { basketCostAt } from './market';
import { workforce } from './pops';
import { kingdomOf } from './kingdoms';
import { round2 } from './rng';
import { roundAll } from './round';
import { POP_CLASSES, wealthOf } from './types';
import type { BudgetItem, GoodId, PopClass, World } from './types';

// 주요 지표: 매달(30일) 한 번 왕국별·상품별 숫자를 기록한다. 화면, CLI, 비교 실행이 모두 이 기록을 읽는다.

/** 기록 간격과 보관 개수 (30년) */
export const METRICS_EVERY = 30;
const METRICS_CAP = 360;

export interface KingdomMetrics {
  /** 인구 (부양가족 포함), 직종별 인구 */
  pop: number;
  popBy: Record<PopClass, number>;
  /** 소작농 비율, 실업 pop 비율 */
  peasantShare: number;
  joblessShare: number;
  /** 직종별 인구 가중 평균: 부 단계, 생활수준, 식량 충족, 연 증감률(%) */
  wealthBy: Record<PopClass, number>;
  solBy: Record<PopClass, number>;
  foodBy: Record<PopClass, number>;
  growthBy: Record<PopClass, number>;
  /** 연 GDP, 지난주 국정 수지: 세입, 민간 공사 수수료, 정부 건물 운영비(임금 + 원료), 연구비, 국채 이자 */
  gdp: number;
  revenueWeek: number;
  feesWeek: number;
  govSpendWeek: number;
  research: number;
  interest: number;
  /** 징수율 */
  taxRatio: number;
  /** 정책 단계 (세금·국영 임금·연구비 수준), 임금 지수 */
  policy: Record<BudgetItem, number>;
  wageIndex: number;
  /** 돈: 국고, 국채, 민간 상회 현금, 투자 풀, 가계 저축 */
  treasury: number;
  debt: number;
  privateCash: number;
  pool: number;
  savings: number;
  /** 건설: 사무소 레벨, 하루 포인트, 대기 포인트, 대기 일수, 공사 수 */
  officeLevels: number;
  pointsPerDay: number;
  queuePoints: number;
  backlogDays: number;
  projects: number;
  /** 건물 레벨 합 (소작지·소유 건물 제외): 왕실, 민간, 건물 종류별 */
  levelsState: number;
  levelsPrivate: number;
  levelsBy: Record<string, number>;
  /** 건물 종류별: 일꾼, 일자리, 하루 손익 합(이동평균), 적자 건물 레벨 */
  typeBy: Record<string, TypeMetrics>;
  /** 이번 달 착공 레벨: '건물|s'(왕실) '건물|p'(민간) '건물|loss'(AI 손해 짓기) '건물|d'(철거) */
  starts: Record<string, number>;
  /** 왕실 임금 (노동자, 기술자), 아는 기술 수 */
  wageUnskilled: number;
  wageSkilled: number;
  techs: number;
  /** 노동 시장 (직종별): 임금 판단의 근거 데이터 */
  labor: Record<'unskilled' | 'farmer' | 'skilled' | 'expert', LaborMetrics>;
  /** 소작농 노동 인구 1명의 하루 수확 가치 (시장가, 인구 가중) */
  peasantIncome: number;
  /** 노동 인구 1명이 식구(노동 인구 1 + 부양가족)와 부 5로 사는 하루 생활비 (지역 가격, 인구 가중) */
  livingCost5: number;
  /** 생산 건물(소작지·소유·정부 건물 제외) 합계: 일꾼 1명당 하루 부가가치(매출 − 원료), 부가가치 중 임금 비율 */
  valueAddedPerWorker: number;
  wageShare: number;
}

export interface TypeMetrics {
  employed: number;
  slots: number;
  profit: number;
  lossLevels: number;
}

export interface LaborMetrics {
  /** 고용 가중 평균 임금, 고용 인원, 일자리 수, 그 직종 실업 노동 인구 */
  wage: number;
  employed: number;
  slots: number;
  jobless: number;
}

export interface GoodMetrics {
  /** 지역 평균 가격 / 기본가, 대륙 합계 공급·수요·판매 (하루, 이동평균) */
  ratio: number;
  supply: number;
  demand: number;
  sold: number;
}

export interface MetricPoint {
  tick: number;
  kingdoms: Record<number, KingdomMetrics>;
  goods: Record<GoodId, GoodMetrics>;
  /** 빈부격차: 상층 / 하층 평균 생활수준, 가장 잘사는 지역 / 가장 못사는 지역 평균 생활수준 */
  classGap: number;
  regionGap: number;
  /** 상인 조합 현금 */
  traders: number;
  /** 기상 조건이 걸린 지역 수 (없으면 기록하지 않는다 = 0) */
  harvestRegions?: number;
}

const r0 = (x: number) => Math.round(x);
const byClass = (f: (s: PopClass) => number) => Object.fromEntries(POP_CLASSES.map((s) => [s, f(s)])) as Record<PopClass, number>;

export function recordMetrics(w: World) {
  if (w.tick % METRICS_EVERY !== 0) return;
  const kingdoms: Record<number, KingdomMetrics> = {};
  for (const k of w.kingdoms) {
    const gov = companyById(w, k.governmentId);
    const pops = w.pops.filter((p) => kingdomOf(w, p.regionId) === k.id);
    const n = byClass(() => 0), wealth = byClass(() => 0), sol = byClass(() => 0), food = byClass(() => 0), growth = byClass(() => 0);
    let pop = 0, jobless = 0, savings = 0;
    for (const p of pops) {
      pop += p.size; savings += p.savings; n[p.prof] += p.size;
      if (p.work === 0) jobless += p.size;
      wealth[p.prof] += wealthOf(p) * p.size; sol[p.prof] += p.sol * p.size; food[p.prof] += p.food * p.size; growth[p.prof] += p.growth * p.size;
    }
    const avg = (m: Record<PopClass, number>) => byClass((s) => (n[s] > 0 ? round2(m[s] / n[s]) : 0));
    const firms = k.privateIds.map((id) => companyById(w, id)).filter((c) => !!c);
    const builder = gov ? builderOf(w, gov) : undefined;
    const est = gov ? constructionEstimate(w, gov, 'farm') : undefined;
    const queue = w.constructions.filter((x) => { const o = companyById(w, x.companyId); return !!o && !!builder && builderOf(w, o) === builder; });
    const queuePoints = queue.reduce((a, x) => a + x.required - x.points, 0);
    const levelsBy: Record<string, number> = {};
    const typeBy: Record<string, TypeMetrics> = {};
    let levelsState = 0, levelsPrivate = 0;
    for (const b of w.buildings) {
      const t = BUILDING_BY_ID[b.typeId];
      if (t.auto || kingdomOf(w, b.regionId) !== k.id) continue;
      levelsBy[b.typeId] = (levelsBy[b.typeId] ?? 0) + b.level;
      const tm = (typeBy[b.typeId] ??= { employed: 0, slots: 0, profit: 0, lossLevels: 0 });
      for (const sk of ['unskilled', 'farmer', 'skilled', 'expert'] as const) { tm.employed += b.employed[sk]; tm.slots += slots(b, sk); }
      tm.profit += b.profitEma;
      if (b.profitEma < 0) tm.lossLevels += b.level;
      if (b.stateOwned) levelsState += b.level; else levelsPrivate += b.level;
    }
    // 노동 시장
    const labor = {} as KingdomMetrics['labor'];
    for (const s of ['unskilled', 'farmer', 'skilled', 'expert'] as const) {
      let paid = 0, emp = 0, cap = 0;
      for (const b of w.buildings) {
        if (kingdomOf(w, b.regionId) !== k.id || BUILDING_BY_ID[b.typeId].auto) continue;
        const c = companyById(w, b.companyId);
        emp += b.employed[s]; cap += slots(b, s); paid += b.employed[s] * (c?.wages[s] ?? 0);
      }
      const idle = pops.filter((p) => p.prof === s && p.work === 0).reduce((a, p) => a + workforce(p), 0);
      labor[s] = { wage: emp > 0 ? round2(paid / emp) : 0, employed: r0(emp), slots: r0(cap), jobless: r0(idle) };
    }
    let pi = 0, pw = 0, lc = 0, lw = 0, va = 0, wages = 0, workers = 0;
    for (const r of w.regions.filter((x) => x.kingdomId === k.id)) {
      const peas = pops.filter((p) => p.regionId === r.id && p.prof === 'peasant' && p.work !== 0).reduce((a, p) => a + workforce(p), 0);
      pi += subsistenceWage(w, r) * peas; pw += peas;
      const people = pops.filter((p) => p.regionId === r.id).reduce((a, p) => a + p.size, 0);
      lc += basketCostAt(r, 1 / WORKFORCE_RATIO, 5) * people; lw += people;
    }
    for (const b of w.buildings) {
      if (kingdomOf(w, b.regionId) !== k.id || BUILDING_BY_ID[b.typeId].auto || isGovernment(b.typeId)) continue;
      va += b.last.revenue - b.last.inputCost; wages += b.last.wageCost;
      workers += b.employed.unskilled + b.employed.farmer + b.employed.skilled + b.employed.expert;
    }
    kingdoms[k.id] = {
      labor, peasantIncome: pw > 0 ? round2(pi / pw) : 0, livingCost5: lw > 0 ? round2(lc / lw) : 0,
      valueAddedPerWorker: workers > 0 ? round2(va / workers) : 0, wageShare: va > 0 ? round2(wages / va) : 0,
      pop: r0(pop), popBy: byClass((s) => r0(n[s])),
      peasantShare: pop > 0 ? round2(n.peasant / pop) : 0, joblessShare: pop > 0 ? round2(jobless / pop) : 0,
      wealthBy: avg(wealth), solBy: avg(sol), foodBy: avg(food), growthBy: avg(growth),
      gdp: r0(kingdomGdp(w, k.id)), revenueWeek: r0(k.lastBudget?.revenue ?? 0), feesWeek: r0(k.lastBudget?.fees ?? 0),
      govSpendWeek: r0((k.lastBudget?.wages ?? 0) + (k.lastBudget?.goods ?? 0)), research: r0(k.lastBudget?.research ?? 0), interest: r0(k.lastBudget?.interest ?? 0),
      taxRatio: k.taxRatio ?? 0, policy: { ...k.budget }, wageIndex: k.wageIndex ?? 0,
      treasury: r0(gov?.cash ?? 0), debt: r0(gov?.debt ?? 0), privateCash: r0(firms.reduce((a, c) => a + c!.cash, 0)), pool: r0(k.investmentPool), savings: r0(savings),
      officeLevels: w.buildings.filter((b) => b.companyId === builder?.id && b.typeId === 'builder').reduce((a, b) => a + b.level, 0),
      pointsPerDay: round2(est?.pointsPerDay ?? 0), queuePoints: r0(queuePoints),
      backlogDays: est && est.pointsPerDay > 0 ? r0(queuePoints / est.pointsPerDay) : 0, projects: queue.length,
      levelsState, levelsPrivate, levelsBy,
      typeBy: Object.fromEntries(Object.entries(typeBy).map(([t, m]) => [t, { employed: r0(m.employed), slots: r0(m.slots), profit: r0(m.profit), lossLevels: m.lossLevels }])),
      starts: k.startsMonth ?? {},
      wageUnskilled: round2(gov?.wages.unskilled ?? 0), wageSkilled: round2(gov?.wages.skilled ?? 0), techs: gov?.research.known.length ?? 0,
    };
  }
  for (const k of w.kingdoms) k.startsMonth = {};
  const goods = {} as Record<GoodId, GoodMetrics>;
  for (const g of GOOD_IDS) {
    let ratio = 0, supply = 0, demand = 0, sold = 0;
    for (const r of w.regions) { const m = r.market[g]; ratio += m.price / GOODS[g].basePrice; supply += m.supplyEma; demand += m.demandEma; sold += m.volumeEma; }
    goods[g] = { ratio: round2(ratio / Math.max(1, w.regions.length)), supply: r0(supply), demand: r0(demand), sold: r0(sold) };
  }
  let up = 0, upN = 0, low = 0, lowN = 0;
  const regionSol: number[] = [];
  for (const r of w.regions) {
    let s = 0, n = 0;
    for (const p of w.pops) {
      if (p.regionId !== r.id) continue;
      s += p.sol * p.size; n += p.size;
      const st = CLASS_DEFS[p.prof].stratum;
      if (st === 'upper') { up += p.sol * p.size; upN += p.size; } else if (st === 'lower') { low += p.sol * p.size; lowN += p.size; }
    }
    if (n > 0) regionSol.push(s / n);
  }
  const classGap = upN > 0 && lowN > 0 && low > 0 ? round2((up / upN) / (low / lowN)) : 0;
  const regionGap = regionSol.length && Math.min(...regionSol) > 0 ? round2(Math.max(...regionSol) / Math.min(...regionSol)) : 0;
  const harvestRegions = w.regions.filter((r) => harvestCondition(w, r.id)).length;
  const point: MetricPoint = { tick: w.tick, kingdoms, goods, classGap, regionGap, traders: r0(w.traders.cash), ...(harvestRegions ? { harvestRegions } : {}) };
  // 지표는 이미 소수 둘째 자리로 쓰지만, 기록이라 한 번 더 맞춘다 (저장값 규칙)
  roundAll(point);
  (w.metrics ??= []).push(point);
  if (w.metrics.length > METRICS_CAP) w.metrics.splice(0, w.metrics.length - METRICS_CAP);
}
