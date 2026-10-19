// 조정값 비교: npx tsx cli/sweep.ts '<TUNE JSON>' [seed] [years]  (JSON 의 "subsistence" 는 SUBSISTENCE 를 바꾼다)
// 주요 지표(w.metrics)에서 5년마다(와 마지막 해) 대륙 합계를 뽑아 한 줄 JSON으로 출력한다.
// TIMING=1 이면 time: { ms 시뮬레이션 시간, msPerDay 하루 평균 } 을 덧붙인다 (sweepsum.py 가 따로 요약한다)
import { BUILDING_BY_ID, SKILL_DEFS, SUBSISTENCE, TUNE } from '../src/data';
import { isGovernment, paysDividend, slots } from '../src/economy';
import { committedCost } from '../src/finance';
import { createWorld, literacyOf, step } from '../src/index';
import type { MetricPoint } from '../src/index';
import { workforce } from '../src/pops';
import { applyWorld } from './worldtune';
import { SKILLS } from '../src/types';
import type { World } from '../src/types';

/**
 * 민간 투자 (5년마다, 대륙 합계): priv 민간 상회 현금(백만), idle 그중 진행 공사 잔액을 뺀 쉬는 돈(백만),
 * lvP·lvS 민간·왕실 건물 레벨, stP 민간 건물 충원율(기본 임금 가중), profP 민간 건물 하루 손익 이동평균 합(천), ofLv 사무소 레벨
 */
function investSnapshot(w: World) {
  let priv = 0, idle = 0, lvP = 0, lvS = 0, need = 0, have = 0, profP = 0, ofLv = 0;
  for (const c of w.companies) if (!c.state) { priv += c.cash; idle += c.cash - committedCost(w, c); }
  for (const b of w.buildings) {
    if (BUILDING_BY_ID[b.typeId].auto) continue;
    if (b.typeId === 'builder') ofLv += b.level;
    if (b.stateOwned) { lvS += b.level; continue; }
    lvP += b.level;
    profP += b.profitEma;
    for (const s of SKILLS) {
      if (paysDividend(false, s)) continue;
      const n = slots(b, s);
      need += n * SKILL_DEFS[s].baseWage; have += Math.min(n, b.employed[s]) * SKILL_DEFS[s].baseWage;
    }
  }
  const f2 = (x: number) => +x.toFixed(2);
  return { priv: f2(priv / 1e6), idle: f2(idle / 1e6), lvP, lvS, stP: f2(need > 0 ? have / need : 0), profP: Math.round(profP / 1e3), ofLv };
}

/**
 * 5년 구간 (월 기록, 대륙 합계): lossSh 생산 건물(정부 건물 제외) 레벨 중 적자(이익 이동평균 < 0) 비율의 월 평균,
 * dem 철거 레벨, bP·bS 민간·왕실 착공 레벨
 */
function investInterval(ms: MetricPoint[], from: number, to: number) {
  let loss = 0, lv = 0, dem = 0, bP = 0, bS = 0;
  for (const m of ms) {
    if (m.tick <= from || m.tick > to) continue;
    for (const k of Object.values(m.kingdoms)) {
      for (const [t, x] of Object.entries(k.typeBy)) if (!isGovernment(t)) { loss += x.lossLevels; lv += k.levelsBy[t] ?? 0; }
      for (const [key, n] of Object.entries(k.starts)) {
        if (key.endsWith('|d')) dem += n; else if (key.endsWith('|p')) bP += n; else if (key.endsWith('|s')) bS += n;
      }
    }
  }
  return { lossSh: +(lv > 0 ? loss / lv : 0).toFixed(2), dem, bP, bS };
}

