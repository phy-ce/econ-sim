import type { GameEvent, World } from '@econ/sim';
export function eventDestination(world:World,event:GameEvent) {
  const building=event.buildingId===undefined?undefined:world.buildings.find(b=>b.id===event.buildingId);
  if(building) return {kind:'building' as const,id:building.id,regionId:building.regionId};
  if(event.regionId!==undefined&&world.regions.some(r=>r.id===event.regionId)) return {kind:'region' as const,id:event.regionId};
  if(/연구|기술/.test(event.text)) return {kind:'research' as const};
  if(/대출|빚|채무|이자|국채|재정|주조/.test(event.text)) return {kind:'finance' as const};
  if(event.companyId!==null&&world.companies.some(c=>c.id===event.companyId)) return {kind:'company' as const,id:event.companyId};
  return null;
}
