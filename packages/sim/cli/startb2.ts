import { companyById, createWorld, regionById, step } from '../src/index';
const w = createWorld(1, { withPlayer: false });
for (let d = 1; d <= 360; d++) { step(w); if (d % 90) continue;
  console.log('d' + d);
  for (const b of w.buildings) if (['farm','lumber','mine'].includes(b.typeId)) { const c = companyById(w, b.companyId)!; const r = regionById(w, b.regionId);
    console.log(' ', r.name, b.typeId, 'staff', b.last.staffing.toFixed(2), 'rev', b.last.revenue.toFixed(0), 'wage', b.last.wageCost.toFixed(0), 'in', b.last.inputCost.toFixed(0), 'wages', JSON.stringify(c.wages), 'grain px', (r.market.grain.price/20).toFixed(2), 'unsk', w.pops.filter(p=>p.regionId===r.id&&p.prof==='unskilled').map(p=>`${p.work}:${p.size.toFixed(0)}`).join(','));
  }
}
