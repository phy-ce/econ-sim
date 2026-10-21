// 회수 기간 점검: npx tsx cli/payback.ts '<TUNE JSON>' [seed] [years]   (years 0 = 설계 표만)
// 1. 설계: 방식마다 기본가·기본 임금의 하루 이익(레벨당), 1레벨 공사비 = 공사 포인트(buildPointsOf) × 사무소 방식의 포인트당 비용(기본가·기본 임금),
//    회수 기간(년) = 공사비 ÷ (하루 이익 × 360). 왕실은 자기 사무소 비용을, 민간은 같은 포인트당 비용을 수수료로 내므로 기본가에서는 둘이 같다.
// 2. 실제 (seed, years): 방식마다 레벨·일 평균 이익(세전, 세후), 실제 1레벨 공사비(끝난 공사의 spent ÷ 레벨, 건물 종류별),
//    회수 기간 = 실제 공사비 ÷ (실제 세후 이익 × 360). 해마다 왕실 사무소의 실제 포인트당 비용도 낸다.
import { BUILDING_BY_ID, BUILDING_TYPES, GOODS, SKILL_DEFS, TICKS_PER_YEAR, TUNE, buildPointsOf } from '../src/data';
import { createWorld, step } from '../src/index';
import type { GoodId, MethodDef, Skill } from '../src/types';

Object.assign(TUNE, JSON.parse(process.argv[2] ?? '{}'));
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 10);
const sum = <K extends string>(o: Partial<Record<K, number>>, f: (k: K, n: number) => number) => (Object.entries(o) as [K, number][]).reduce((a, [k, n]) => a + f(k, n), 0);
const wageOf = (m: MethodDef) => sum(m.workers as Record<Skill, number>, (s, n) => n * SKILL_DEFS[s].baseWage);
const inputOf = (m: MethodDef) => sum(m.inputs as Record<GoodId, number>, (g, q) => q * GOODS[g].basePrice);
const revOf = (m: MethodDef) => sum(m.outputs as Record<GoodId, number>, (g, q) => q * GOODS[g].basePrice);
const offices = BUILDING_BY_ID.builder.methods.map((m) => ({ id: m.id, perPoint: (wageOf(m) + inputOf(m)) / m.construction! }));

console.log(`buildCostMult ${TUNE.buildCostMult}; 포인트당 비용(기본가): ${offices.map((o) => `${o.id} ${o.perPoint.toFixed(0)}`).join(', ')}`);
console.log('설계 | 건물/방식 | 포인트 | 하루 이익 | 1레벨 공사비 (목조/비계/철골) | 회수 년 (목조/비계/철골)');
const design = new Map<string, number>();
for (const t of BUILDING_TYPES) {
  if (t.auto || t.stateOnly || t.id === 'builder') continue;
  const pts = buildPointsOf(t.id);
  for (const m of t.methods) {
    const p = revOf(m) - wageOf(m) - inputOf(m);
    const costs = offices.map((o) => pts * o.perPoint);
    design.set(`${t.id}/${m.id}`, costs[0] / (p * 360));
    console.log(`설계 | ${t.id}/${m.id} | ${pts} | ${p} | ${costs.map((c) => c.toFixed(0)).join(' / ')} | ${costs.map((c) => (c / (p * 360)).toFixed(2)).join(' / ')}`);
  }
}
if (years <= 0) process.exit(0);

const w = createWorld(seed, { withPlayer: false });
const acc = new Map<string, { pre: number; post: number; lv: number }>();
const built = new Map<string, { spent: number; levels: number; days: number; n: number }>();
const live = new Map<number, { typeId: string; spent: number; levels: number; days: number }>();
const crownIds = new Set(w.kingdoms.map((k) => k.governmentId));
for (let y = 1; y <= years; y++) {
  let yc = 0, yp = 0;
  for (let d = 0; d < TICKS_PER_YEAR; d++) {
    step(w);
    for (const b of w.buildings) {
      const t = BUILDING_BY_ID[b.typeId];
      if (t.auto || t.stateOnly || t.id === 'builder' || b.level <= 0) continue;
      const key = `${b.typeId}/${b.methodId}`;
      const a = acc.get(key) ?? { pre: 0, post: 0, lv: 0 };
      const pre = b.last.revenue - b.last.inputCost - b.last.wageCost;
      a.pre += pre; a.post += pre - (b.last.tax ?? 0); a.lv += b.level;
      acc.set(key, a);
    }
    for (const c of w.companies) if (crownIds.has(c.id) && c.buildPoints > 0) { yc += c.buildCost; yp += c.buildPoints; }
    const seen = new Set<number>();
    for (const k of w.constructions) { seen.add(k.id); live.set(k.id, { typeId: k.typeId, spent: k.spent, levels: k.levels ?? 1, days: k.ticksElapsed }); }
    for (const [id, k] of live) if (!seen.has(id)) {
      live.delete(id);
      const b = built.get(k.typeId) ?? { spent: 0, levels: 0, days: 0, n: 0 };
      b.spent += k.spent; b.levels += k.levels; b.days += k.days; b.n += 1;
      built.set(k.typeId, b);
    }
  }
  console.log(`year ${y} | 왕실 사무소 포인트당 실제 비용 ${yp > 0 ? (yc / yp).toFixed(0) : '-'}`);
}
console.log('실제 | 건물/방식 | 평균 레벨 | 하루 이익 세전 | 세후 | 1레벨 실제 공사비 | 공사 일수 | 회수 년 (실제) | 회수 년 (설계, 목조)');
for (const [key, a] of [...acc].sort()) {
  const typeId = key.split('/')[0];
  const b = built.get(typeId);
  const cost = b && b.levels > 0 ? b.spent / b.levels : NaN;
  const post = a.post / a.lv;
  const pay = post > 0 && Number.isFinite(cost) ? (cost / (post * 360)).toFixed(2) : '-';
  console.log(`실제 | ${key} | ${(a.lv / (years * TICKS_PER_YEAR)).toFixed(1)} | ${(a.pre / a.lv).toFixed(0)} | ${post.toFixed(0)} | ${Number.isFinite(cost) ? cost.toFixed(0) : '-'} | ${b ? (b.days / b.n).toFixed(0) : '-'} | ${pay} | ${(design.get(key) ?? NaN).toFixed(2)}`);
}
