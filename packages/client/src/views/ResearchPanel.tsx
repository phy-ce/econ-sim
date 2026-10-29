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
export function ResearchPanel({world,game,me}:{world:World;game:Game;me:Company}){
 const T=useT(),ko=useLang()==='ko',S=T.system,r=me.research,options=researchableTechs(me);
 const [selected,setSelected]=useNavigationState('views/ResearchPanel.tsx:selected',r.current??options[0]??TECHS[0].id);
 const [filter,setFilter]=useNavigationState<'available'|'locked'|'known'|'all'>('research:filter','available');
 const [query,setQuery]=useState('');
 const tech=TECHS.find(t=>t.id===selected)??TECHS[0],unlocks=unlocksOf(tech.id);
 const status=(id:string)=>r.known.includes(id)?'known':r.current===id?'current':options.includes(id)?'available':'locked';
 const labels={known:ko?'완료':'Known',current:ko?'연구 중':'Researching',available:ko?'연구 가능':'Available',locked:ko?'잠김':'Locked'};
 const symbols={known:'✓',current:'◉',available:'○',locked:'◇'};
 const remaining=(id:string)=>{const t=TECHS.find(t=>t.id===id)!;return r.points>0?Math.ceil(Math.max(0,t.cost-(r.progress[id]??0))/r.points):null;};
 const hint=(id:string)=>{const u=unlocksOf(id);return [...new Set([...u.methods.map(m=>`${buildingName(m.typeId)} · ${methodName(getMethod(m.typeId,m.methodId))}`),...u.buildings.map(buildingName),...u.policies.map(id=>S[id])])].join('\n');};
 const rows=TECHS.filter(t=>(filter==='all'||(filter==='available'?(status(t.id)==='available'||status(t.id)==='current'):status(t.id)===filter))&&techName(t.id).toLocaleLowerCase().includes(query.toLocaleLowerCase()));
 const pops=world.pops.filter(p=>world.regions.find(x=>x.id===p.regionId)?.kingdomId===me.kingdomId),n=pops.reduce((sum,p)=>sum+p.size,0),lit=n?pops.reduce((sum,p)=>sum+p.size*literacyOf(p),0)/n:0;
 const detail=<section className="research-dossier" aria-label={ko?'선택 기술':'Selected technology'}>
  <header><div><small>{labels[status(tech.id)]}</small><h3>{techName(tech.id)}</h3></div><strong><NumericValue value={tech.cost} format="compact"/> pt</strong></header>
  <div className="research-progress"><Bar value={(r.progress[tech.id]??0)/tech.cost} label={T.progressOf(techName(tech.id))}/><span>{r.known.includes(tech.id)?'✓':remaining(tech.id)===null?'—':`${remaining(tech.id)} ${S.weeks}`}</span></div>
  {tech.requires.length>0&&<div className="research-requires"><small>{ko?'선행 기술':'Prerequisites'}</small>{tech.requires.map(id=><button key={id} className="entity-link" data-help={hint(id)} onClick={()=>setSelected(id)}>{symbols[status(id)]} {techName(id)} ↗</button>)}</div>}
  <div className="research-unlocks"><small>{ko?'열리는 것':'Unlocks'}</small>{unlocks.buildings.map(id=><div key={id}><span>{ko?'건물':'Building'}</span><strong>{buildingName(id)}</strong></div>)}{unlocks.methods.map(m=><div key={m.typeId+m.methodId} data-help={`${buildingName(m.typeId)} · ${methodName(getMethod(m.typeId,m.methodId))}`} tabIndex={0}><span>{buildingName(m.typeId)}</span><strong>{methodName(getMethod(m.typeId,m.methodId))}</strong></div>)}{unlocks.policies.map(id=><div key={id}><span>{ko?'정책':'Policy'}</span><strong>{S[id]}</strong></div>)}{!unlocks.buildings.length&&!unlocks.methods.length&&!unlocks.policies.length&&<span>—</span>}</div>
  <button className="research-action" disabled={status(tech.id)==='known'||status(tech.id)==='locked'} data-help={status(tech.id)==='locked'?(ko?'미완료 선행 기술을 먼저 연구해야 합니다.':'Complete the missing prerequisites first.'):hint(tech.id)} onClick={()=>game.command({type:'setResearch',techId:r.current===tech.id?null:tech.id})}>{status(tech.id)==='known'?T.done:status(tech.id)==='locked'?(ko?'선행 연구 필요':'Prerequisites required'):r.current===tech.id?T.stopResearch:T.research}</button>
 </section>;
 return <div className="research-hub">
  <section className="research-current"><div className="research-kpis"><span data-help={ko?'매주 얻는 연구 포인트입니다.':'Research points earned each week.'} tabIndex={0}>{S.weekPoints} <b><NumericValue value={r.points} format="one"/> pt</b></span><span>{S.literacy} <b>{pct(lit)}</b></span><span>{labels.known} <b>{r.known.length}/{TECHS.length}</b></span></div>
  <button className="research-current-link" onClick={()=>{if(r.current)setSelected(r.current);}} disabled={!r.current}><small>{ko?'현재 연구':'Current research'}</small><strong>{r.current?techName(r.current):(ko?'연구를 선택하세요':'Choose a technology')}</strong>{r.current&&<span>↗</span>}</button>
  {r.current&&<Bar value={(r.progress[r.current]??0)/TECHS.find(t=>t.id===r.current)!.cost} label={T.progressOf(techName(r.current))}/>}</section>
  <DetailWindow title={ko?'연구 계통도':'Research tree'} summary={`${TECHS.length}`} help={ko?'전체 선행 관계를 큰 창에서 탐색합니다. 빈 곳을 끌어 이동하고 배율 버튼으로 확대합니다.':'Explore prerequisites in a larger window. Drag empty space to pan; use zoom buttons.'}><div className="research-atlas"><ResearchAtlas selected={tech.id} onSelect={setSelected} status={status} hint={hint} labels={labels}/>{detail}</div></DetailWindow>
  <nav className="research-filters" aria-label={ko?'기술 상태':'Technology status'}>{(['available','locked','known','all'] as const).map(f=><button key={f} aria-pressed={filter===f} onClick={()=>setFilter(f)}>{f==='all'?(ko?'전체':'All'):labels[f]}</button>)}</nav>
  <input className="research-search" aria-label={ko?'기술 검색':'Search technologies'} placeholder={ko?'기술 검색…':'Search technologies…'} value={query} onChange={e=>setQuery(e.target.value)}/>
  <div className="research-catalog">{rows.map(t=><button key={t.id} className={`research-row state-${status(t.id)}`} aria-pressed={selected===t.id} data-help={hint(t.id)} onClick={()=>setSelected(t.id)}><span aria-label={labels[status(t.id)]}>{symbols[status(t.id)]}</span><strong>{techName(t.id)}</strong><small>{status(t.id)==='known'?'✓':remaining(t.id)===null?'—':`${remaining(t.id)} ${S.weeks}`}</small><span><NumericValue value={t.cost} format="compact"/> pt</span></button>)}{!rows.length&&<p className="muted">{ko?'해당 기술 없음':'No matching technologies'}</p>}</div>
  {detail}
 </div>;
}
function ResearchAtlas({selected,onSelect,status,hint,labels}:{selected:string;onSelect:(id:string)=>void;status:(id:string)=>'known'|'current'|'available'|'locked';hint:(id:string)=>string;labels:Record<string,string>}){
 const ko=useLang()==='ko',[zoom,setZoom]=useState(1),viewport=useRef<HTMLDivElement>(null),drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 useEffect(()=>{const el=viewport.current;if(el)el.scrollLeft=Math.max(0,(el.scrollWidth-el.clientWidth)/2);},[]);
 const change=(z:number)=>setZoom(Math.max(.5,Math.min(1.5,z)));
 return <div className="research-atlas-graph"><nav className="research-zoom"><button aria-label={ko?'축소':'Zoom out'} onClick={()=>change(zoom-.1)}>−</button><span>{Math.round(zoom*100)}%</span><button aria-label={ko?'확대':'Zoom in'} onClick={()=>change(zoom+.1)}>+</button><button onClick={()=>{if(viewport.current)change((viewport.current.clientWidth-12)/layout.width);}}>{ko?'너비 맞춤':'Fit width'}</button><button onClick={()=>{const node=viewport.current?.querySelector<HTMLElement>('[aria-pressed="true"]');node?.scrollIntoView({block:'nearest',inline:'center'});}}>{ko?'선택 위치':'Locate selection'}</button></nav>
 <div ref={viewport} className="research-atlas-scroll" tabIndex={0} onKeyDown={e=>{if(e.target!==e.currentTarget)return;if(e.key==='+'||e.key==='='){e.preventDefault();change(zoom+.1);}if(e.key==='-'){e.preventDefault();change(zoom-.1);}}} onPointerDown={e=>{if(e.button!==0||(e.target as Element).closest('button'))return;drag.current={x:e.clientX,y:e.clientY,left:e.currentTarget.scrollLeft,top:e.currentTarget.scrollTop};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();}} onPointerMove={e=>{const d=drag.current;if(d){e.currentTarget.scrollLeft=d.left+d.x-e.clientX;e.currentTarget.scrollTop=d.top+d.y-e.clientY;}}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}>
 <div style={{width:layout.width*zoom,height:layout.height*zoom,marginInline:'auto'}}><div className="research-tree" style={{width:layout.width,height:layout.height,transform:`scale(${zoom})`,transformOrigin:'top left'}}><svg viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">{layout.ordered.flatMap(t=>t.requires.map(id=>{const a=layout.positions.get(id)!,b=layout.positions.get(t.id)!;return <path key={id+t.id} d={`M${a.x+94},${a.y+88}C${a.x+94},${(a.y+88+b.y)/2} ${b.x+94},${(a.y+88+b.y)/2} ${b.x+94},${b.y}`} fill="none" stroke={selected===t.id||selected===id?'var(--gold)':'var(--ink2)'} strokeDasharray={status(id)==='known'&&status(t.id)==='known'?undefined:'4 3'} strokeWidth="1.5"/>;}))}</svg>{layout.ordered.map(t=>{const p=layout.positions.get(t.id)!;return <button key={t.id} className={`research-node state-${status(t.id)}`} style={{left:p.x,top:p.y,width:188}} aria-pressed={selected===t.id} aria-label={`${techName(t.id)} · ${labels[status(t.id)]} · ${t.cost} pt`} data-help={hint(t.id)} onClick={()=>onSelect(t.id)}><span className="research-state-icon" aria-hidden="true">{status(t.id)==='known'?<Check size={15}/>:status(t.id)==='locked'?<Lock size={14}/>:status(t.id)==='current'?<CircleDot size={15}/>:<Circle size={14}/>}</span><strong>{techName(t.id)}</strong><small>{compact(t.cost)} pt</small></button>;})}</div></div></div></div>;
}
