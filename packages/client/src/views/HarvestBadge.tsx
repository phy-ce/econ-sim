import { Sprite } from '../sprites';
import { BUILDING_BY_ID, harvestCondition, harvestLabel } from '@econ/sim';
import type { World } from '@econ/sim';
import { useLang, useT } from '../i18n';
import { pct } from '../format';
export function HarvestBadge({world,regionId,typeId}:{world:World;regionId:number;typeId?:string}) {
 const lang=useLang(),T=useT(),condition=harvestCondition(world,regionId);
 const label=harvestLabel(world,regionId,lang==='en');
 if(!condition||!label)return null;
 if(typeId){const land=BUILDING_BY_ID[typeId]?.land;if(!land||!condition.lands.includes(land))return null;}
 return <span className={`harvest-badge ${condition.kind}`} title={label}><Sprite name={condition.kind} size={18}/>{typeId?`${T.outputLoss} −${pct(condition.cut)}`:label}</span>;
}
