// 부지 사용(건물 종류별)과 건축사무소 충원: npx tsx cli/officeland.ts [seed] [years] ['<TUNE JSON>'] [type=land,...]
// 5년마다 대륙 합계 한 줄, 마지막에 비교용 JSON 한 줄 (시드 평균은 python 으로 모은다).
// type=land 로 건물의 땅을 바꿔 본다: builder=none (사무소도 땅 없음), admin=plot,school=plot (정부 건물 모두 부지)
import { createWorld, step, BUILDING_BY_ID, TUNE, getMethod, isGovernment, efficiency, companyById } from '../src/index';
import type { LandType } from '../src/index';

const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 20);
const over = JSON.parse(process.argv[4] ?? '{}');
const landOver = (process.argv[5] ?? '').split(',').filter(Boolean).map((s) => s.split('='));
Object.assign(TUNE, over);
for (const [t, l] of landOver) BUILDING_BY_ID[t].land = l === 'none' ? undefined : (l as LandType);
const w = createWorld(seed, { withPlayer: false });
const Y = 360;
const onPlot = (t: string) => BUILDING_BY_ID[t].land === 'plot' && !BUILDING_BY_ID[t].auto;
const kind = (t: string) => (t === 'builder' || t === 'admin' || t === 'school' ? t : isGovernment(t) ? 'gov' : 'factory');
const KINDS = ['builder', 'admin', 'school', 'factory'];
const win = (a: number, b: number) => (x: { t: number }) => x.t > a * Y && x.t <= b * Y;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const r2 = (x: number) => Math.round(x * 100) / 100;

type Sample = { t: number; plots: number; by: Record<string, number>; peak: number; over40: number; offLv: number; busyLv: number; busyStaff: number; idleLv: number; emp: number; cap: number; made: number; used: number };
const samples: Sample[] = [];
const prevLv = new Map<number, number>();
let demolished = 0;

function sample() {
  const by: Record<string, number> = Object.fromEntries(KINDS.map((k) => [k, 0]));
  const gov = new Map<number, number>();
  const add = (regionId: number, typeId: string, n: number) => {
    if (!onPlot(typeId)) return;
    const k = kind(typeId);
    by[k] = (by[k] ?? 0) + n;
    if (k !== 'factory') gov.set(regionId, (gov.get(regionId) ?? 0) + n);
  };
  for (const b of w.buildings) add(b.regionId, b.typeId, b.level);
  for (const k of w.constructions) add(k.regionId, k.typeId, k.levels ?? 1);
  let plots = 0, peak = 0, over40 = 0;
  for (const r of w.regions) {
    plots += r.land.plot;
    const s = r.land.plot ? (gov.get(r.id) ?? 0) / r.land.plot : 0;
    peak = Math.max(peak, s);
    if (s >= 0.4) over40++;
  }
  let offLv = 0, busyLv = 0, busyStaff = 0, idleLv = 0, emp = 0, cap = 0, made = 0, used = 0;
  const seen = new Set<number>();
  for (const b of w.buildings) {
    const m = getMethod(b.typeId, b.methodId);
    if (!m.construction) continue;
    seen.add(b.id);
    const p = prevLv.get(b.id);
    if (p != null && b.level < p) demolished += p - b.level;
    prevLv.set(b.id, b.level);
    offLv += b.level;
    emp += b.employed.unskilled + b.employed.skilled + b.employed.expert;
    if (b.idle) idleLv += b.level;
    else { busyLv += b.level; busyStaff += b.level * b.last.staffing; }
    if (b.active) cap += m.construction * b.level * b.utilization * efficiency(b);
  }
  for (const [id, p] of [...prevLv]) if (!seen.has(id)) { demolished += p; prevLv.delete(id); }
  for (const k of w.kingdoms) { const g = companyById(w, k.governmentId)!; made += g.buildPoints ?? 0; used += g.buildUsed ?? 0; }
  samples.push({ t: w.tick, plots, by, peak, over40, offLv, busyLv, busyStaff: busyLv ? busyStaff / busyLv : 1, idleLv, emp, cap, made, used });
}

