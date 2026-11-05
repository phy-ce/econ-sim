import {useMemo} from 'react';
import {TUNE,companyById,isGovernment,paysShare,slots,subsistenceWage,wagesAt} from '@econ/sim';
import type {Building,PopClass,World} from '@econ/sim';
import {useT} from '../i18n';
import {exactNumber} from '../format';
import {NumericValue} from '../NumericValue';

export function workforceWageQuotes(world:World,buildings:Building[],skill:PopClass,tenant:Map<number,number>){
 return buildings.flatMap(b=>{
  const region=world.regions.find(r=>r.id===b.regionId),owner=companyById(world,b.companyId);
  if(!region||!owner)return [];
  if(skill==='peasant')return b.typeId==='subsistence'?[{id:b.id,pay:tenant.get(b.regionId)??0,market:undefined,step:undefined,premium:0,employed:b.tenants??0,jobs:b.tenants??0}]:[];
  if(paysShare(b,skill)||slots(b,skill)<=0&&b.employed[skill]<=0)return [];
  const state=owner.state&&isGovernment(b.typeId),kingdom=world.kingdoms.find(k=>k.id===owner.kingdomId);
  const premium=state?owner.statePremium?.[b.regionId]?.[skill]??0:owner.aiPremium?.[b.regionId]?.off[skill]??0;
  return [{id:b.id,pay:wagesAt(owner,b.typeId,world,b.regionId)[skill],market:region.wages?.[skill],step:state&&kingdom?TUNE.govWageLevels[kingdom.budget.wages-1]:undefined,premium,employed:b.employed[skill],jobs:slots(b,skill)}];
 });
}

export function WorkforceWage({world,buildings,skill}:{world:World;buildings:Building[];skill:PopClass}){
 const T=useT(),week=Math.floor(world.tick/7),regions=[...new Set(buildings.filter(b=>b.typeId==='subsistence').map(b=>b.regionId))];
 const tenant=useMemo(()=>new Map(regions.map(id=>[id,subsistenceWage(world,world.regions.find(r=>r.id===id)!)])),[world.seed,week,regions.join(',')]);
 const quotes=workforceWageQuotes(world,buildings,skill,tenant);
 if(!quotes.length)return <span className="workforce-wage" aria-label={T.wagePerHead}>—</span>;
 const employed=quotes.reduce((n,q)=>n+q.employed,0),jobs=quotes.reduce((n,q)=>n+q.jobs,0);
 const weight=(q:typeof quotes[number])=>employed?q.employed:jobs?q.jobs:1,total=employed||jobs||quotes.length;
 const average=quotes.reduce((n,q)=>n+q.pay*weight(q),0)/total,premium=quotes.reduce((n,q)=>n+q.premium*weight(q),0)/total;
 const formulas=quotes.map(q=>q.market===undefined?`${T.perHeadDay} ƒ${exactNumber(q.pay)}`:`${T.marketWage} ƒ${exactNumber(q.market)}${q.step===undefined?'':` × ${T.stage} ${exactNumber(q.step)}`}${q.premium>0?` × (1 + ${T.wagePremium} ${exactNumber(q.premium)})`:''}`);
 const low=Math.min(...quotes.map(q=>q.pay)),high=Math.max(...quotes.map(q=>q.pay));
 const formula=[T.wagePerHead,...new Set(formulas),...(quotes.length>1?[`${T.perHeadDay}: ƒ${exactNumber(low)} ~ ƒ${exactNumber(high)}`]:[])].join('\n');
 return <span className="workforce-wage" aria-label={T.wagePerHead}><NumericValue value={average} format="money" formula={formula}/>{premium>=.005&&<span className="wage-premium" tabIndex={0} data-help={`${T.wagePremium}: ${exactNumber(premium*100)}%`}>+{exactNumber(premium*100)}%</span>}</span>;
}
