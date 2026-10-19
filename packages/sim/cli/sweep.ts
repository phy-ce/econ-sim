// 조정값 비교: npx tsx cli/sweep.ts '<TUNE JSON>' [seed] [years]
// 주요 지표(w.metrics)에서 5년마다(와 마지막 해) 대륙 합계를 뽑아 한 줄 JSON으로 출력한다.
// TIMING=1 이면 time: { ms 시뮬레이션 시간, msPerDay 하루 평균 } 을 덧붙인다 (sweepsum.py 가 따로 요약한다)
import { TUNE } from '../src/data';
import { createWorld, hasOwnCash, step } from '../src/index';
import type { MetricPoint } from '../src/index';

const over = JSON.parse(process.argv[2] ?? '{}');
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 10);
Object.assign(TUNE, over);
// 비교 실행에서는 플레이어 왕국도 AI가 맡는다
const w = createWorld(seed, { withPlayer: false });
// 왕실 정책 단계 (4주 점검마다 왕국별): 세금 수준·국고(지출 몇 주치)·빚·보조금 건물 레벨 비율
const trace = w.kingdoms.map(() => [] as { tax: number; sub: number; weeks: number; debt: boolean }[]);
// 건물 임금: 5년마다 노동자 임금의 건물 간 흩어짐(고용 가중 변동계수), 1년 뒤부터 주간 노동자 임금 방향이 바로 뒤집힌 비율(flipW)
const wageCv: Record<number, number> = {};
const lastW = new Map<number, { wage: number; dir: number }>();
let wMoves = 0, wFlips = 0;
const t0 = performance.now();
for (let d = 0; d < years * 360; d++) {
  step(w);
  if (w.tick % 7 === 0 && w.tick > 360) {
    for (const b of w.buildings) {
      if (!hasOwnCash(b) || !(b.employed.unskilled > 0)) continue;
      const prev = lastW.get(b.id), wage = b.wages.unskilled;
      const dir = prev ? Math.sign(wage - prev.wage) : 0;
      if (dir !== 0) { wMoves++; if (prev && prev.dir === -dir) wFlips++; }
      lastW.set(b.id, { wage, dir: dir !== 0 ? dir : prev?.dir ?? 0 });
    }
  }
  if (w.tick % 1800 === 0) {
    let n = 0, s = 0, s2 = 0;
    for (const b of w.buildings) {
      const e = b.employed.unskilled;
      if (!hasOwnCash(b) || !(e > 0)) continue;
      n += e; s += e * b.wages.unskilled; s2 += e * b.wages.unskilled ** 2;
    }
    const mean = n > 0 ? s / n : 0;
    wageCv[w.tick / 360] = mean > 0 ? +(Math.sqrt(Math.max(0, s2 / n - mean * mean)) / mean).toFixed(2) : 0;
  }
  if (w.tick % 28 !== 0) continue;
  w.kingdoms.forEach((k, i) => {
    const g = w.companies.find((c) => c.id === k.governmentId)!;
    let lv = 0, sub = 0;
    for (const b of w.buildings) if (w.regions.find((r) => r.id === b.regionId)?.kingdomId === k.id && b.cash + b.lastWeek.wages > 0) { lv += b.level; if (b.subsidized) sub += b.level; }
    trace[i].push({ tax: k.budget.tax, sub: lv > 0 ? sub / lv : 0, weeks: (k.expenseEma ?? 0) > 0 ? g.cash / k.expenseEma! : Infinity, debt: g.debt > 0 });
  });
}
const simMs = performance.now() - t0;

