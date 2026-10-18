import { companyById, createWorld, step } from '../src/index';
import { LEDGER_KEYS } from '../src/types';
const w = createWorld(1, { withPlayer: false });
for (let d = 1; d <= 720; d++) step(w);
for (const k of w.kingdoms) {
  const c = companyById(w, k.privateIds[0])!;
  console.log(k.nameEn, 'cash', (c.cash / 1e6).toFixed(1), 'debt', (c.debt / 1e6).toFixed(1), LEDGER_KEYS.map((x) => `${x} ${((c.lastLedger as any)[x] / 1e3).toFixed(0)}k`).join(' '));
  const caps = w.pops.filter((p) => p.prof === 'capitalist' && w.regions.find((r) => r.id === p.regionId)!.kingdomId === k.id);
  console.log('  capitalists', caps.map((p) => `${p.work}:${p.size.toFixed(0)} inc${(p.incomeEma / p.size).toFixed(2)} sav${(p.savings / p.size).toFixed(0)}`).join(' '), 'pool', (k.investmentPool / 1e6).toFixed(1));
}
