import { LAND_TYPES, landUsed } from '@econ/sim';
import type { Region, World } from '@econ/sim';
import { landName, useT } from '../i18n';
import { exactNumber, pct, compact } from '../format';
import { HelpText } from '../TooltipLayer';

function Ring({value,color,background='var(--rule)',label,center}:{value:number;color:string;background?:string;label:string;center:string}) {
 const share=Math.max(0,Math.min(1,value))*100;
 return <svg className="region-ring" viewBox="0 0 80 80" role="img" aria-label={label}>
  <circle cx="40" cy="40" r="30" fill="none" stroke={background} strokeWidth="8"/>
  <circle cx="40" cy="40" r="30" fill="none" stroke={color} strokeWidth="8" pathLength="100" strokeDasharray={`${share} ${100-share}`} transform="rotate(-90 40 40)"/>
  <text x="40" y="44" textAnchor="middle">{center}</text>
 </svg>;
}
export function RegionCircles({world,region,onBuildings}:{world:World;region:Region;onBuildings?:()=>void}) {
 const T=useT();
 const local=world.buildings.filter(b=>b.regionId===region.id);
 const royal=local.filter(b=>b.stateOwned).reduce((sum,b)=>sum+b.level,0);
 const total=local.reduce((sum,b)=>sum+b.level,0),privateLevels=total-royal;
 const ownerHelp=`${T.ownership} · ${T.ringLevels}\n${T.stateOwner}: ${exactNumber(royal)} (${pct(total?royal/total:0)})\n${T.privateOwner}: ${exactNumber(privateLevels)} (${pct(total?privateLevels/total:0)})\n${T.ringOpenBuildings}`;
 return <section className="region-circles"><h3><HelpText text={T.help.land}>{T.landUse}</HelpText></h3><div className="land-rings">
  {LAND_TYPES.filter(l=>region.land[l]>0).map(l=>{
   const used=landUsed(world,region.id,l),capacity=region.land[l],free=Math.max(0,capacity-used);
   const help=`${landName(l)}\n${T.ringUsed}: ${exactNumber(used)} / ${exactNumber(capacity)} (${pct(used/capacity)})\n${T.ringFree}: ${exactNumber(free)}\n${T.help.land}\n${T.ringOpenBuildings}`;
   return <button key={l} className="land-ring-item" data-help={help} onClick={onBuildings}>
    <Ring value={used/capacity} color={l==='arable'?'var(--good)':l==='plot'?'var(--accent)':'var(--gold)'} label={help} center={pct(used/capacity)}/>
    <strong>{landName(l)}</strong><small>{compact(used)} / {compact(capacity)}</small>
   </button>;
  })}
 </div><button className="ownership-ring-row" data-help={ownerHelp} onClick={onBuildings}>
  <Ring value={total?royal/total:0} color="var(--royal-owner)" background={total?'var(--private-owner)':'var(--rule)'} label={ownerHelp} center={compact(total)}/>
  <span><strong>{T.ownership}</strong><small>{T.ringLevels}</small></span>
  <span><i style={{background:'var(--royal-owner)'}}/>{T.stateOwner}<b>{compact(royal)}</b></span>
  <span><i style={{background:'var(--private-owner)'}}/>{T.privateOwner}<b>{compact(privateLevels)}</b></span>
 </button></section>;
}
