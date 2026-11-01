import {buildingEcon,isGovernment,isOwnerBuilding,kingdomGdp} from '@econ/sim';
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
 for(const b of production){
  if(b.typeId==='subsistence'){parts.manor+=b.level;continue;}
  const owners=buildingEcon(world,b).owners;
  for(const o of owners)parts[o.owner==='state'?'royal':o.owner]+=o.levels;
  parts.unassigned+=Math.max(0,b.level-owners.reduce((n,o)=>n+o.levels,0));
 }
 return {kingdom,government,buildings,production,parts,levels,treasury:government?government.cash-government.debt:0,privateFunds:companies.filter(c=>!c.state).reduce((n,c)=>n+c.cash-c.debt,0),profit:production.filter(b=>!isGovernment(b.typeId)).reduce((n,b)=>n+b.profitEma*7,0),gdp:kingdomGdp(world,id),pool:kingdom.investmentPool};
}
