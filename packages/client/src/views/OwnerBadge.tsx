import type { Company, World } from '@econ/sim';
import { Crown, BriefcaseBusiness, Star } from 'lucide-react';
import { companyName, useT } from '../i18n';

export function OwnerBadge({ company, world }: { company?: Company; world: World }) {
  const T = useT();
  if (!company) return <span>—</span>;
  const kingdom = world.kingdoms.find(k => k.id === company.kingdomId);
  const Icon = company.state ? Crown : BriefcaseBusiness;
  const label = `${companyName(company)} · ${company.state ? T.stateOwner : T.privateOwner}${company.isPlayer ? ` · ${T.playerOwner}` : ''}`;
  return <span className={`owner-badge ${company.state ? 'royal' : 'private'} ${company.isPlayer ? 'player' : ''}`} style={{ borderInlineStartColor: kingdom?.color ?? company.color }} title={label} aria-label={label}>
    <Icon size={14} aria-hidden="true"/><span>{companyName(company)}</span>{company.isPlayer && <Star size={11} fill="currentColor" aria-hidden="true"/>}
  </span>;
}
