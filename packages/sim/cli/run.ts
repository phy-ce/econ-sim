// 헤드리스 장기 시뮬레이션: npm run sim:run -- --years 30 --seed 1 [--player] [--no-ai] [--out out/run.csv]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  CLASS_DEFS, GOOD_IDS, GOODS, POP_CLASSES, SKILLS, SKILL_DEFS, TECH_BY_ID, TICKS_PER_YEAR, colonyPopulation, colonyPrice, colonySol,
  createWorld, moneyIdentity, step, unemploymentRate,
} from '../src/index';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : fallback;
}

const years = Number(arg('years', '20'));
const seed = Number(arg('seed', '1'));
const withPlayer = process.argv.includes('--player');
const ai = !process.argv.includes('--no-ai');
const out = arg('out', `out/run-seed${seed}.csv`);

const w = createWorld(seed, { withPlayer, ai });
const money0 = moneyIdentity(w);
const t0 = performance.now();

const pad = (s: string | number, n: number) => String(s).padStart(n);
console.log(['년', ...SKILLS.map((s) => `${SKILL_DEFS[s].name} 인구/실업/SoL`), '건물Lv', '교육', ...GOOD_IDS.map((g) => GOODS[g].name)].join(' | '));

for (let y = 1; y <= years; y++) {
  for (let i = 0; i < TICKS_PER_YEAR; i++) step(w);
  const levels = w.buildings.reduce((a, b) => a + (b.active ? b.level : 0), 0);
  const edu = w.regions.reduce((a, r) => a + r.education, 0) / w.regions.length;
  console.log([
    pad(y, 3),
    ...SKILLS.map((s) => `${pad(Math.round(colonyPopulation(w, s)), 5)}/${pad((unemploymentRate(w, s) * 100).toFixed(0), 2)}%/${colonySol(w, s).toFixed(2)}`),
    pad(levels, 4), edu.toFixed(2),
    ...GOOD_IDS.map((g) => pad((colonyPrice(w, g) / GOODS[g].basePrice).toFixed(2), 4)),
  ].join(' | '));
}

const ms = performance.now() - t0;
console.log(`\n${years}년(${w.tick}틱) 완료: ${ms.toFixed(0)}ms, 틱당 ${(ms / w.tick).toFixed(3)}ms`);
console.log(`계층 생활수준: ${POP_CLASSES.map((s) => `${CLASS_DEFS[s].name} ${colonySol(w, s).toFixed(2)}`).join(', ')}`);
console.log(`화폐 총량 변화(왕국+해외): ${(moneyIdentity(w) - money0).toFixed(6)}, 해외 계정 ${w.offworld.balance.toFixed(0)}`);
console.log('가격은 지역 거래량 가중 평균의 기본가 대비 배율입니다.');
for (const c of w.companies) {
  const n = w.buildings.filter((b) => b.companyId === c.id).reduce((a, b) => a + b.level, 0);
  console.log(`  ${c.name}: 현금 ƒ${c.cash.toFixed(0)}, 빚 ƒ${c.debt.toFixed(0)}, 건물 레벨 ${n}, 기술 ${c.research.known.map((t) => TECH_BY_ID[t].name).join(', ') || '-'}`);
}
for (const r of w.regions) {
  const lv = w.buildings.filter((b) => b.regionId === r.id).reduce((a, b) => a + b.level, 0);
  console.log(`  [${r.name}] 인구 ${POP_CLASSES.map((s) => Math.round(r.households[s].population)).join('/')} 교육 ${r.education.toFixed(2)} 노동자SoL ${r.households.unskilled.sol.toFixed(2)} 건물Lv ${lv}`);
}

const header = ['tick', ...GOOD_IDS.map((g) => `price_${g}`), ...SKILLS.flatMap((s) => [`pop_${s}`, `unemp_${s}`, `sol_${s}`]), 'total_money'];
const rows = w.history.map((p) => {
  const avg = (g: (typeof GOOD_IDS)[number]) => Object.values(p.prices).reduce((a, m) => a + m[g], 0) / Object.keys(p.prices).length;
  return [p.tick, ...GOOD_IDS.map((g) => avg(g).toFixed(3)),
    ...SKILLS.flatMap((s) => [p.population[s].toFixed(1), p.unemployment[s].toFixed(4), p.sol[s].toFixed(3)]),
    p.totalMoney.toFixed(2)].join(',');
});
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, [header.join(','), ...rows].join('\n'));
console.log(`CSV: ${out}`);
