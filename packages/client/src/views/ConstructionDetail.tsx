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
import {BuildingControls,Projects} from './CompanyPanel';
import {GroupDetail} from './GroupDetail';
import {BuildingInspector} from './ResourceInspector';
import {BuildingRoom} from './BuildingRoom';
import {OwnerSummary} from './OwnerSummary';
import {OwnershipBar} from './OwnershipBar';
import {FlowRow} from './FlowRow';
import {SupplyDemandPreview} from './SupplyDemand';

export function ConstructionDetail({world,game,region,typeId,onGood,onCompany,onOpenBuilding,onRegion,initialBuildingId}:{world:World;game:Game;region:Region;typeId:string;onGood:(g:GoodId)=>void;onCompany:(id:number)=>void;onOpenBuilding:(id:number)=>void;onRegion?:(id:number)=>void;initialBuildingId?:number}){
 const T=useT(),S=T.system,me=playerCompany(world)!,def=BUILDING_BY_ID[typeId];
 const [view,setView]=useNavigationState<'all'|'private'|'state'>('construction-detail:view','all');
 const [inspect,setInspect]=useNavigationState<number|null>('construction-detail:building',initialBuildingId??null);
 const all=world.buildings.filter(b=>b.regionId===region.id&&b.typeId===typeId).sort((a,b)=>a.id-b.id);
 const items=all.filter(b=>view==='all'||(view==='state')===b.stateOwned),owner=world.companies.find(c=>c.state&&c.kingdomId===region.kingdomId)??me;
 const own=all.filter(b=>b.companyId===me.id),canManage=region.kingdomId===me.kingdomId&&!def.auto;
 const est=constructionEstimate(world,me,typeId),blockers=buildBlockers(world,me,region,typeId),first=availableMethods(me,typeId)[0];
 const selected=items.find(b=>b.id===inspect);
 const projects=world.constructions.filter(p=>p.regionId===region.id&&p.typeId===typeId&&(view==='all'||(view==='state')===!!companyById(world,p.companyId)?.state));
 return <section className="construction-detail">
  <nav className="system-tabs">{(['all','private','state'] as const).map(v=><UIButton key={v} aria-pressed={view===v} onClick={()=>{setView(v);setInspect(null);}}>{S[v]} <small>{all.filter(b=>v==='all'||(v==='state')===b.stateOwned).reduce((n,b)=>n+b.level,0)}</small></UIButton>)}</nav>
  <OwnershipBar world={world} buildings={items}/>{isOwnerBuilding(typeId)&&<OwnerSummary buildings={items}/>}
  {items.length>0?<GroupDetail world={world} buildings={items} game={game} onGood={onGood} onOwner={onOpenBuilding} showControls={false}/>:<BuildingRoom world={world} typeId={typeId} regionId={region.id}/>}
  {items.map(b=><div className="construction-building" key={b.id} data-building-id={b.id}><UIButton className="entity-link" aria-expanded={inspect===b.id} onClick={()=>setInspect(inspect===b.id?null:b.id)}>{ownershipLabel(world,b)} · #{b.id} · ×{b.level} · {methodName(def.methods.find(m=>m.id===b.methodId)!)} ↗</UIButton>
   <ActualOutput world={world} building={b}/>{b.companyId===me.id&&canManage&&<BuildingControls world={world} game={game} building={b}/>}
  </div>)}
  {selected&&<BuildingInspector building={selected} world={world} onGood={onGood} onCompany={onCompany}/>}
  {view!=='private'&&canManage&&<section className="construction-crown"><h3>{S.state} · {buildingName(typeId)}</h3>
   <div className="system-facts"><span>{T.cost} / L<b>{Number.isFinite(est.cost)?<NumericValue value={est.cost} format="money"/>:'—'}</b></span><span>{T.buildPts} / L<b><NumericValue value={est.required} format="two"/></b></span><span>{T.duration}<b>{Number.isFinite(est.days)?T.nDays(Math.ceil(est.days)):'—'}</b></span>{typeId==='trading_post'&&<span tabIndex={0} data-help={T.tradeEscrowHelp}>{T.tradeEscrow}<b><NumericValue value={tradeEscrowPerLevel()} format="money"/></b></span>}</div>
   {!own.length&&<><div className="system-tags">{def.methods.map(m=><span key={m.id} data-help={!knowsTech(me,m.tech)&&m.tech?techName(m.tech):undefined} tabIndex={0}>{!knowsTech(me,m.tech)&&'🔒 '}{methodName(m)}</span>)}</div>{first&&<FlowRow world={world} typeId={typeId} methodId={first.id} regionId={region.id} onGood={onGood}/>}<div className="stepper" aria-label={`${S.state} · ${T.construct}`}>{[1,5].map(n=><UIButton key={n} disabled={buildBlockers(world,me,region,typeId,n).length>0} data-help={buildBlockers(world,me,region,typeId,n).join(' · ')} onClick={()=>game.command({type:'build',typeId,regionId:region.id,levels:n})}>+{n}</UIButton>)}</div></>}
   {blockers.length>0&&<span className="tag-bad" tabIndex={0} data-help={blockers.join(' · ')}>🔒</span>}
  </section>}
  <SupplyDemandPreview world={world} regionId={region.id} typeId={typeId} methodIds={items.length?[...new Set(items.map(b=>b.methodId))]:first?[first.id]:[]}/>
  {projects.length>0&&<Projects world={world} game={game} owner={owner} projects={projects} regionId={region.id} onRegion={onRegion}/>}
 </section>;
}
