import {buildingEcon,isGovernment,isOwnerBuilding,kingdomGdp,regionPopulation,SKILLS,slots,peasantSlots} from '@econ/sim';
import type {World} from '@econ/sim';
export function kingdomStats(world:World,id:number){
 const kingdom=world.kingdoms.find(k=>k.id===id)!;
 const regions=new Set(world.regions.filter(r=>r.kingdomId===id).map(r=>r.id));
 const buildings=world.buildings.filter(b=>regions.has(b.regionId));
 const government=world.companies.find(c=>c.id===kingdom.governmentId);
 const companies=world.companies.filter(c=>c.kingdomId===id);
 const production=buildings.filter(b=>!isOwnerBuilding(b.typeId));
 const levels=production.reduce((n,b)=>n+b.level,0);
 const parts={royal:0,manor:0,finance:0,unassigned:0};
 const employment={...parts},profits={...parts};
 let employed=0,jobs=0;
 for(const b of buildings){
  const emp=b.typeId==='subsistence'?(b.tenants??0):SKILLS.reduce((n,s)=>n+Math.min(b.employed[s],slots(b,s)),0);
  const capacity=b.typeId==='subsistence'?peasantSlots(b):SKILLS.reduce((n,s)=>n+slots(b,s),0);
  employed+=emp;jobs+=capacity;
  if(isOwnerBuilding(b.typeId)){employment[b.typeId==='manor'?'manor':'finance']+=emp;continue;}
  const owners=b.typeId==='subsistence'?[{owner:'manor' as const,levels:b.level}]:buildingEcon(world,b).owners;
  const profit=isGovernment(b.typeId)?0:b.profitEma*7;
  for(const o of owners){const key=o.owner==='state'?'royal':o.owner;const share=b.level>0?o.levels/b.level:0;employment[key]+=emp*share;profits[key]+=profit*share;}
  const remainder=b.level>0?Math.max(0,1-owners.reduce((n,o)=>n+o.levels,0)/b.level):0;
  employment.unassigned+=emp*remainder;profits.unassigned+=profit*remainder;
 }
 for(const b of production){
  if(b.typeId==='subsistence'){parts.manor+=b.level;continue;}
  const owners=buildingEcon(world,b).owners;
  for(const o of owners)parts[o.owner==='state'?'royal':o.owner]+=o.levels;
  parts.unassigned+=Math.max(0,b.level-owners.reduce((n,o)=>n+o.levels,0));
 }
 return {kingdom,government,buildings,production,parts,employment,profits,employed,jobs,population:world.regions.filter(r=>regions.has(r.id)).reduce((n,r)=>n+regionPopulation(r),0),levels,treasury:government?government.cash-government.debt:0,privateFunds:companies.filter(c=>!c.state).reduce((n,c)=>n+c.cash-c.debt,0),profit:production.filter(b=>!isGovernment(b.typeId)).reduce((n,b)=>n+b.profitEma*7,0),gdp:kingdomGdp(world,id),pool:kingdom.investmentPool};
}