const over = JSON.parse(process.argv[2] ?? '{}');
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 10);
// "subsistence": { grainPerWorker 등 } 은 소작지 1인당 산출(SUBSISTENCE)을 바꾼다
// "world": 상품 가격·임금·일자리·원료 배율 (cli/worldtune.ts)
const { subsistence, world, ...tune } = over;
Object.assign(TUNE, tune);
if (subsistence) Object.assign(SUBSISTENCE, subsistence);
applyWorld(world);
// 비교 실행에서는 플레이어 왕국도 AI가 맡는다
const w = createWorld(seed, { withPlayer: false });
// 왕실 정책 단계 (4주 점검마다 왕국별): 세금 수준·국영 임금 수준·국고(지출 몇 주치)·빚
const trace = w.kingdoms.map(() => [] as { tax: number; wages: number; weeks: number; debt: boolean }[]);
// 교육 (5년마다): lit 인구 가중 문해력, sch 왕실 학교 레벨, qs 기술자 자격자(기술자 + 다른 직종의 기술자 자격, 천 명), schDem 학교 철거 레벨 누계
const edu: Record<number, { lit: number; sch: number; qs: number; schDem: number; veins: number }> = {};
const inv: Record<number, ReturnType<typeof investSnapshot>> = {};
let schDem = 0;
const schoolLevels = new Map<number, number>();
// 소작 시장 (해마다 하루 평균): subG·subT 소작지가 내놓은 곡물·목재, demG·demT 곡물·목재 수요 (만), landTax 걷힌 토지세 (천/일),
// shG·shT·shF 소작지가 내놓은 양 / 소작지 수확 (곡물·목재·섬유)
const yearAcc = { subG: 0, demG: 0, subT: 0, demT: 0, subF: 0, hG: 0, hT: 0, hF: 0, landTax: 0 };
const yearly: Record<number, Record<string, number>> = {};
const t0 = performance.now();
for (let d = 0; d < years * 360; d++) {
  step(w);
  for (const r of w.regions) {
    yearAcc.subG += r.market.grain.supplyBy?.subsistence ?? 0; yearAcc.demG += r.market.grain.demand;
    yearAcc.subT += r.market.timber.supplyBy?.subsistence ?? 0; yearAcc.demT += r.market.timber.demand;
    yearAcc.subF += r.market.fiber.supplyBy?.subsistence ?? 0;
  }
  for (const b of w.buildings) if (b.typeId === 'subsistence') { yearAcc.hG += b.last.output.grain ?? 0; yearAcc.hT += b.last.output.timber ?? 0; yearAcc.hF += b.last.output.fiber ?? 0; }
  for (const k of w.kingdoms) yearAcc.landTax += k.landGot ?? 0;
  if (w.tick % 360 === 0) {
    const y = w.tick / 360;
    let cash = 0, n = 0;
    for (const p of w.pops) if (p.prof === 'peasant' && p.work !== 0) { cash += Math.max(0, p.incomeEma); n += p.size; }
    yearly[y] = {
      subG: +(yearAcc.subG / 360 / 1e4).toFixed(1), demG: +(yearAcc.demG / 360 / 1e4).toFixed(1),
      subT: +(yearAcc.subT / 360 / 1e4).toFixed(1), demT: +(yearAcc.demT / 360 / 1e4).toFixed(1),
      shG: +(yearAcc.subG / Math.max(1, yearAcc.hG)).toFixed(3), shT: +(yearAcc.subT / Math.max(1, yearAcc.hT)).toFixed(3), shF: +(yearAcc.subF / Math.max(1, yearAcc.hF)).toFixed(3),
      landTax: +(yearAcc.landTax / 360 / 1e3).toFixed(1), cashPeas: +(n > 0 ? cash / n : 0).toFixed(3),
    };
    for (const key of Object.keys(yearAcc) as (keyof typeof yearAcc)[]) yearAcc[key] = 0;
  }
  if (w.tick % 7 === 0) {
    // 줄어든 학교 레벨 (철거) 을 센다
    const now = new Map<number, number>();
    for (const b of w.buildings) if (b.typeId === 'school') now.set(b.id, b.level);
    for (const [id, lv] of schoolLevels) schDem += Math.max(0, lv - (now.get(id) ?? 0));
    schoolLevels.clear();
    for (const [id, lv] of now) schoolLevels.set(id, lv);
  }
  if (w.tick % 1800 === 0 || w.tick === years * 360) {
    let n = 0, lit = 0, qs = 0;
    for (const p of w.pops) { n += p.size; lit += p.size * literacyOf(p); qs += p.prof === 'skilled' ? workforce(p) : (p.quals.skilled ?? 0); }
    const sch = w.buildings.filter((b) => b.typeId === 'school').reduce((a, b) => a + b.level, 0);
    // veins: 찾은 광맥 레벨 합 (모든 지역·자원)
    const veins = w.regions.reduce((a, r) => a + Object.values(r.deposits).reduce((b, x) => b + x, 0), 0);
    edu[w.tick / 360] = { lit: +(lit / n).toFixed(3), sch, qs: Math.round(qs / 1e3), schDem, veins };
    inv[w.tick / 360] = investSnapshot(w);
  }
  if (w.tick % 28 !== 0) continue;
  w.kingdoms.forEach((k, i) => {
    const g = w.companies.find((c) => c.id === k.governmentId)!;
    trace[i].push({ tax: k.budget.tax, wages: k.budget.wages, weeks: (k.expenseEma ?? 0) > 0 ? g.cash / k.expenseEma! : Infinity, debt: g.debt > 0 });
  });
}
const simMs = performance.now() - t0;

