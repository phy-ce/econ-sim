import {Segmented} from '../ui/components';
import {SectionHeading} from '../system-02/blocks';
import {Button as UIButton} from '../ui/controls';
import {ActualOutput} from './ActualOutput';
import {BUILDING_BY_ID,availableMethods,companyById,constructionEstimate,isOwnerBuilding,knowsTech,playerCompany,tradeEscrowPerLevel} from '@econ/sim';
import type {GoodId,Region,World} from '@econ/sim';
import {useNavigationState} from '../NavigationHistory';
import {buildBlockers} from '../constructionCatalogue';
import {buildingName,methodName,techName,useT} from '../i18n';
import {ownershipLabel} from '../ownershipLabel';
import {NumericValue} from '../NumericValue';
import type {Game} from '../useGame';
import {BuildingControls} from './BuildingControls';
import {Projects} from './ConstructionProjects';
import {GroupDetail} from './GroupDetail';
import {BuildingRoom} from './BuildingRoom';
import {OwnerSummary} from './OwnerSummary';
import {OwnershipBar} from './OwnershipBar';
import {FlowRow} from './FlowRow';
import {SupplyDemandPreview} from './SupplyDemand';

export function ConstructionDetail({world,game,region,typeId,onGood,onCompany,onOpenBuilding,onRegion,initialBuildingId}:{world:World;game:Game;region:Region;typeId:string;onGood:(g:GoodId)=>void;onCompany:(id:number)=>void;onOpenBuilding:(id:number)=>void;onRegion?:(id:number)=>void;initialBuildingId?:number}){
 const T=useT(),S=T.system,me=playerCompany(world)!,def=BUILDING_BY_ID[typeId];
 const [task,setTask]=useNavigationState<'overview'|'manage'|'build'>('construction-detail:task',initialBuildingId!==undefined?'manage':world.buildings.some(b=>b.regionId===region.id&&b.typeId===typeId)?'overview':'build');
 const [view,setView]=useNavigationState<'all'|'private'|'state'>('construction-detail:view','all');
 const [inspect,setInspect]=useNavigationState<number|null>('construction-detail:building',initialBuildingId??null);
 const all=world.buildings.filter(b=>b.regionId===region.id&&b.typeId===typeId).sort((a,b)=>a.id-b.id);
 const items=all.filter(b=>view==='all'||(view==='state')===b.stateOwned),owner=world.companies.find(c=>c.state&&c.kingdomId===region.kingdomId)??me;
 const own=all.filter(b=>b.companyId===me.id),canManage=region.kingdomId===me.kingdomId&&!def.auto;
 const est=constructionEstimate(world,me,typeId),blockers=buildBlockers(world,me,region,typeId),first=availableMethods(me,typeId)[0];
 const selected=items.find(b=>b.id===inspect);
 const projects=world.constructions.filter(p=>p.regionId===region.id&&p.typeId===typeId&&(task==='build'||view==='all'||(view==='state')===!!companyById(world,p.companyId)?.state));
 return <section className="construction-detail">
  <Segmented className="construction-task-tabs" label={T.constructionUI.manage} value={task} onChange={v=>setTask(v as typeof task)} options={[{id:"overview",label:T.designSystem.overview},{id:"manage",label:T.designSystem.buildings},{id:"build",label:T.construct}]}/>
  {task!=="build"&&<nav className="construction-scope" aria-label={T.constructionUI.manage}>{(['all','private','state'] as const).map(v=><UIButton key={v} aria-pressed={view===v} onClick={()=>{setView(v);setInspect(null);}}>{S[v]} <small>{all.filter(b=>v==='all'||(v==='state')===b.stateOwned).reduce((n,b)=>n+b.level,0)}</small></UIButton>)}</nav>}
  {task==="overview"&&<section className="construction-overview"><SectionHeading>{T.designSystem.overview}</SectionHeading><OwnershipBar world={world} buildings={items}/>{isOwnerBuilding(typeId)&&<OwnerSummary buildings={items}/>}
  {items.length>0?<GroupDetail world={world} buildings={items} game={game} onGood={onGood} onOwner={onOpenBuilding} showControls={false}/>:<BuildingRoom world={world} typeId={typeId} regionId={region.id}/>}
  </section>}
  {task==="manage"&&<section className="construction-management"><SectionHeading trailing={items.length}>{T.designSystem.buildings}</SectionHeading>{items.map(b=><div className="construction-building" key={b.id} data-building-id={b.id}><UIButton className="entity-link" aria-expanded={inspect===b.id} onClick={()=>setInspect(inspect===b.id?null:b.id)}>{ownershipLabel(world,b)} · #{b.id} · ×{b.level} · {methodName(def.methods.find(m=>m.id===b.methodId)!)} ↗</UIButton>
   <ActualOutput world={world} building={b}/>{inspect===b.id&&b.companyId===me.id&&canManage&&<BuildingControls world={world} game={game} building={b}/>}
  </div>)}
  {selected&&<UIButton className="entity-link" onClick={()=>onOpenBuilding(selected.id)}>{buildingName(typeId)} · #{selected.id} ↗</UIButton>}</section>}
  {task==="build"&&canManage&&<section className="construction-crown"><SectionHeading trailing={S.state}>{T.construct}</SectionHeading>
   <div className="system-facts"><span>{T.cost} / L<b>{Number.isFinite(est.cost)?<NumericValue value={est.cost} format="money"/>:'—'}</b></span><span>{T.buildPts} / L<b><NumericValue value={est.required} format="two"/></b></span><span>{T.duration}<b>{Number.isFinite(est.days)?T.nDays(Math.ceil(est.days)):'—'}</b></span>{typeId==='trading_post'&&<span tabIndex={0} data-help={T.tradeEscrowHelp}>{T.tradeEscrow}<b><NumericValue value={tradeEscrowPerLevel()} format="money"/></b></span>}</div>
   {own.length>0&&own.map(b=><section key={b.id}><SectionHeading>#{b.id} · ×{b.level}</SectionHeading><BuildingControls world={world} game={game} building={b} constructionOnly/></section>)}
   {!own.length&&<><details className="construction-recipe"><summary>{T.flowBase}</summary><div className="system-tags">{def.methods.map(m=><span key={m.id} data-help={!knowsTech(me,m.tech)&&m.tech?techName(m.tech):undefined} tabIndex={0}>{!knowsTech(me,m.tech)&&'🔒 '}{methodName(m)}</span>)}</div>{first&&<FlowRow world={world} typeId={typeId} methodId={first.id} regionId={region.id} onGood={onGood}/>}</details><div className="stepper" aria-label={`${S.state} · ${T.construct}`}>{[1,5].map(n=><UIButton key={n} disabled={buildBlockers(world,me,region,typeId,n).length>0} data-help={buildBlockers(world,me,region,typeId,n).join(' · ')} onClick={()=>game.command({type:'build',typeId,regionId:region.id,levels:n})}>+{n}</UIButton>)}</div></>}
   {blockers.length>0&&<span className="tag-bad" tabIndex={0} data-help={blockers.join(' · ')}>🔒</span>}
  </section>}
  {task==="overview"&&<details className="construction-market"><summary>{T.designSystem.supplyDemand}</summary><SupplyDemandPreview world={world} regionId={region.id} typeId={typeId} methodIds={items.length?[...new Set(items.map(b=>b.methodId))]:first?[first.id]:[]}/></details>}
  {task==="build"&&projects.length>0&&<Projects world={world} game={game} owner={owner} projects={projects} regionId={region.id} onRegion={onRegion}/>}
 </section>;
}

