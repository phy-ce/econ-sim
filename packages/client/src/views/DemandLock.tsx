import {goodTechs,playerCompany} from '@econ/sim';
import type {GoodId,World} from '@econ/sim';
import {Lock} from 'lucide-react';
import {techName,useT} from '../i18n';
export function DemandLock({world,good,regionId}:{world:World;good:GoodId;regionId?:number}){
 const T=useT(),region=regionId===undefined?world.regions.find(r=>r.kingdomId===playerCompany(world)?.kingdomId):world.regions.find(r=>r.id===regionId);
 if(!region?.lockedGoods?.includes(good))return null;
 const help=goodTechs(good).map(techName).join(' / ');
 return <span className="demand-lock" tabIndex={0} aria-label={`${T.techNeeded}: ${help}`} data-help={help}><Lock size={14}/></span>;
}
