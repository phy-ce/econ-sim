// 국고가 왜 안 쓰이는지: 정부별 현금, 쓸 곳, 공사 수, 밀린 일수, 사무소, 고를 공사가 있는지, 땅 여유
import { BUILDING_TYPES, TICKS_PER_WEEK, constructionEstimate, createWorld, roomFor, step } from '../src/index';
import { pickProject } from '../src/ai';
import { committedCost, reserveOf, treasuryNeed } from '../src/finance';
import { marketOutlook } from '../src/outlook';
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 6);
const w = createWorld(seed, { withPlayer: false });
for (let d = 1; d <= 360 * years; d++) {
  step(w);
  if (d % 360 !== 0) continue;
  const o = marketOutlook(w);
  console.log(`--- year ${d / 360}`);
  for (const c of w.companies) {
    const est = constructionEstimate(w, c, 'farm');
    const ks = w.constructions.filter((k) => k.companyId === c.id);
    const backlog = ks.reduce((s, k) => s + (k.required - k.points), 0) / Math.max(1, est.pointsPerDay);
    const office = w.buildings.filter((b) => b.companyId === c.id && b.typeId === 'builder').reduce((s, b) => s + b.level, 0);
    const free = c.cash - reserveOf(w, c) - committedCost(w, c) - est.costPerDay * 30;
    const pick = free > 0 ? pickProject(w, c, o, free) : null;
    const room: string[] = [];
    for (const r of w.regions.filter((x) => x.kingdomId === c.kingdomId)) for (const t of BUILDING_TYPES) if (!t.auto && t.id !== 'builder') { const n = roomFor(w, r.id, t.id); if (n >= 1) room.push(`${r.id}:${t.id}${Math.floor(n)}`); }
    console.log(`${c.name} cash ${(c.cash / 1e6).toFixed(1)}M need ${(treasuryNeed(w, c) / 1e6).toFixed(1)}M free ${(free / 1e6).toFixed(1)}M | 공사 ${ks.length} 밀림 ${backlog.toFixed(0)}일 사무소 ${office}lv ${est.pointsPerDay.toFixed(0)}pt/d 레벨당 ${(est.cost / 1e3).toFixed(0)}k | 연구 ${c.research.current ?? '-'} ${c.research.budget.toFixed(0)}/d | 주간이익 ${(c.lastWeekProfit / 1e3).toFixed(0)}k`);
    console.log(`   pick ${pick ? `${pick.typeId} ${pick.levels}lv @${pick.regionId} roi ${pick.score.toFixed(2)}` : 'none'} | room ${room.slice(0, 14).join(' ')}`);
  }
}
void TICKS_PER_WEEK;