// 플레이어 왕국은 연구를 고르지 않으므로 기술 수에서 뺀다
const playerKingdom = w.companies.find((c) => c.isPlayer)?.kingdomId;
const sum = (m: MetricPoint, f: (k: MetricPoint['kingdoms'][number]) => number) => Object.values(m.kingdoms).reduce((a, k) => a + f(k), 0);
const out: Record<string, unknown> = { tune: over, seed };
for (const m of w.metrics) {
  const y = m.tick / 360;
  if (!Number.isInteger(y) || (y % 5 !== 0 && y !== years && y !== 2)) continue;
  const pop = sum(m, (k) => k.pop);
  out[`y${y}`] = {
    pop: +(pop / 1e6).toFixed(2),
    peas: +(sum(m, (k) => k.popBy.peasant) / pop).toFixed(2),
    jobless: +(sum(m, (k) => k.joblessShare * k.pop) / pop).toFixed(3),
    levels: sum(m, (k) => k.levelsState + k.levelsPrivate),
    techs: Math.min(...Object.entries(m.kingdoms).filter(([id]) => Number(id) !== playerKingdom).map(([, k]) => k.techs)),
    revWk: Math.round(sum(m, (k) => k.revenueWeek) / 1e3),
    gdp: Math.round(sum(m, (k) => k.gdp) / 1e6),
    pts: Math.round(sum(m, (k) => k.pointsPerDay)),
    grain: m.goods.grain.ratio,
    timber: m.goods.timber.ratio,
    fiber: m.goods.fiber.ratio,
    solArist: +(sum(m, (k) => k.solBy.aristocrat * k.popBy.aristocrat) / Math.max(1, sum(m, (k) => k.popBy.aristocrat))).toFixed(2),
    ...(yearly[y] ?? {}),
    ore: m.goods.ore.ratio,
    fuel: m.goods.fuel.ratio,
    classGap: m.classGap,
    regionGap: m.regionGap,
    taxRatio: +(sum(m, (k) => k.taxRatio * k.pop) / pop).toFixed(2),
    solPeas: +(sum(m, (k) => k.solBy.peasant * k.popBy.peasant) / Math.max(1, sum(m, (k) => k.popBy.peasant))).toFixed(2),
    foodPeas: +(sum(m, (k) => k.foodBy.peasant * k.popBy.peasant) / Math.max(1, sum(m, (k) => k.popBy.peasant))).toFixed(2),
    solUnsk: +(sum(m, (k) => k.solBy.unskilled * k.popBy.unskilled) / Math.max(1, sum(m, (k) => k.popBy.unskilled))).toFixed(2),
    ...(edu[y] ?? {}),
    ...(inv[y] ?? {}),
    ...investInterval(w.metrics, (y - 5) * 360, y * 360),
  };
}
const after1 = w.metrics.filter((m) => m.tick > 360);
out.foodMin = Math.min(...after1.map((m) => {
  const n = sum(m, (k) => k.popBy.unskilled);
  return n > 0 ? sum(m, (k) => k.foodBy.unskilled * k.popBy.unskilled) / n : 1;
})).toFixed(2);
// 정책 요약 (전체 기간, 왕국 평균): t5/t1 세금 5·1단계에 있던 점검 비율, run5/run1 세금 5·1단계가 가장 길게 이어진 햇수(왕국 최대),
// chg 왕국 한 곳의 한 해 세금 수준 변경 수, flip 바로 다음 점검에서 되돌린 변경 비율, wchg 국영 임금 수준 변경 수/년,
// debt 빚이 있던 점검 비율, hoard 국고가 지출 104주치(2년)를 넘던 점검 비율
const yrs = years, nk = trace.length;
let t5 = 0, t1 = 0, run5 = 0, run1 = 0, chg = 0, flips = 0, wchg = 0, debt = 0, hoard = 0, n = 0;
for (const tr of trace) {
  let run = 0, low = 0, lastDir = 0;
  tr.forEach((x, j) => {
    n++;
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
    if (x.wages !== tr[j - 1].wages) wchg++;
    if (dir === 0) { lastDir = 0; return; }
    chg++;
    if (lastDir === -dir) flips++;
    lastDir = dir;
  });
}
const f2 = (x: number) => +x.toFixed(2);
out.pol = { t5: f2(t5 / n), t1: f2(t1 / n), run5: f2((run5 * 28) / 360), run1: f2((run1 * 28) / 360), chg: f2(chg / nk / yrs), flip: f2(chg ? flips / chg : 0), wchg: f2(wchg / nk / yrs), debt: f2(debt / n), hoard: f2(hoard / n) };
if (process.env.TIMING) out.time = { ms: Math.round(simMs), msPerDay: +(simMs / (years * 360)).toFixed(2) };
console.log(JSON.stringify(out));
