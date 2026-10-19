// 민간 투자 진단: npx tsx cli/investdiag.ts '<TUNE JSON>' [seed] [years]
// 해마다 한 줄 (돈은 백만):
// - 돈의 흐름 (주당, 왕국 평균): 들어온 투자금, 공사비, 매출, 임금, 원료, 배당
// - 연말: 민간 현금, 진행 공사 잔액, 쉬는 돈 (3왕국 합), 사무소 하루 포인트·실제 사용·대기 일수, 민간 공사 수 (왕국 평균)
// 그 아래 민간 회사마다 한 줄 (k 왕국 번호): 연말 현금·쉬는 돈, 그해 후보 (4주마다, 그 회사의 점검 1번당 개수.
//   지역 × 건물 × 방식 1레벨, pickProject 와 같은 순서로 처음 막힌 관문):
//   ok 통과, labour 일손 < 0.5 (그중 수익률은 통과), loss 손해, lowroi 수익률 ≤ 0.2, land 땅 없음 (그중 수익률·일손 통과), deposit 매장량 없음,
//   cash 여윳돈 < 1레벨 공사비, weather 기상 조건, shrinking 철거 중
//   관문은 회사마다 따로 본다: 돈이 쌓인 회사와 돈이 모자란 회사를 평균하면 둘 다 가려진다
// 시뮬레이션 상태를 바꾸지 않고 무작위 수열(rand)을 쓰지 않는다 (같은 시드면 결과가 sweep 과 같다)
import { laborAvailability } from '../src/ai';
import { BUILDING_TYPES, TICKS_PER_YEAR, TUNE } from '../src/data';
import { availableMethods, builderOf, canBuildType, companyById, constructionEstimate, depositFree, harvestFactor, roomFor, withEstimateCache } from '../src/economy';
import { committedCost, reserveOf } from '../src/finance';
import { createWorld, step } from '../src/index';
import { marketOutlook, valueMethod } from '../src/outlook';
import type { Company, World } from '../src/types';

Object.assign(TUNE, JSON.parse(process.argv[2] ?? '{}'));
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 20);
const w = createWorld(seed, { withPlayer: false });
const MIN_ROI = 0.2, MIN_STAFFING = 0.5;
const FLOW = ['investment', 'buildPaid', 'sales', 'wages', 'inputs', 'dividends'] as const;
const GATES = ['ok', 'labour', 'labourRoiOk', 'loss', 'lowroi', 'land', 'landGood', 'deposit', 'cash', 'weather', 'shrinking'] as const;
const M = (x: number) => (x / 1e6).toFixed(2);

/** 회사 c 의 후보 1레벨마다 처음 막힌 관문을 센다 */
function census(w: World, c: Company, out: Record<string, number>) {
  const o = marketOutlook(w);
  const free = c.cash - reserveOf(w, c) - committedCost(w, c) - constructionEstimate(w, c, 'farm').costPerDay * 30;
  const pools = new Map<string, number>();
  const add = (k: string) => { out[k] = (out[k] ?? 0) + 1; };
  for (const r of w.regions) {
    if (r.kingdomId !== c.kingdomId) continue;
    for (const t of BUILDING_TYPES) {
      if (t.id === 'builder' || !canBuildType(c, t)) continue;
      const existing = w.buildings.find((b) => b.companyId === c.id && b.regionId === r.id && b.typeId === t.id);
      const perLevel = constructionEstimate(w, c, t.id).cost;
      for (const m of availableMethods(c, t.id)) {
        if (existing && existing.methodId !== m.id) continue;
        if (harvestFactor(w, r.id, t.land) < 1) { add('weather'); continue; }
        if (!Number.isFinite(perLevel) || free < perLevel) { add('cash'); continue; }
        if (existing?.shrinking) { add('shrinking'); continue; }
        const e = valueMethod(w, o, r, c, t.id, m, 1);
        const roi = (e.profit * TICKS_PER_YEAR) / perLevel, roiOk = e.profit > 0 && roi > MIN_ROI;
        const staffed = laborAvailability(w, r, m, 1, c.state, pools) >= MIN_STAFFING;
        if (roomFor(w, r.id, t.id) < 1) {
          if (t.deposit && depositFree(w, r.id, t.deposit) < 1) { add('deposit'); continue; }
          add('land');
          if (roiOk && staffed) add('landGood');
          continue;
        }
        if (!staffed) { add('labour'); if (roiOk) add('labourRoiOk'); continue; }
        add(e.profit <= 0 ? 'loss' : !roiOk ? 'lowroi' : 'ok');
      }
    }
  }
}

console.log('year | 주당 흐름: ' + FLOW.join(' ') + ' | 연말: cash committed idle | pts used backlogDays projects');
console.log('  k | 연말: cash idle | 후보 (점검당): ' + GATES.join(' '));
let flow: Record<string, number> = {}, weeks = 0;
/** 회사 id → 그해 관문별 후보 수, 점검 횟수 */
const gates = new Map<number, Record<string, number>>(), checks = new Map<number, number>();
for (let d = 1; d <= years * 360; d++) {
  step(w);
  const firms = w.companies.filter((c) => !c.state);
  if (w.tick % 7 === 0) {
    weeks++;
    for (const c of firms) for (const k of FLOW) flow[k] = (flow[k] ?? 0) + (c.lastLedger[k] ?? 0);
  }
  if (w.tick % 28 === 0) withEstimateCache(() => {
    for (const c of firms) {
      let g = gates.get(c.id);
      if (!g) gates.set(c.id, (g = {}));
      checks.set(c.id, (checks.get(c.id) ?? 0) + 1);
      census(w, c, g);
    }
  });
  if (d % 360 !== 0) continue;
  const nk = w.kingdoms.length;
  let cash = 0, comm = 0, proj = 0, pts = 0, used = 0, back = 0;
  for (const c of firms) { cash += c.cash; comm += committedCost(w, c); proj += w.constructions.filter((k) => k.companyId === c.id).length; }
  for (const g of w.companies.filter((c) => c.state)) {
    const est = constructionEstimate(w, g, 'farm');
    pts += est.pointsPerDay; used += g.buildUsed ?? 0;
    const q = w.constructions.filter((k) => { const o = companyById(w, k.companyId); return !!o && builderOf(w, o) === g; });
    back += q.reduce((a, k) => a + k.required - k.points, 0) / Math.max(1, est.pointsPerDay);
  }
  console.log(`y${d / 360} | ${FLOW.map((k) => M((flow[k] ?? 0) / Math.max(1, weeks) / nk)).join(' ')} | ${M(cash)} ${M(comm)} ${M(cash - comm)} | ${(pts / nk).toFixed(0)} ${(used / nk).toFixed(0)} ${(back / nk).toFixed(0)} ${(proj / nk).toFixed(1)}`);
  for (const c of firms) {
    const g = gates.get(c.id) ?? {}, n = Math.max(1, checks.get(c.id) ?? 0);
    console.log(`  k${c.kingdomId} | ${M(c.cash)} ${M(c.cash - committedCost(w, c))} | ${GATES.map((k) => ((g[k] ?? 0) / n).toFixed(1)).join(' ')}`);
  }
  flow = {}; weeks = 0; gates.clear(); checks.clear();
}
