import {t as uiCopy} from '../i18n';
import {Check,Lock, Circle, CircleDot} from 'lucide-react';
import {useRef,useState,useEffect} from 'react';
import {useNavigationState} from '../NavigationHistory';
import {researchLayout} from '../researchLayout';
import {TECHS,researchableTechs,unlocksOf,getMethod,literacyOf} from '@econ/sim';
import type {World,Company} from '@econ/sim';
import type {Game} from '../useGame';
import {useT,useLang,techName,buildingName,methodName} from '../i18n';
import {NumericValue} from '../NumericValue';
import {Bar} from '../ui';
import {pct,compact} from '../format';
import {DetailWindow} from './DetailWindow';
const layout=researchLayout(TECHS);
export function ResearchPanel({world,game,me,request}:{world:World;game:Game;me:Company;request?:{id:string;sequence:number}|null}){
 const T=useT(),ko=useLang()==='ko',S=T.system,r=me.research,options=researchableTechs(me);
 const requested=TECHS.some(t=>t.id===request?.id)?request?.id:undefined;
 const [selected,setSelected]=useNavigationState('views/ResearchPanel.tsx:selected',requested??r.current??options[0]??TECHS[0].id);
 const [filter,setFilter]=useNavigationState<'available'|'locked'|'known'|'all'>('research:filter',requested?'all':'available');
 const [query,setQuery]=useState('');
 useEffect(()=>{if(requested){setSelected(requested);setFilter('all');setQuery('');}},[requested,request?.sequence]);
 const tech=TECHS.find(t=>t.id===selected)??TECHS[0],unlocks=unlocksOf(tech.id);
 const status=(id:string)=>r.known.includes(id)?'known':r.current===id?'current':options.includes(id)?'available':'locked';
 const labels={known:uiCopy().screenText['known'],current:uiCopy().screenText['researching'],available:uiCopy().screenText['available210'],locked:uiCopy().screenText['locked']};
 const symbols={known:'✓',current:'◉',available:'○',locked:'◇'};
 const remaining=(id:string)=>{const t=TECHS.find(t=>t.id===id)!;return r.points>0?Math.ceil(Math.max(0,t.cost-(r.progress[id]??0))/r.points):null;};
 const hint=(id:string)=>{const u=unlocksOf(id);return [...new Set([...u.methods.map(m=>`${buildingName(m.typeId)} · ${methodName(getMethod(m.typeId,m.methodId))}`),...u.buildings.map(buildingName),...u.policies.map(id=>S[id])])].join('\n');};
 const rows=TECHS.filter(t=>(filter==='all'||(filter==='available'?(status(t.id)==='available'||status(t.id)==='current'):status(t.id)===filter))&&techName(t.id).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 const pops=world.pops.filter(p=>world.regions.find(x=>x.id===p.regionId)?.kingdomId===me.kingdomId),n=pops.reduce((sum,p)=>sum+p.size,0),lit=n?pops.reduce((sum,p)=>sum+p.size*literacyOf(p),0)/n:0;
 const detail=<section className="research-dossier" aria-label={uiCopy().screenText['selectedTechnology']}>
  <header><div><small>{labels[status(tech.id)]}</small><h3>{techName(tech.id)}</h3></div><strong><NumericValue value={tech.cost} format="compact"/> pt</strong></header>
  <div className="research-progress"><Bar value={(r.progress[tech.id]??0)/tech.cost} label={T.progressOf(techName(tech.id))}/><span>{r.known.includes(tech.id)?'✓':remaining(tech.id)===null?'—':`${remaining(tech.id)} ${S.weeks}`}</span></div>
  {tech.requires.length>0&&<div className="research-requires"><small>{uiCopy().screenText['prerequisites']}</small>{tech.requires.map(id=><button key={id} className="entity-link" data-help={hint(id)} onClick={()=>setSelected(id)}>{symbols[status(id)]} {techName(id)} ↗</button>)}</div>}
  <div className="research-unlocks"><small>{uiCopy().screenText['unlocks']}</small>{unlocks.buildings.map(id=><div key={id}><span>{uiCopy().screenText['building']}</span><strong>{buildingName(id)}</strong></div>)}{unlocks.methods.map(m=><div key={m.typeId+m.methodId} data-help={`${buildingName(m.typeId)} · ${methodName(getMethod(m.typeId,m.methodId))}`} tabIndex={0}><span>{buildingName(m.typeId)}</span><strong>{methodName(getMethod(m.typeId,m.methodId))}</strong></div>)}{unlocks.policies.map(id=><div key={id}><span>{uiCopy().screenText['policy']}</span><strong>{S[id]}</strong></div>)}{!unlocks.buildings.length&&!unlocks.methods.length&&!unlocks.policies.length&&<span>—</span>}</div>
  <button className="research-action" disabled={status(tech.id)==='known'||status(tech.id)==='locked'} data-help={status(tech.id)==='locked'?(uiCopy().screenText['completeTheMissingPrerequisitesFirst']):hint(tech.id)} onClick={()=>game.command({type:'setResearch',techId:r.current===tech.id?null:tech.id})}>{status(tech.id)==='known'?T.done:status(tech.id)==='locked'?(uiCopy().screenText['prerequisitesRequired']):r.current===tech.id?T.stopResearch:T.research}</button>
 </section>;
 return <div className="research-hub">
  <section className="research-current"><div className="research-kpis"><span data-help={uiCopy().screenText['researchPointsEarnedEachWeek']} tabIndex={0}>{S.weekPoints} <b><NumericValue value={r.points} format="one"/> pt</b></span><span>{S.literacy} <b>{pct(lit)}</b></span><span>{labels.known} <b>{r.known.length}/{TECHS.length}</b></span></div>
  <button className="research-current-link" onClick={()=>{if(r.current)setSelected(r.current);}} disabled={!r.current}><small>{uiCopy().screenText['currentResearch']}</small><strong>{r.current?techName(r.current):(uiCopy().screenText['chooseATechnology'])}</strong>{r.current&&<span>↗</span>}</button>
  {r.current&&<Bar value={(r.progress[r.current]??0)/TECHS.find(t=>t.id===r.current)!.cost} label={T.progressOf(techName(r.current))}/>}</section>
  <DetailWindow title={uiCopy().screenText['researchTree']} summary={`${TECHS.length}`} help={uiCopy().screenText['explorePrerequisitesInALargerWindowDrag']}><div className="research-atlas"><ResearchAtlas selected={tech.id} onSelect={setSelected} status={status} hint={hint} labels={labels}/>{detail}</div></DetailWindow>
  <nav className="research-filters" aria-label={uiCopy().screenText['technologyStatus']}>{(['available','locked','known','all'] as const).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='all'?(uiCopy().screenText['all']):labels[f]}</button>)}</nav>
  <input className="research-search" aria-label={uiCopy().screenText['searchTechnologies']} placeholder={uiCopy().screenText['searchTechnologies225']} value={query} onChange={e=>setQuery(e.target.value)}/>
  <div className="research-catalog">{rows.map(t=><button key={t.id} className={`research-row state-${status(t.id)}`} aria-pressed={selected===t.id} data-help={hint(t.id)} onClick={()=>setSelected(t.id)}><span aria-label={labels[status(t.id)]}>{symbols[status(t.id)]}</span><strong>{techName(t.id)}</strong><small>{status(t.id)==='known'?'✓':remaining(t.id)===null?'—':`${remaining(t.id)} ${S.weeks}`}</small><span><NumericValue value={t.cost} format="compact"/> pt</span></button>)}{!rows.length&&<p className="muted">{uiCopy().screenText['noMatchingTechnologies']}</p>}</div>
  {detail}
 </div>;
}
function ResearchAtlas({selected,onSelect,status,hint,labels}:{selected:string;onSelect:(id:string)=>void;status:(id:string)=>'known'|'current'|'available'|'locked';hint:(id:string)=>string;labels:Record<string,string>}){
 const ko=useLang()==='ko',[zoom,setZoom]=useState(1),viewport=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 useEffect(()=>{const el=viewport.current;if(el)el.scrollLeft=Math.max(0,(el.scrollWidth-el.clientWidth)/2);},[]);
 const change=(z:number)=>setZoom(Math.max(.5,Math.min(1.5,z)));
 return <div className="research-atlas-graph"><nav className="research-zoom"><button aria-label={uiCopy().screenText['zoomOut227']} onClick={()=>change(zoom-.1)}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label={uiCopy().screenText['zoomIn228']} onClick={()=>change(zoom+.1)}>+</button><button onClick={()=>{if(viewport.current)change((viewport.current.clientWidth-12)/layout.width);}}>{uiCopy().screenText['fitWidth']}</button><button onClick={()=>{const node=viewport.current?.querySelector<HTMLElement>('[aria-pressed="true"]');node?.scrollIntoView({block:'nearest',inline:'center'});}}>{uiCopy().screenText['locateSelection']}</button></nav>
 <div ref={viewport} className="research-atlas-scroll" tabIndex={0} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='+'||e.key==='='){e.preventDefault();change(zoom+.1);}if(e.key==='-'){e.preventDefault();change(zoom-.1);}}} onPointerDown={e=>{if(e.button!==0||(e.target as Element).closest('button'))return;drag.current={x:e.clientX,y:e.clientY,left:e.currentTarget.scrollLeft,top:e.currentTarget.scrollTop};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();}} onPointerMove={e=>{const d=drag.current;if(d){e.currentTarget.scrollLeft=d.left+d.x-e.clientX;e.currentTarget.scrollTop=d.top+d.y-e.clientY;}}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}>
 <div style={{width:layout.width*zoom,height:layout.height*zoom,marginInline:'auto'}}><div className="research-tree" style={{width:layout.width,height:layout.height,transform:`scale(${zoom})`,transformOrigin:'top left'}}><svg viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">{layout.ordered.flatMap(t=>t.requires.map(id=>{const a=layout.positions.get(id)!,b=layout.positions.get(t.id)!;return <path key={id+t.id} d={`M${a.x+94},${a.y+88}C${a.x+94},${(a.y+88+b.y)/2} ${b.x+94},${(a.y+88+b.y)/2} ${b.x+94},${b.y}`} fill="none" stroke={selected===t.id||selected===id?'var(--gold)':'var(--ink2)'} strokeDasharray={status(id)==='known'&&status(t.id)==='known'?undefined:'4 3'} strokeWidth="1.5"/>;}))}</svg>{layout.ordered.map(t=>{const p=layout.positions.get(t.id)!;return <button key={t.id} className={`research-node state-${status(t.id)}`} style={{left:p.x,top:p.y,width:188}} aria-pressed={selected===t.id} aria-label={`${techName(t.id)} · ${labels[status(t.id)]} · ${t.cost} pt`} data-help={hint(t.id)} onClick={()=>onSelect(t.id)}><span className="research-state-icon" aria-hidden="true">{status(t.id)==='known'?<Check size={15}/>:status(t.id)==='locked'?<Lock size={14}/>:status(t.id)==='current'?<CircleDot size={15}/>:<Circle size={14}/>}</span><strong>{techName(t.id)}</strong><small>{compact(t.cost)} pt</small></button>;})}</div></div></div></div>;
}
