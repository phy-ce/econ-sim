// 주민 수요 잠금 마이크로 점검 (src/lab/micro.ts, 2026-11-05): bash cli/fast.sh demandmicro.ts [seed] [years] [people] [openDay]
// 1) 기술을 열기 전 주민 수요가 0 인지, 2) 연 다음 날 pop 하나하나의 필요 합계가 그대로이고 몫만 옮겨 가는지,
// 3) 해마다 운송·종이·정밀 기기와 철 사슬의 공급·수요·값·건물 레벨을 표로 본다. 판정은 표로 하고 종료 코드는 늘 0.
import { GATED_GOODS, GOODS, TICKS_PER_YEAR, goodTechs, needsAt, overrideTune } from '../src/data';
import { step } from '../src/index';
import { createMicroWorld } from '../src/lab/micro';
import { wealthOf } from '../src/types';
import type { GoodId, World } from '../src/types';

if (process.env.TUNE) overrideTune(JSON.parse(process.env.TUNE), 'cli/demandmicro');
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 10), people = Number(process.argv[4] ?? 2000), openDay = Number(process.argv[5] ?? 360);
const typeScale = { workshop: 0.15, textile: 0.25, fiber_farm: 0.25, paper_mill: 0.1, railway: 0.25, fab: 0.05, smelter: 0.1, mine: 0.1, coal_mine: 0.25, furniture: 0.25, ...(JSON.parse(process.env.TS ?? '{}') as Record<string, number>) };
const w: World = createMicroWorld({ seed, people: [people], typeScale, tier: Number(process.env.TIER ?? 1), plot: 30 });
// 사슬 끝까지 보려고 광맥을 준다 (마이크로 지역에는 찾은 광맥이 없을 수 있다)
for (const r of w.regions) { r.deposits.iron = Math.max(r.deposits.iron, 10); r.deposits.coal = Math.max(r.deposits.coal, 10); r.land.ore = r.deposits.iron + r.deposits.coal; }
const WATCH: GoodId[] = [...GATED_GOODS, 'furniture', 'metal', 'ore', 'tools'];
const LV = ['railway', 'paper_mill', 'fab', 'smelter', 'mine', 'furniture', 'workshop'];
const house = (g: GoodId) => w.regions.reduce((a, r) => a + Object.entries(r.market[g].demandBy ?? {}).reduce((x, [k, v]) => x + (k.startsWith('pop:') ? v : 0), 0), 0);
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
const line = (y: number) => {
  const cells = WATCH.map((g) => { const m = w.regions[0].market[g]; return `${g} S${m.supplyEma.toFixed(1)} D${m.demandEma.toFixed(1)} H${house(g).toFixed(1)} p${(m.price / GOODS[g].basePrice).toFixed(2)}`; });
  const lv = LV.map((t) => `${t} ${w.buildings.filter((b) => b.typeId === t).reduce((a, b) => a + b.level, 0)}`);
  const size = w.pops.reduce((a, p) => a + p.size, 0);
  console.log(`y${y} pop ${Math.round(size)} W ${(w.pops.reduce((a, p) => a + p.size * p.wealth, 0) / size).toFixed(2)} locked [${w.regions[0].lockedGoods}]`);
  console.log('   ' + cells.join(' | '));
  console.log('   ' + lv.join(', '));
};
console.log('gated', GATED_GOODS.map((g) => `${g}<${goodTechs(g)}`).join(' '));
let leak = 0;
for (let d = 1; d <= years * TICKS_PER_YEAR; d++) {
  if (d === openDay) {
    const locked0 = w.regions[0].lockedGoods;
    const pops0 = [...w.pops];
    for (const c of w.companies) for (const g of GATED_GOODS) for (const t of goodTechs(g)) if (!c.research.known.includes(t)) c.research.known.push(t);
    step(w);
    console.log(`-- 기술을 연 날 d${d}: 수요가 샌 날 ${leak}, 주민 수요 ${GATED_GOODS.map((g) => `${g} ${house(g).toFixed(2)}`).join(' ')}`);
    for (const p of pops0) {
      const L = wealthOf(p), n = needsAt(L, locked0), after = needsAt(L, w.regions[0].lockedGoods);
      const rows = (['travel', 'fine_instruments', 'household', 'fine_furniture'] as const).map((k) => `${k} ${n[k].toFixed(3)}>${after[k].toFixed(3)}`).join(' ');
      const totalNow = sum(after);
      console.log(`  ${p.prof} n${p.size.toFixed(1)} W${p.wealth.toFixed(2)} 합 ${sum(n).toFixed(3)}>${totalNow.toFixed(3)} ${rows}`);
    }
    continue;
  }
  step(w);
  if (d < openDay) leak += GATED_GOODS.some((g) => w.regions[0].lockedGoods.includes(g) && house(g) > 0) ? 1 : 0;
  if (d % TICKS_PER_YEAR === 0) line(d / TICKS_PER_YEAR);
}
