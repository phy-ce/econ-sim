import { useState } from 'react';
import { TECHS, researchableTechs, unlocksOf, getMethod, literacyOf } from '@econ/sim';
import type { World, Company } from '@econ/sim';
import type { Game } from '../useGame';
import { useT, techName, buildingName, methodName } from '../i18n';
import { NumericValue } from '../NumericValue';
import { Bar } from '../ui';
import { pct } from '../format';
const depths=new Map<string,number>();
function depth(id:string):number {if(depths.has(id))return depths.get(id)!;const t=TECHS.find(t=>t.id===id)!;const d=t.requires.length?1+Math.max(...t.requires.map(depth)):0;depths.set(id,d);return d;}
const ordered=[...TECHS].sort((a,b)=>depth(a.id)-depth(b.id));
const pos=new Map<string,{x:number;y:number}>();let treeRows=0;
for(const d of [...new Set(ordered.map(t=>depth(t.id)))]){const group=ordered.filter(t=>depth(t.id)===d);group.forEach((t,i)=>pos.set(t.id,{x:i%2*204,y:(treeRows+Math.floor(i/2))*116}));treeRows+=Math.ceil(group.length/2);}
export function ResearchPanel({world,game,me}:{world:World;game:Game;me:Company}) {
 const T=useT(),S=T.system,r=me.research,[selected,setSelected]=useState(r.current??TECHS[0].id);
 const tech=TECHS.find(t=>t.id===selected)!,u=unlocksOf(selected),options=researchableTechs(me);
 const pops=world.pops.filter(p=>world.regions.find(r=>r.id===p.regionId)?.kingdomId===me.kingdomId),n=pops.reduce((n,p)=>n+p.size,0),lit=n?pops.reduce((n,p)=>n+literacyOf(p)*p.size,0)/n:0;
 return <div className="system-panel"><div className="system-facts"><span>{S.weekPoints}<b><NumericValue value={r.points} format="one"/> pt</b></span><span>{S.literacy}<b>{pct(lit)}</b></span></div>
  <section className="research-selection"><h3>{techName(tech.id)}</h3><span><NumericValue value={tech.cost} format="compact"/> pt · {r.points>0?Math.ceil(Math.max(0,tech.cost-(r.progress[tech.id]??0))/r.points):'—'} {S.weeks}</span><Bar value={(r.progress[tech.id]??0)/tech.cost} label={T.progressOf(techName(tech.id))}/>
   <div className="system-tags">{u.buildings.map(id=><span key={id}>{buildingName(id)}</span>)}{u.methods.map(m=><span key={m.typeId+m.methodId} title={buildingName(m.typeId)}>{methodName(getMethod(m.typeId,m.methodId))}</span>)}{u.policies.map(id=><span key={id}>{S[id]}</span>)}</div>
   <button disabled={r.known.includes(tech.id)||(!options.includes(tech.id)&&r.current!==tech.id)} onClick={()=>game.command({type:'setResearch',techId:r.current===tech.id?null:tech.id})}>{r.known.includes(tech.id)?T.done:r.current===tech.id?T.stopResearch:T.research}</button>
  </section>
  <div className="research-tree" style={{height:treeRows*116}}><svg viewBox={`0 0 408 ${treeRows*116}`} aria-hidden="true">{ordered.flatMap(t=>t.requires.map(id=>{const a=pos.get(id)!,b=pos.get(t.id)!;return <path key={id+t.id} d={`M${a.x+94},${a.y+88}C${a.x+94},${a.y+108} ${b.x+94},${b.y-20} ${b.x+94},${b.y}`} fill="none" stroke="var(--gold)" strokeWidth="1.5"/>;}))}</svg>
   {ordered.map(t=>{const p=pos.get(t.id)!;return <button key={t.id} className={`research-node ${r.known.includes(t.id)?'known':''}`} style={{left:`${p.x/408*100}%`,top:p.y}} aria-pressed={selected===t.id} data-help={`${t.requires.map(techName).join(' → ')}\n${t.cost} pt`} onClick={()=>setSelected(t.id)}><strong>{techName(t.id)}</strong><small>{r.known.includes(t.id)?'✓':!options.includes(t.id)?'🔒':''} <NumericValue value={t.cost} format="compact"/> pt {r.current===t.id?'●':''}</small><Bar value={(r.progress[t.id]??0)/t.cost} label={T.progressOf(techName(t.id))}/></button>;})}
  </div>
 </div>;
}
