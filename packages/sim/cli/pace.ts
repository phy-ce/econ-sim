// 발전 속도: 해마다 소작농 비중, 노동자 실업, 왕국별 기술 수, 총생산, 물가
import { GOOD_IDS, GOODS, TECHS, createWorld, kingdomGdp, step } from '../src';
const seed = Number(process.argv[2] ?? 1), years = Number(process.argv[3] ?? 20);
const w = createWorld(seed, { withPlayer: false });
const t0 = Date.now();
const top = Math.max(...TECHS.map((t) => t.cost));
let tier4: number | null = null;
for (let y = 1; y <= years; y++) {
  while (w.tick < y * 360) step(w);
  let all = 0, peas = 0, lab = 0, idle = 0;
  for (const p of w.pops) { all += p.size; if (p.prof === 'peasant') peas += p.size; if (p.prof === 'unskilled') { lab += p.size; if (p.work === 0) idle += p.size; } }
  if (tier4 === null && w.companies.some((c) => c.research.known.some((id) => TECHS.find((t) => t.id === id)!.cost === top))) tier4 = y;
  const techs = w.kingdoms.map((k) => w.companies.find((c) => c.id === k.governmentId)!.research.known.length).join('/');
  const gdp = w.kingdoms.reduce((a, k) => a + kingdomGdp(w, k.id), 0);
  const px = GOOD_IDS.reduce((a, g) => a + w.regions.reduce((b, r) => b + r.market[g].price, 0) / w.regions.length / GOODS[g].basePrice, 0) / GOOD_IDS.length;
  console.log(`y${y} 소작농 ${(peas / all * 100).toFixed(0)}% 노동자 ${Math.round(lab / 1000)}k 실업 ${(idle / Math.max(1, lab) * 100).toFixed(0)}% 기술 ${techs} gdp ${(gdp / 1e6).toFixed(0)}M 물가 ${px.toFixed(2)} ${((Date.now() - t0) / w.tick).toFixed(1)}ms`);
}
console.log('첫 4단계 기술', tier4);
