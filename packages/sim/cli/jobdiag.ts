// 일자리 진단: npx tsx cli/jobdiag.ts '<TUNE JSON>' [seed] [years]
// 지역별: 직종별 실업 노동 인구, 빈 일자리, 남은 땅(경작지·산림·부지), 공사 대기, 그 왕국 민간 현금
import { BUILDING_BY_ID, TUNE } from '../src/data';
import { createWorld, step } from '../src/index';
import { landFree, slots, companyById } from '../src/economy';
import { workforce } from '../src/pops';

const over = JSON.parse(process.argv[2] ?? '{}');
const seed = Number(process.argv[3] ?? 1), years = Number(process.argv[4] ?? 20);
Object.assign(TUNE, over);
const w = createWorld(seed, { withPlayer: false });
const at = new Set([1800, 3600, 5040, 7200].filter((d) => d <= years * 360));
const k0 = (x: number) => (x / 1000).toFixed(0);
const report = () => {
  console.log(`\n=== ${w.tick / 360}년 (단위 천 명, 땅은 칸)`);
  console.log('지역(왕국) | 실업 소작/노동/기술 | 빈자리 노동/기술 | 남은땅 경작/산림/부지 (전체) | 소작 노동인구/소작지 수용 | 공사 수 | 민간 현금(만)');
  for (const k of w.kingdoms) {
    const firm = companyById(w, k.privateIds[0]);
    for (const r of w.regions.filter((x) => x.kingdomId === k.id)) {
      const pops = w.pops.filter((p) => p.regionId === r.id);
      const idle = (s: string) => pops.filter((p) => p.prof === s && p.work === 0).reduce((a, p) => a + workforce(p), 0);
      const bs = w.buildings.filter((b) => b.regionId === r.id && !BUILDING_BY_ID[b.typeId].auto);
      const open = (s: 'unskilled' | 'skilled') => bs.reduce((a, b) => a + Math.max(0, slots(b, s) - b.employed[s]), 0);
      const peasWork = pops.filter((p) => p.prof === 'peasant' && p.work !== 0).reduce((a, p) => a + workforce(p), 0);
      const sub = w.buildings.filter((b) => b.regionId === r.id && BUILDING_BY_ID[b.typeId].auto).reduce((a, b) => a + b.level, 0);
      const q = w.constructions.filter((c) => c.regionId === r.id).length;
      console.log(`${r.name}(${k.id}) | ${k0(idle('peasant'))}/${k0(idle('unskilled'))}/${k0(idle('skilled'))} | ${k0(open('unskilled'))}/${k0(open('skilled'))} | ${landFree(w, r.id, 'arable')}/${landFree(w, r.id, 'forest')}/${landFree(w, r.id, 'plot')} (${r.land.arable}/${r.land.forest}/${r.land.plot}) | ${k0(peasWork)}/${sub} | ${q} | ${firm ? (firm.cash / 1e4).toFixed(0) : '-'}`);
    }
  }
};
for (let d = 1; d <= years * 360; d++) { step(w); if (at.has(w.tick)) report(); }
