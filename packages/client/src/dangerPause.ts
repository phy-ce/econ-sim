import type {GameEvent} from '@econ/sim';
type Seen={tick:number;stopped:boolean};
export function dangerPause(events:Map<string,Seen>,event:GameEvent,canStop:boolean):boolean{
 const keyed=event as GameEvent&{key?:string};
 const key=keyed.key??`${event.companyId}|${event.buildingId??''}|${event.regionId??''}|${(event.textEn??event.text).replace(/[\d.,+−%-]+/g,'')}`;
 const previous=events.get(key),fresh=!previous||event.tick-previous.tick>35;
 const stop=canStop&&(fresh||!previous.stopped);
 events.set(key,{tick:event.tick,stopped:stop||(!fresh&&!!previous?.stopped)});
 for(const [id,s] of events)if(event.tick-s.tick>35)events.delete(id);
 return stop;
}
