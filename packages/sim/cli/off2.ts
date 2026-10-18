import { createWorld, step } from '../src/index';
const w = createWorld(1, { withPlayer: false });
for (let d = 1; d <= 20; d++) { step(w); }
for (const b of w.buildings) if (b.typeId === 'builder') console.log(b.regionId, 'idle', b.idle, 'crew', b.crew, 'staff', b.last.staffing, 'fill', b.last.inputFill, 'pts', b.last.points, 'stock', JSON.stringify(b.stock), 'eff', b.exp);
const r = w.regions[0]; console.log('timber', JSON.stringify({ p: r.market.timber.price, s: r.market.timber.supplyEma, d: r.market.timber.demandEma }));
