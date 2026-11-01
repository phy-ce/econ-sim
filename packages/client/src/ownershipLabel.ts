import {buildingEcon,isOwnerBuilding} from '@econ/sim';
import type {Building,World} from '@econ/sim';
import {buildingName,t} from './i18n';

/** Compact building ownership label; company names are not ownership categories. */
export function ownershipLabel(world:World,b:Building){
 const T=t();
 if(isOwnerBuilding(b.typeId))return buildingName(b.typeId);
 if(b.typeId==='subsistence')return T.system.manor;
 const owners=buildingEcon(world,b).owners,names={state:T.stateOwner,manor:T.system.manor,finance:T.system.finance};
 return (['state','manor','finance'] as const).filter(kind=>owners.some(o=>o.owner===kind&&o.levels>0)).map(kind=>names[kind]).join(' · ')||T.system.none;
}
