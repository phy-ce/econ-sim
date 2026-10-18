import { createWorld, step } from '../src/index';
const t = Date.now();
const w = createWorld(1, { withPlayer: false });
console.log('create ms', Date.now() - t);
for (let y = 0; y < 2; y++) { const t0 = Date.now(); for (let d = 0; d < 360; d++) step(w); console.log('year', y + 1, 'ms', Date.now() - t0, 'pops', w.pops.length, 'bld', w.buildings.length); }
