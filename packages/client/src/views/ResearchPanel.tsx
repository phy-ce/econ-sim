import {Button as UIButton,Input as UIInput} from '../ui/controls';
import {t as uiCopy} from '../i18n';
import {Check,Lock, Circle, CircleDot} from 'lucide-react';
import {useRef,useState,useEffect} from 'react';
import {useNavigationState} from '../NavigationHistory';
import {researchLayout,prerequisitePath} from '../researchLayout';
import {TECHS,researchableTechs,unlocksOf,getMethod,literacyOf,GOOD_IDS,SKILLS,methodMarginAtBase} from '@econ/sim';
import type {World,Company} from '@econ/sim';
import type {Game} from '../useGame';
import {useT,useLang,techName,buildingName,methodName,goodName,skillName} from '../i18n';
import {NumericValue} from '../NumericValue';
import {Bar} from '../ui';
import {marginText,pct,compact,exactNumber} from '../format';
import {DetailWindow} from './DetailWindow';

export function ResearchPanel({world,game,me,request,onPolicy}:{onPolicy?:()=>void;world:World;game:Game;me:Company;request?:{id:string;sequence:number}|null}){
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
 const hint=(id:string)=>{const u=unlocksOf(id);return [...new Set([...u.methods.map(({typeId,methodId})=>{const m=getMethod(typeId,methodId),margin=methodMarginAtBase(typeId,methodId);const goods=(output:boolean)=>GOOD_IDS.filter(g=>(output?m.outputs:m.inputs)[g]).map(g=>`${goodName(g)} ${exactNumber((output?m.outputs:m.inputs)[g]!)}`).join(' · ')||'—';return `${buildingName(typeId)} · ${methodName(m)}\n${T.researchBaseMargin}: ${margin.revenue>0?marginText(margin.margin,{detail:true}):'—'}\n${SKILLS.filter(s=>m.workers[s]).map(s=>`${skillName(s)} ${exactNumber(m.workers[s]!)}`).join(' · ')} / L\n${goods(false)} → ${goods(true)} / L ${T.perDay}`;}),...u.buildings.map(buildingName),...u.policies.map(id=>S[id])])].join('\n');};
 const rows=TECHS.filter(t=>(filter==='all'||(filter==='available'?(status(t.id)==='available'||status(t.id)==='current'):status(t.id)===filter))&&techName(t.id).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 const pops=world.pops.filter(p=>world.regions.find(x=>x.id===p.regionId)?.kingdomId===me.kingdomId),n=pops.reduce((sum,p)=>sum+p.size,0),lit=n?pops.reduce((sum,p)=>sum+p.size*literacyOf(p),0)/n:0;
 const detail=<section className="research-dossier" aria-label={uiCopy().screenText['selectedTechnology']}>
  <header><div><small>{labels[status(tech.id)]}</small><h3>{techName(tech.id)}</h3></div><strong><NumericValue value={tech.cost} format="compact"/> pt</strong></header>
  <div className="research-progress"><Bar value={(r.progress[tech.id]??0)/tech.cost} label={T.progressOf(techName(tech.id))}/><span>{r.known.includes(tech.id)?'✓':remaining(tech.id)===null?'—':`${remaining(tech.id)} ${S.weeks}`}</span></div>
  {tech.requires.length>0&&<div className="research-requires"><small>{uiCopy().screenText['prerequisites']}</small>{tech.requires.map(id=><UIButton key={id} className="entity-link" data-help={hint(id)} onClick={()=>setSelected(id)}>{symbols[status(id)]} {techName(id)} ↗</UIButton>)}</div>}
  <div className="research-unlocks"><small>{uiCopy().screenText['unlocks']}</small>{unlocks.buildings.map(id=><div key={id}><span>{uiCopy().screenText['building']}</span><strong>{buildingName(id)}</strong></div>)}{unlocks.methods.map(m=><div key={m.typeId+m.methodId} data-help={`${buildingName(m.typeId)} · ${methodName(getMethod(m.typeId,m.methodId))}`} tabIndex={0}><span>{buildingName(m.typeId)}</span><strong>{methodName(getMethod(m.typeId,m.methodId))}</strong></div>)}{unlocks.policies.map(id=><UIButton key={id} className="entity-link" onClick={onPolicy} disabled={!onPolicy}><span>{uiCopy().screenText['policy']}</span><strong>{S[id]} ↗</strong></UIButton>)}{!unlocks.buildings.length&&!unlocks.methods.length&&!unlocks.policies.length&&<span>—</span>}</div>
  <UIButton className="research-action" disabled={status(tech.id)==='known'||status(tech.id)==='locked'} data-help={status(tech.id)==='locked'?(uiCopy().screenText['completeTheMissingPrerequisitesFirst']):hint(tech.id)} onClick={()=>game.command({type:'setResearch',techId:r.current===tech.id?null:tech.id})}>{status(tech.id)==='known'?T.done:status(tech.id)==='locked'?(uiCopy().screenText['prerequisitesRequired']):r.current===tech.id?T.stopResearch:T.research}</UIButton>
 </section>;
 return <div className="research-hub">
  <section className="research-current"><div className="research-kpis"><span data-help={uiCopy().screenText['researchPointsEarnedEachWeek']} tabIndex={0}>{S.weekPoints} <b><NumericValue value={r.points} format="one"/> pt</b></span><span>{S.literacy} <b>{pct(lit)}</b></span><span>{labels.known} <b>{r.known.length}/{TECHS.length}</b></span></div>
  <UIButton className="research-current-link" onClick={()=>{if(r.current)setSelected(r.current);}} disabled={!r.current}><small>{uiCopy().screenText['currentResearch']}</small><strong>{r.current?techName(r.current):(uiCopy().screenText['chooseATechnology'])}</strong>{r.current&&<span>↗</span>}</UIButton>
  {r.current&&<Bar value={(r.progress[r.current]??0)/TECHS.find(t=>t.id===r.current)!.cost} label={T.progressOf(techName(r.current))}/>}</section>
  <DetailWindow size={4} title={uiCopy().screenText['researchTree']} summary={`${TECHS.length}`} help={uiCopy().screenText['explorePrerequisitesInALargerWindowDrag']}><div className="research-atlas"><ResearchAtlas selected={tech.id} onSelect={setSelected} status={status} hint={hint} labels={labels} progress={r.progress} remaining={remaining} current={r.current}/>{detail}</div></DetailWindow>
  <nav className="research-filters" aria-label={uiCopy().screenText['technologyStatus']}>{(['available','locked','known','all'] as const).map(f=><UIButton key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='all'?(uiCopy().screenText['all']):labels[f]}</UIButton>)}</nav>
  <UIInput className="research-search" aria-label={uiCopy().screenText['searchTechnologies']} placeholder={uiCopy().screenText['searchTechnologies225']} value={query} onChange={e=>setQuery(e.target.value)}/>
  <div className="research-catalog">{rows.map(t=><UIButton key={t.id} className={`research-row state-${status(t.id)}`} aria-pressed={selected===t.id} data-help={hint(t.id)} onClick={()=>setSelected(t.id)}><span aria-label={labels[status(t.id)]}>{symbols[status(t.id)]}</span><strong>{techName(t.id)}</strong><small>{status(t.id)==='known'?'✓':remaining(t.id)===null?'—':`${remaining(t.id)} ${S.weeks}`}</small><span><NumericValue value={t.cost} format="compact"/> pt</span></UIButton>)}{!rows.length&&<p className="muted">{uiCopy().screenText['noMatchingTechnologies']}</p>}</div>
  {detail}
 </div>;
}
function savedResearchView():{zoom:number;left:number;top:number}|null{
 try{const v=JSON.parse(localStorage.getItem('research-view')??'null');return v&&[v.zoom,v.left,v.top].every(Number.isFinite)?{zoom:Math.max(.5,Math.min(1.5,v.zoom)),left:Math.max(0,v.left),top:Math.max(0,v.top)}:null;}catch{return null;}
}
function ResearchAtlas({selected,onSelect,status,hint,labels,progress,remaining,current}:{selected:string;onSelect:(id:string)=>void;status:(id:string)=>'known'|'current'|'available'|'locked';hint:(id:string)=>string;labels:Record<string,string>;progress:Record<string,number>;remaining:(id:string)=>number|null;current:string|null}){
 const T=useT(),saved=useRef(savedResearchView()),[zoom,setZoom]=useState(saved.current?.zoom??1),[hover,setHover]=useState<string|null>(null),viewport=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 const [viewWidth,setViewWidth]=useState(0);
 useEffect(()=>{const el=viewport.current;if(!el)return;const observer=new ResizeObserver(()=>setViewWidth(el.clientWidth));setViewWidth(el.clientWidth);observer.observe(el);return()=>observer.disconnect();},[]);
 const layout=researchLayout(TECHS,Math.max(1,Math.floor((viewWidth-12)/(204*zoom))));
 const path=prerequisitePath(TECHS,hover??selected);
 const persist=(z=zoom)=>{const el=viewport.current;if(el)try{localStorage.setItem('research-view',JSON.stringify({zoom:z,left:el.scrollLeft,top:el.scrollTop}));}catch{/* session only */}};
 useEffect(()=>{const el=viewport.current;if(!el)return;if(saved.current){el.scrollLeft=saved.current.left;el.scrollTop=saved.current.top;}else{const p=layout.positions.get(current??selected);if(p){el.scrollLeft=Math.max(0,p.x+94-el.clientWidth/2);el.scrollTop=Math.max(0,p.y+44-el.clientHeight/2);}}},[]);
 const change=(requested:number,anchor?:{x:number;y:number})=>{
  const z=Math.max(.5,Math.min(1.5,requested)),el=viewport.current;if(!el||z===zoom)return;
  const point=anchor??{x:el.clientWidth/2,y:el.clientHeight/2},x=(el.scrollLeft+point.x)/zoom,y=(el.scrollTop+point.y)/zoom;
  setZoom(z);requestAnimationFrame(()=>{el.scrollLeft=x*z-point.x;el.scrollTop=y*z-point.y;persist(z);});
 };
 const fit=()=>change(1);
 useEffect(()=>{const el=viewport.current;if(!el)return;const wheel=(e:WheelEvent)=>{e.preventDefault();const rect=el.getBoundingClientRect();change(zoom+(e.deltaY>0?-.1:.1),{x:e.clientX-rect.left,y:e.clientY-rect.top});};el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);},[zoom]);
 return <div className="research-atlas-graph"><nav className="research-zoom"><UIButton aria-label={T.screenText.zoomOut227} onClick={()=>change(zoom-.1)} data-help={T.screenText.zoomOut227}>−</UIButton><span>{Math.round(zoom*100)}%</span><UIButton aria-label={T.screenText.zoomIn228} onClick={()=>change(zoom+.1)} data-help={T.screenText.zoomIn228}>+</UIButton><UIButton onClick={fit}>{T.screenText.fitWidth}</UIButton><UIButton onClick={()=>viewport.current?.querySelector<HTMLElement>('[aria-pressed="true"]')?.scrollIntoView({block:'nearest',inline:'center'})}>{T.screenText.locateSelection}</UIButton></nav>
 <div ref={viewport} className="research-atlas-scroll" tabIndex={0} onScroll={()=>persist()} onKeyDown={e=>{if((e.target as HTMLElement).matches('input,select,textarea'))return;if(e.key==='+'||e.key==='='){e.preventDefault();change(zoom+.1);}if(e.key==='-'){e.preventDefault();change(zoom-.1);}if(e.key==='0'){e.preventDefault();fit();}}} onPointerDown={e=>{if(e.button!==0||(e.target as Element).closest('button'))return;drag.current={x:e.clientX,y:e.clientY,left:e.currentTarget.scrollLeft,top:e.currentTarget.scrollTop};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();}} onPointerMove={e=>{const d=drag.current;if(d){e.currentTarget.scrollLeft=d.left+d.x-e.clientX;e.currentTarget.scrollTop=d.top+d.y-e.clientY;}}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}>
 <div style={{overflow:'hidden',width:layout.width*zoom,height:layout.height*zoom,marginInline:'auto'}}><div className="research-tree" style={{width:layout.width,height:layout.height,transform:`scale(${zoom})`,transformOrigin:'top left'}}>
 <svg viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">{layout.ordered.flatMap(t=>t.requires.map(id=>{const a=layout.positions.get(id)!,b=layout.positions.get(t.id)!,highlight=path.has(id)&&path.has(t.id);return <path key={id+t.id} className={highlight?'research-path':''} d={`M${a.x+94},${a.y+88}C${a.x+94},${(a.y+88+b.y)/2} ${b.x+94},${(a.y+88+b.y)/2} ${b.x+94},${b.y}`} fill="none" stroke={highlight?'var(--accent)':'var(--ink2)'} strokeDasharray={status(id)==='known'&&status(t.id)==='known'?undefined:'4 3'} strokeWidth={highlight?3:1.5}/>;}))}</svg>
 {layout.ordered.map(t=>{const p=layout.positions.get(t.id)!,weeks=remaining(t.id),known=status(t.id)==='known';return <UIButton key={t.id} className={`research-node state-${status(t.id)} ${path.has(t.id)?'in-path':''}`} style={{left:p.x,top:p.y,width:188}} aria-pressed={selected===t.id} aria-label={`${techName(t.id)} · ${labels[status(t.id)]} · ${t.cost} pt`} data-help={hint(t.id)} onMouseEnter={()=>setHover(t.id)} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover(t.id)} onBlur={()=>setHover(null)} onClick={()=>onSelect(t.id)}>
 <span className="research-state-icon" aria-hidden="true">{known?<Check size={15}/>:status(t.id)==='locked'?<Lock size={14}/>:status(t.id)==='current'?<CircleDot size={15}/>:<Circle size={14}/>}</span><strong>{techName(t.id)}</strong><small>{compact(t.cost)} pt · {known?'✓':weeks===null?'—':`${compact(weeks)} ${T.system.weeks}`}</small>{!known&&(progress[t.id]??0)>0&&<Bar value={progress[t.id]/t.cost} label={T.progressOf(techName(t.id))} style={{height:6/zoom,minHeight:6/zoom,flex:`0 0 ${6/zoom}px`}}/>}
 </UIButton>;})}</div></div></div></div>;
}
