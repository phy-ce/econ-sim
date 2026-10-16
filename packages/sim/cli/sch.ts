import { createWorld, step } from '../src';
const w = createWorld(2, { withPlayer: false });
for (const y of [3, 6, 10]) { while (w.tick < y * 360) step(w); console.log(`y${y} schools ${w.buildings.filter((b) => b.typeId === 'school').reduce((a, b) => a + b.level, 0)} edu ${w.regions.map((r) => Math.round(r.education * 100)).join('/')} grant ${w.grantRatio.toFixed(2)} printing ${w.companies.filter((c) => c.research.known.includes('printing')).length}`); }