const levelsAt = (t: number) => {
  const m = w.metrics.find((x) => x.tick === t);
  return m ? Object.values(m.kingdoms).reduce((a, k) => a + k.levelsState + k.levelsPrivate, 0) : NaN;
};
const peasAt = (t: number) => {
  const m = w.metrics.find((x) => x.tick === t);
  if (!m) return NaN;
  const ks = Object.values(m.kingdoms);
  return ks.reduce((a, k) => a + k.popBy.peasant, 0) / ks.reduce((a, k) => a + k.pop, 0);
};
const joblessAt = (t: number) => {
  const m = w.metrics.find((x) => x.tick === t);
  if (!m) return NaN;
  const ks = Object.values(m.kingdoms);
  return ks.reduce((a, k) => a + k.joblessShare * k.pop, 0) / ks.reduce((a, k) => a + k.pop, 0);
};
const pct = (x: number) => `${Math.round(x * 100)}%`;

for (let d = 1; d <= years * Y; d++) {
  step(w);
  if (d % 7 === 0 || d % (5 * Y) === 0) sample();
  if (d % (5 * Y) !== 0) continue;
  const s = samples[samples.length - 1];
  const share = KINDS.map((k) => `${k} ${pct(s.by[k] / s.plots)}`).join(' ');
  console.log(`y${d / Y} 부지 ${s.plots}: ${share} | 지역 최대 정부 ${pct(s.peak)} | 사무소 ${s.offLv}레벨 충원 ${s.busyStaff.toFixed(2)} 쉼 ${s.idleLv} 고용/레벨 ${Math.round(s.emp / Math.max(1, s.offLv))} | 레벨 ${levelsAt(d)} 소작농 ${peasAt(d).toFixed(2)}`);
}

// 비교용 요약: 정부 건물 부지 몫(3–10년, 10–20년 평균), 지역 최대, 40% 넘은 지역·표본 수(3년 이후), 일하는 사무소 충원(레벨 가중),
// 사무소 레벨·고용/레벨(5·10·20년), 헐린 사무소 레벨, 10–20년 하루 포인트(능력/생산/사용), 건물 레벨(5·10·20년, 10–20년 평균), 소작농·실업 몫
const gov = (s: Sample) => (s.by.builder + s.by.admin + s.by.school) / s.plots;
const at = (y: number) => samples.find((s) => s.t === y * Y)!;
const A = samples.filter(win(3, 10)), B = samples.filter(win(10, Math.max(10, years)));
const ys = [5, 10, 20].filter((y) => y <= years);
console.log(JSON.stringify({
  tune: over, land: process.argv[5] ?? '', seed,
  gov: [r2(mean(A.map(gov))), r2(mean(B.map(gov)))],
  office: [r2(mean(A.map((s) => s.by.builder / s.plots))), r2(mean(B.map((s) => s.by.builder / s.plots)))],
  peak: r2(Math.max(...samples.filter(win(3, years)).map((s) => s.peak))),
  over40: samples.filter(win(3, years)).reduce((a, s) => a + s.over40, 0),
  staff: [r2(mean(A.map((s) => s.busyStaff))), r2(mean(B.map((s) => s.busyStaff)))],
  idle: [r2(mean(A.map((s) => s.idleLv / Math.max(1, s.offLv)))), r2(mean(B.map((s) => s.idleLv / Math.max(1, s.offLv))))],
  offLv: ys.map((y) => at(y).offLv),
  empLv: ys.map((y) => Math.round(at(y).emp / Math.max(1, at(y).offLv))),
  demolished,
  pts: [Math.round(mean(B.map((s) => s.cap))), Math.round(mean(B.map((s) => s.made))), Math.round(mean(B.map((s) => s.used)))],
  levels: ys.map((y) => levelsAt(y * Y)),
  levelsAvg: Math.round(mean(w.metrics.filter((m) => win(10, years)({ t: m.tick })).map((m) => levelsAt(m.tick)))),
  factoryPlot: ys.map((y) => at(y).by.factory),
  peas: ys.map((y) => r2(peasAt(y * Y))),
  jobless: ys.map((y) => r2(joblessAt(y * Y))),
}));
