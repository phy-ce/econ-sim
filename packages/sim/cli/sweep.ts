// 조정값 비교: npx tsx cli/sweep.ts '<TUNE JSON>' [seed] [years]  (JSON 의 "subsistence" 는 SUBSISTENCE 를 바꾼다)
// 주요 지표(w.metrics)에서 5년마다(와 마지막 해) 대륙 합계를 뽑아 한 줄 JSON으로 출력한다.
// TIMING=1 이면 time: { ms 시뮬레이션 시간, msPerDay 하루 평균 } 을 덧붙인다 (sweepsum.py 가 따로 요약한다)
import { BUILDING_BY_ID, GOODS, SKILL_DEFS, SUBSISTENCE, TUNE } from '../src/data';
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
// 하급 귀족·귀족 (5년마다): gJob·aJob 실업 비율(노동 인구), gSol 하급 귀족 생활수준, gMan 저택에 앉은 하급 귀족 비율
const gent: Record<number, { gJob: number; aJob: number; gSol: number; gMan: number; gSch: number; gAdm: number; tut: number }> = {};
const inv: Record<number, ReturnType<typeof investSnapshot>> = {};
let schDem = 0;
const schoolLevels = new Map<number, number>();
// 소작 시장 (해마다 하루 평균): subG·subT 소작지가 내놓은 곡물·목재, demG·demT 곡물·목재 수요 (만), landTax 걷힌 토지세 (천/일),
// shG·shT·shF 소작지가 내놓은 양 / 소작지 수확 (곡물·목재·섬유)
const yearAcc = { subG: 0, demG: 0, subT: 0, demT: 0, subF: 0, hG: 0, hT: 0, hF: 0, landTax: 0, pG: 0, pC: 0, pFu: 0, pT: 0, pFi: 0, pFul: 0, pW: 0, supU: 0, demU: 0, supR: 0, demR: 0, pU: 0, pR: 0 };
// 곡물 도시(티어 1·2)·농촌(티어 3·4) 지역: supU·demU·supR·demR 하루 공급·수요 합, pU·pR 값/기본가의 지역 평균 (해마다 하루 평균)
const urban = (t: number | undefined) => (t ?? 9) <= 2;
const nU = w.regions.filter((r) => urban(r.tier)).length, nR = w.regions.length - nU;
const yearly: Record<number, Record<string, number>> = {};
// 계층 소득 (해마다 마지막 날): incAri·incGen·incSk·incUnsk 상급 귀족·하급 귀족·기술자·노동자 1인당 하루 현금 소득(incomeEma),
// ariSk 상급 귀족 ÷ 기술자, ariK 상급 귀족 인구(천), genK 하급 귀족 인구(천)
const classInc: Record<number, Record<string, number>> = {};
function classIncome(w: World) {
  const n: Record<string, number> = {}, inc: Record<string, number> = {};
  for (const p of w.pops) { n[p.prof] = (n[p.prof] ?? 0) + p.size; inc[p.prof] = (inc[p.prof] ?? 0) + p.incomeEma; }
  const per = (c: string) => (n[c] ?? 0) > 0 ? inc[c] / n[c] : 0;
  const f2 = (x: number) => +x.toFixed(2);
  // manOwn 저택이 가진 건물 레벨 합, cells 소작지 칸 합, ariSeat 저택 상급 귀족 자리 합(천)
  let manOwn = 0, cells = 0, ariSeat = 0;
  const manors = new Set(w.buildings.filter((b) => b.typeId === 'manor').map((b) => b.id));
  for (const b of w.buildings) {
    if (b.typeId === 'subsistence') cells += b.level;
    else if (b.typeId === 'manor') ariSeat += slots(b, 'aristocrat');
    for (const [id, n] of Object.entries(b.owners ?? {})) if (manors.has(Number(id))) manOwn += n;
  }
  return { manOwn, cells, ariSeat: Math.round(ariSeat / 1e3), incAri: f2(per('aristocrat')), incGen: f2(per('gentry')), incSk: f2(per('skilled')), incUnsk: f2(per('unskilled')),
    ariSk: f2(per('skilled') > 0 ? per('aristocrat') / per('skilled') : 0), ariK: Math.round((n.aristocrat ?? 0) / 1e3), genK: Math.round((n.gentry ?? 0) / 1e3) };
}
const t0 = performance.now();
for (let d = 0; d < years * 360; d++) {
  step(w);
  for (const r of w.regions) {
    yearAcc.subG += r.market.grain.supplyBy?.subsistence ?? 0; yearAcc.demG += r.market.grain.demand;
    yearAcc.subT += r.market.timber.supplyBy?.subsistence ?? 0; yearAcc.demT += r.market.timber.demand;
    yearAcc.subF += r.market.fiber.supplyBy?.subsistence ?? 0;
    yearAcc.pG += r.market.grain.demandBy?.['pop:peasant'] ?? 0;
    yearAcc.pC += r.market.cloth.demandBy?.['pop:peasant'] ?? 0; yearAcc.pFu += r.market.furniture.demandBy?.['pop:peasant'] ?? 0;
    yearAcc.pT += r.market.timber.demandBy?.['pop:peasant'] ?? 0; yearAcc.pFi += r.market.fiber.demandBy?.['pop:peasant'] ?? 0;
    const gm = r.market.grain, pr = gm.price / GOODS.grain.basePrice;
    if (urban(r.tier)) { yearAcc.supU += gm.supply; yearAcc.demU += gm.demand; yearAcc.pU += pr / nU; }
    else { yearAcc.supR += gm.supply; yearAcc.demR += gm.demand; yearAcc.pR += pr / nR; }
  }
  for (const b of w.buildings) if (b.typeId === 'subsistence') { yearAcc.hG += b.last.output.grain ?? 0; yearAcc.hT += b.last.output.timber ?? 0; yearAcc.hF += b.last.output.fiber ?? 0; }
  for (const k of w.kingdoms) yearAcc.landTax += k.landGot ?? 0;
  // 소작농 묶음 충족률·부 (인구 가중, 하루 평균)
  { let n = 0, f = 0, wl = 0; for (const p of w.pops) if (p.prof === 'peasant') { n += p.size; f += p.size * p.fulfillment; wl += p.size * p.wealth100 / 100; }
    if (n > 0) { yearAcc.pFul += f / n; yearAcc.pW += wl / n; } }
  if (w.tick % 360 === 0) {
    const y = w.tick / 360;
    classInc[y] = classIncome(w);
    let cash = 0, n = 0;
    for (const p of w.pops) if (p.prof === 'peasant' && p.work !== 0) { cash += Math.max(0, p.incomeEma); n += p.size; }
    yearly[y] = {
      subG: +(yearAcc.subG / 360 / 1e4).toFixed(1), demG: +(yearAcc.demG / 360 / 1e4).toFixed(1),
      subT: +(yearAcc.subT / 360 / 1e4).toFixed(1), demT: +(yearAcc.demT / 360 / 1e4).toFixed(1),
      shG: +(yearAcc.subG / Math.max(1, yearAcc.hG)).toFixed(3), shT: +(yearAcc.subT / Math.max(1, yearAcc.hT)).toFixed(3), shF: +(yearAcc.subF / Math.max(1, yearAcc.hF)).toFixed(3),
      landTax: +(yearAcc.landTax / 360 / 1e3).toFixed(1),
      peasBuyG: +(yearAcc.pG / 360 / 1e3).toFixed(1),
      // 소작농이 산 의복·가구·목재·섬유 (천/일), 묶음 충족률, 부
      pbC: +(yearAcc.pC / 360 / 1e3).toFixed(1), pbFu: +(yearAcc.pFu / 360 / 1e3).toFixed(1), pbT: +(yearAcc.pT / 360 / 1e3).toFixed(1), pbFi: +(yearAcc.pFi / 360 / 1e3).toFixed(1),
      peasFul: +(yearAcc.pFul / 360).toFixed(2), peasW: +(yearAcc.pW / 360).toFixed(2),
      gSD: +((yearAcc.supU + yearAcc.supR) / Math.max(1, yearAcc.demU + yearAcc.demR)).toFixed(2),
      gSDu: +(yearAcc.supU / Math.max(1, yearAcc.demU)).toFixed(2), gSDr: +(yearAcc.supR / Math.max(1, yearAcc.demR)).toFixed(2),
      gPu: +(yearAcc.pU / 360).toFixed(2), gPr: +(yearAcc.pR / 360).toFixed(2), cashPeas: +(n > 0 ? cash / n : 0).toFixed(3),
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
    const g = { n: 0, job: 0, sol: 0, man: 0, an: 0, ajob: 0, sch: 0, adm: 0 };
    const typeOf = new Map(w.buildings.map((b) => [b.id, b.typeId] as const));
    const manors = new Set(w.buildings.filter((b) => b.typeId === 'manor').map((b) => b.id));
    for (const p of w.pops) {
      const wf = workforce(p);
      if (p.prof === 'gentry') { g.n += wf; g.sol += p.sol * wf; if (p.work === 0) g.job += wf; if (manors.has(p.work)) g.man += wf; const t = typeOf.get(p.work); if (t === 'school') g.sch += wf; if (t === 'admin') g.adm += wf; }
      if (p.prof === 'aristocrat') { g.an += wf; if (p.work === 0) g.ajob += wf; }
    }
    const f3 = (x: number) => +x.toFixed(3);
    gent[w.tick / 360] = { gJob: f3(g.job / Math.max(1, g.n)), aJob: f3(g.ajob / Math.max(1, g.an)), gSol: +(g.sol / Math.max(1, g.n)).toFixed(2), gMan: f3(g.man / Math.max(1, g.n)), gSch: Math.round(g.sch), gAdm: Math.round(g.adm), tut: w.buildings.filter((b) => b.methodId === 'school_tutor').reduce((a, b) => a + b.level, 0) };
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
  if (!Number.isInteger(y) || (y % 5 !== 0 && y !== years && y !== 2 && y !== 1)) continue;
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
    // 곡물 농장 레벨, 그중 적자 레벨
    farm: sum(m, (k) => k.levelsBy.farm ?? 0), farmLoss: sum(m, (k) => k.typeBy.farm?.lossLevels ?? 0),
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
    // 하층 일자리 직종별: 인구 비율, 생활수준, 고용 가중 임금, 실업률 (실업 노동 인구 / (고용 + 실업)). 농부가 없는 판에서는 0
    ...Object.fromEntries((['unskilled', 'farmer', 'skilled'] as const).flatMap((c) => {
      const lab = (k: MetricPoint['kingdoms'][number]) => (k.labor as Record<string, { wage: number; employed: number; jobless: number } | undefined>)[c];
      const n = sum(m, (k) => k.popBy[c] ?? 0), emp = sum(m, (k) => lab(k)?.employed ?? 0), idle = sum(m, (k) => lab(k)?.jobless ?? 0);
      return [[`${c}Pop`, +(n / pop).toFixed(3)], [`${c}Sol`, +(sum(m, (k) => (k.solBy[c] ?? 0) * (k.popBy[c] ?? 0)) / Math.max(1, n)).toFixed(2)],
        [`${c}Wage`, +(sum(m, (k) => (lab(k)?.wage ?? 0) * (lab(k)?.employed ?? 0)) / Math.max(1, emp)).toFixed(2)], [`${c}Idle`, +(idle / Math.max(1, emp + idle)).toFixed(3)]];
    })),
    farmLv: sum(m, (k) => (k.levelsBy.farm ?? 0) + (k.levelsBy.fiber_farm ?? 0) + (k.levelsBy.ranch ?? 0)),
    ...(edu[y] ?? {}),
    ...(gent[y] ?? {}),
    ...(inv[y] ?? {}),
    ...investInterval(w.metrics, (y - 5) * 360, y * 360),
  };
}
// 해마다 흐름 (cli/flowsum.py, trajchart.py): 인구, 소작농·노동자 SoL, 소작농 식량, 총생산, 레벨, 곡물값, 소작농 비율, 민간 현금(백만), 실업 비율
out.traj = w.metrics.filter((m) => m.tick % 360 === 0 && m.tick > 0).map((m) => {
  const pop = sum(m, (k) => k.pop), by = (c: 'peasant' | 'unskilled' | 'skilled', f: (k: MetricPoint['kingdoms'][number]) => number) =>
    +(sum(m, (k) => f(k) * k.popBy[c]) / Math.max(1, sum(m, (k) => k.popBy[c]))).toFixed(2);
  return {
    y: m.tick / 360, pop: +(pop / 1e6).toFixed(2), solPeas: by('peasant', (k) => k.solBy.peasant), solUnsk: by('unskilled', (k) => k.solBy.unskilled), solSk: by('skilled', (k) => k.solBy.skilled),
    foodPeas: by('peasant', (k) => k.foodBy.peasant), gdp: Math.round(sum(m, (k) => k.gdp) / 1e6), levels: sum(m, (k) => k.levelsState + k.levelsPrivate),
    grain: m.goods.grain.ratio, peas: +(sum(m, (k) => k.popBy.peasant) / pop).toFixed(2),
    privCash: Math.round(sum(m, (k) => k.privateCash) / 1e6),
    // 레벨 주인: privSh 민간 레벨 비율, lvMan·lvFin 저택·금융가가 가진 레벨, manCash·finCash 저택·금융가 금고 합(백만)
    privSh: +(sum(m, (k) => k.levelsPrivate) / Math.max(1, sum(m, (k) => k.levelsState + k.levelsPrivate))).toFixed(3),
    lvMan: sum(m, (k) => k.levelsManor ?? 0), lvFin: sum(m, (k) => k.levelsFinance ?? 0),
    manCash: +(sum(m, (k) => k.manorCash ?? 0) / 1e6).toFixed(1), finCash: +(sum(m, (k) => k.financeCash ?? 0) / 1e6).toFixed(1),
    jobless: +(sum(m, (k) => k.joblessShare * k.pop) / pop).toFixed(3),
    // 기술자 실업률: 기술자 실업 / (고용 + 실업)
    joblessSk: (() => {
      const lab = (k: MetricPoint['kingdoms'][number]) => (k.labor as Record<string, { employed: number; jobless: number } | undefined>).skilled;
      const emp = sum(m, (k) => lab(k)?.employed ?? 0), idle = sum(m, (k) => lab(k)?.jobless ?? 0);
      return +(idle / Math.max(1, emp + idle)).toFixed(3);
    })(),
    ...(classInc[m.tick / 360] ?? {}),
  };
});
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
