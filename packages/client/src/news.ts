import {playerCompany,type World,type GameEvent} from '@econ/sim';
export const eventKey=(event:GameEvent)=>JSON.stringify([event.tick,event.companyId,event.key??event.text]);
export const isPlayerResearchDone=(event:GameEvent)=>event.companyId===100&&event.topic==='researchDone';
export function ownNewsFilter(world:World){
 const player=playerCompany(world),id=player?.id??100;
 const companies=new Set(world.companies.filter(c=>player?.kingdomId!==undefined&&c.kingdomId===player.kingdomId).map(c=>c.id));
 return (event:GameEvent)=>event.companyId===null||event.companyId===id||companies.has(event.companyId);
}
export function unreadNewsCount(world:World,lastReadTick:number){
 const mine=ownNewsFilter(world);
 return world.events.filter(e=>e.tick>lastReadTick&&mine(e)).length;
}
