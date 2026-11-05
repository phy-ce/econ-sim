import {quakeAt,quakeLabel} from '@econ/sim';
import type {World} from '@econ/sim';
import {TriangleAlert} from 'lucide-react';
import {pct} from '../format';
import {useLang,useT} from '../i18n';
export function QuakeBadge({world,regionId}:{world:World;regionId:number}){
 const lang=useLang(),T=useT(),q=quakeAt(world,regionId);if(!q)return null;
 const label=quakeLabel(world,regionId,lang==='en')??undefined;
 return <span className="quake-badge" tabIndex={0} data-help={label} aria-label={label}><TriangleAlert size={14}/>−{pct(q.loss)} · {T.nDays(q.end-world.tick)}</span>;
}