// 플레이어 왕국은 연구를 고르지 않으므로 기술 수에서 뺀다
const playerKingdom = w.companies.find((c) => c.isPlayer)?.kingdomId;
const sum = (m: MetricPoint, f: (k: MetricPoint['kingdoms'][number]) => number) => Object.values(m.kingdoms).reduce((a, k) => a + f(k), 0);
const out: Record<string, unknown> = { tune: over, seed };
for (const m of w.metrics) {
  const y = m.tick / 360;
  if (!Number.isInteger(y) || (y % 5 !== 0 && y !== years)) continue;
  const pop = sum(m, (k) => k.pop);
  out[`y${y}`] = {
    pop: +(pop / 1e6).toFixed(2),
    peas: +(sum(m, (k) => k.popBy.peasant) / pop).toFixed(2),
    jobless: +(sum(m, (k) => k.joblessShare * k.pop) / pop).toFixed(3),
    levels: sum(m, (k) => k.levelsState + k.levelsPrivate),
    techs: Math.min(...Object.entries(m.kingdoms).filter(([id]) => Number(id) !== playerKingdom).map(([, k]) => k.techs)),
    revWk: Math.round(sum(m, (k) => k.revenueWeek) / 1e3),
    pts: Math.round(sum(m, (k) => k.pointsPerDay)),
    grain: m.goods.grain.ratio,
    classGap: m.classGap,
    regionGap: m.regionGap,
    taxRatio: +(sum(m, (k) => k.taxRatio * k.pop) / pop).toFixed(2),
    solPeas: +(sum(m, (k) => k.solBy.peasant * k.popBy.peasant) / Math.max(1, sum(m, (k) => k.popBy.peasant))).toFixed(2),
    foodPeas: +(sum(m, (k) => k.foodBy.peasant * k.popBy.peasant) / Math.max(1, sum(m, (k) => k.popBy.peasant))).toFixed(2),
    solUnsk: +(sum(m, (k) => k.solBy.unskilled * k.popBy.unskilled) / Math.max(1, sum(m, (k) => k.popBy.unskilled))).toFixed(2),
    wUnsk: +(sum(m, (k) => k.labor.unskilled.wage * k.labor.unskilled.employed) / Math.max(1, sum(m, (k) => k.labor.unskilled.employed))).toFixed(2),
    wSk: +(sum(m, (k) => k.labor.skilled.wage * k.labor.skilled.employed) / Math.max(1, sum(m, (k) => k.labor.skilled.employed))).toFixed(2),
    bcash: +(sum(m, (k) => k.buildingCash) / 1e6).toFixed(1),
    pcash: +(sum(m, (k) => k.privateCash) / 1e6).toFixed(1),
    subWk: Math.round(sum(m, (k) => k.subsidyWeek) / 1e3),
    lossLv: sum(m, (k) => Object.entries(k.typeBy).reduce((a, [id, t]) => a + (['builder', 'admin', 'school'].includes(id) ? 0 : t.lossLevels), 0)),
    // 보조금 / 국고 수입, 노동자 임금 흩어짐, 왕실 건물 충원율 (행정청·학교·건축사무소: 고용 / 자리)
    subRev: +(sum(m, (k) => k.subsidyWeek) / Math.max(1, sum(m, (k) => k.revenueWeek))).toFixed(3),
    wCv: wageCv[y] ?? 0,
    ...Object.fromEntries((['admin', 'school', 'builder'] as const).map((t) => [`fill_${t}`, +(sum(m, (k) => k.typeBy[t]?.employed ?? 0) / Math.max(1, sum(m, (k) => k.typeBy[t]?.slots ?? 0))).toFixed(2)])),
  };
}
out.flipW = +(wMoves ? wFlips / wMoves : 0).toFixed(3);
const after1 = w.metrics.filter((m) => m.tick > 360);
out.foodMin = Math.min(...after1.map((m) => {
  const n = sum(m, (k) => k.popBy.unskilled);
  return n > 0 ? sum(m, (k) => k.foodBy.unskilled * k.popBy.unskilled) / n : 1;
})).toFixed(2);
// 정책 요약 (전체 기간, 왕국 평균): t5/t1 세금 5·1단계에 있던 점검 비율, run5/run1 세금 5·1단계가 가장 길게 이어진 햇수(왕국 최대),
// chg 왕국 한 곳의 한 해 세금 수준 변경 수, flip 바로 다음 점검에서 되돌린 변경 비율, sub 보조금 건물 레벨 비율(현금 건물 중),
// debt 빚이 있던 점검 비율, hoard 국고가 지출 104주치(2년)를 넘던 점검 비율
const yrs = years, nk = trace.length;
let t5 = 0, t1 = 0, run5 = 0, run1 = 0, chg = 0, flips = 0, sub = 0, debt = 0, hoard = 0, n = 0;
for (const tr of trace) {
  let run = 0, low = 0, lastDir = 0;
  tr.forEach((x, j) => {
    n++;
    sub += x.sub;
    if (x.tax === 5) t5++;
    if (x.tax === 1) t1++;
    run = x.tax === 5 ? run + 1 : 0;
    run5 = Math.max(run5, run);
    low = x.tax === 1 ? low + 1 : 0;
    run1 = Math.max(run1, low);
    if (x.debt) debt++;
    if (x.weeks > 104) hoard++;
    if (j === 0) return;
    const dir = Math.sign(x.tax - tr[j - 1].tax);
    if (dir === 0) { lastDir = 0; return; }
    chg++;
    if (lastDir === -dir) flips++;
    lastDir = dir;
  });
}
const f2 = (x: number) => +x.toFixed(2);
out.pol = { t5: f2(t5 / n), t1: f2(t1 / n), run5: f2((run5 * 28) / 360), run1: f2((run1 * 28) / 360), chg: f2(chg / nk / yrs), flip: f2(chg ? flips / chg : 0), sub: f2(sub / n), debt: f2(debt / n), hoard: f2(hoard / n) };
if (process.env.TIMING) out.time = { ms: Math.round(simMs), msPerDay: +(simMs / (years * 360)).toFixed(2) };
console.log(JSON.stringify(out));
