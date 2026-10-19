import { createWorld, step, wealthOf } from '../src/index';
import { needsAt } from '../src/data';
const w = createWorld(1, { withPlayer: false });
const show = () => { for (const p of w.pops) if (p.regionId === 1 && p.prof === 'peasant') console.log('tick', w.tick, 'work', p.work, 'size', p.size.toFixed(0), 'W', wealthOf(p).toFixed(2), 'food', p.food.toFixed(2), 'f', p.fulfillment.toFixed(2), 'inc', p.incomeEma.toFixed(0), 'sav', p.savings.toFixed(0), JSON.stringify(needsAt(wealthOf(p)))); };
show(); for (let d = 1; d <= 20; d++) step(w); show();
const r = w.regions[0]; for (const g of ['grain','fiber','timber','cloth','furniture'] as const) console.log(g, r.market[g].price, r.market[g].supplyEma.toFixed(0), r.market[g].demandEma.toFixed(0));
