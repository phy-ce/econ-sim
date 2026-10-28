import { buildingEcon, peasantSlots } from '@econ/sim';
import type { Building, World } from '@econ/sim';
type Econ=ReturnType<typeof buildingEcon>;
export function sumEcon(econs:Econ[],levels:number):Econ {
 const sum=(key:'profitWeek'|'reserve'|'reserveCap'|'reserveWeek'|'dividendsWeek'|'employed'|'jobs')=>econs.reduce((n,e)=>n+e[key],0);
 const day={sales:0,tax:0,fee:0,inputs:0,wages:0,profit:0};
 const owners=new Map<string,Econ['owners'][number]>(),ownerless:Record<number,number>={};
 for(const e of econs){
  for(const k of Object.keys(day) as (keyof typeof day)[])day[k]+=e.day[k];
  for(const o of e.owners){const key=o.owner==='state'?'state':`${o.owner}:${o.ownerBuildingId}`;const prev=owners.get(key);owners.set(key,{...o,levels:o.levels+(prev?.levels??0),dividendWeek:o.dividendWeek+(prev?.dividendWeek??0),share:0});}
  for(const [id,value] of Object.entries(e.ownerless))ownerless[Number(id)]=(ownerless[Number(id)]??0)+value;
 }
 const jobs=sum('jobs'),employed=sum('employed'),profitWeek=sum('profitWeek');
 return {day,margin:day.sales?day.profit/day.sales:null,profitWeek,profitWeekPerLevel:levels?profitWeek/levels:0,hasReserve:econs.some(e=>e.hasReserve),reserve:sum('reserve'),reserveCap:sum('reserveCap'),reserveWeek:sum('reserveWeek'),dividendsWeek:sum('dividendsWeek'),owners:[...owners.values()].map(o=>({...o,share:levels?o.levels/levels:0})),ownerless,jobs,employed,staffing:jobs?employed/jobs:0};
}
export function buildingGroups(world:World,regionId:number){
 const types=new Set([...world.buildings.filter(b=>b.regionId===regionId).map(b=>b.typeId),...world.constructions.filter(c=>c.regionId===regionId).map(c=>c.typeId)]);
 return [...types].map(typeId=>{
  const buildings=world.buildings.filter(b=>b.regionId===regionId&&b.typeId===typeId),projects=world.constructions.filter(c=>c.regionId===regionId&&c.typeId===typeId);
  return {typeId,buildings,projects,...summarizeBuildings(world,buildings)};
 });
}
export function summarizeBuildings(world:World,buildings:Building[]){
 const levels=buildings.reduce((n,b)=>n+b.level,0);
 return {levels,shrinking:buildings.reduce((n,b)=>n+(b.shrinking??0),0),utilization:levels?buildings.reduce((n,b)=>n+b.level*(b.active&&!b.idle?b.utilization:0),0)/levels:0,econ:sumEcon(buildings.map(b=>{const e=buildingEcon(world,b);if(b.typeId==='subsistence'){e.employed=b.tenants??0;e.jobs=peasantSlots(b);e.staffing=e.jobs?e.employed/e.jobs:0;}return e;}),levels)};
}
