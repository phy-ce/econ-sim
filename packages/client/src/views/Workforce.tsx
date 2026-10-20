import { NumericValue } from '../NumericValue';
import { BUILDING_BY_ID, SKILLS, getMethod, paysDividend, peasantSlots, slots } from '@econ/sim';
import type { Building } from '@econ/sim';
import { Coins } from 'lucide-react';
import { Bar, CLASS_COLOR } from '../ui';
import { className, useT } from '../i18n';
import { compact } from '../format';

export function Workforce({ building: b }: { building: Building }) {
  const T = useT();
  const method = getMethod(b.typeId, b.methodId);
  const rows = b.typeId === 'subsistence'
    ? [{ id: 'peasant' as const, emp: b.tenants ?? 0, jobs: peasantSlots(b), dividend: false }]
    : SKILLS.filter(s => (method.workers[s] ?? 0) > 0).map(s => ({ id: s, emp: b.employed[s], jobs: slots(b, s), dividend: paysDividend(b.stateOwned, s) }));
  return <div className="workforce-list">{rows.map(r => <div key={r.id} className="workforce-row" data-help={T.help.workforce} tabIndex={0}>
    <span>{className(r.id)} {r.dividend && <span title={T.dividend} aria-label={T.dividend}><Coins size={13}/></span>}</span>
    <Bar value={r.jobs > 0 ? r.emp / r.jobs : 0} color={CLASS_COLOR[r.id]} vac label={className(r.id)}/>
    <b><NumericValue value={r.emp} format="compact"/>/<NumericValue value={r.jobs} format="compact"/></b>
  </div>)}</div>;
}
