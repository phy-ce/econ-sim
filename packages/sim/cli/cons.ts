import { companyById, createWorld, step } from '../src/index';
const w = createWorld(1, { withPlayer: false });
for (let d = 1; d <= 300; d++) { step(w); if (d % 60) continue;
  console.log('d' + d, w.constructions.map((k) => `${companyById(w, k.companyId)!.name}:${k.typeId}x${k.levels ?? 1} ${k.points}/${k.required} spent ${k.spent}`).join(' | '));
  for (const c of w.companies) if (c.buildPoints > 0) console.log('  ', c.name, 'pts', c.buildPoints, 'cost', c.buildCost.toFixed(0));
}
