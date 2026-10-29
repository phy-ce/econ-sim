import {BuildingMetricBars} from './BuildingMetricBars';
import {ReserveBar} from './ReserveBar';
import {OwnerSummary} from './OwnerSummary';
import {OwnershipBar} from './OwnershipBar';
import {useNavigationState} from '../NavigationHistory';
import {GroupDetail} from './GroupDetail';
import {useEffect,useMemo,useState,useRef} from 'react';
import {isOwnerBuilding,playerCompany} from '@econ/sim';
import type {GoodId,Region,World} from '@econ/sim';
import type {Game} from '../useGame';
import {buildingGroups,summarizeBuildings} from '../buildingGroups';
import {buildingName,companyName,useLang,useT} from '../i18n';
import {NumericValue} from '../NumericValue';
import {BuildingSprite} from '../sprites';
import {Bar} from '../ui';
import {pct} from '../format';
import {BuildList,Projects} from './CompanyPanel';
import {BuildingInspector} from './ResourceInspector';
import {ListTools} from './ListTools';
type View='all'|'private'|'state';
export function RegionIndustry({world,region,game,request,onGood,onCompany,onOpenBuilding}:{world:World;region:Region;game:Game;request?:{id:number;sequence:number}|null;onGood:(g:GoodId)=>void;onCompany:(id:number)=>void;onOpenBuilding?:(id:number)=>void}){
 const T=useT(),S=T.system,G=T.buildingGroups,lang=useLang(),me=playerCompany(world);
 const [selected,setSelected]=useNavigationState<string|null>('views/RegionIndustry.tsx:selected',null),[view,setView]=useNavigationState<View>('views/RegionIndustry.tsx:view','all'),[inspect,setInspect]=useNavigationState<number|null>('views/RegionIndustry.tsx:inspect',null),[build,setBuild]=useNavigationState('views/RegionIndustry.tsx:build',false);
 const [search,setSearch]=useNavigationState('views/RegionIndustry.tsx:search',''),[sort,setSort]=useNavigationState('views/RegionIndustry.tsx:sort','level'),[direction,setDirection]=useNavigationState('views/RegionIndustry.tsx:direction',-1);
 useEffect(()=>{setSelected(null);setInspect(null);setView('all');setBuild(false);},[region.id]);
 useEffect(()=>{const b=world.buildings.find(b=>b.id===request?.id&&b.regionId===region.id);if(b){setSelected(b.typeId);setView(b.stateOwned?'state':'private');setInspect(b.id);setSearch('');}},[request,region.id]);
 const seenProjects=useRef(new Set(world.constructions.map(c=>c.id)));
 useEffect(()=>{
  const fresh=world.constructions.find(c=>!seenProjects.current.has(c.id)&&c.regionId===region.id&&c.companyId===me?.id);
  seenProjects.current=new Set(world.constructions.map(c=>c.id));
  if(fresh){setSelected(fresh.typeId);setView('state');setInspect(null);setBuild(false);setSearch('');}
 },[world.constructions,region.id,me?.id]);
 const groups=buildingGroups(world,region.id),week=Math.floor(world.tick/7),typeKey=groups.map(g=>g.typeId).sort().join('|');
 const order=useMemo(()=>[...groups].sort((a,b)=>{
  const ownership=Number(isOwnerBuilding(a.typeId))-Number(isOwnerBuilding(b.typeId));if(ownership)return ownership;
  const value=(g:typeof a)=>sort==='level'?g.levels:sort==='utilization'?g.utilization:sort==='staffing'?g.econ.staffing:g.econ.profitWeek;
  return (sort==='name'?buildingName(a.typeId).localeCompare(buildingName(b.typeId),lang):value(a)-value(b))*direction||a.typeId.localeCompare(b.typeId);
 }).map(g=>g.typeId),[region.id,week,typeKey,sort,direction,lang]);
 const filtered=order.map(id=>groups.find(g=>g.typeId===id)!).filter(g=>buildingName(g.typeId).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 const colors={state:'#bd6150',manor:'#bd914b',finance:'#4d8eaf'};
 const summary=(data:ReturnType<typeof summarizeBuildings>)=><div className="group-metrics">

  <BuildingMetricBars employed={data.econ.employed} jobs={data.econ.jobs} profit={data.econ.profitWeek} perLevel={data.econ.profitWeekPerLevel}/>{data.econ.hasReserve&&<ReserveBar value={data.econ.reserve} cap={data.econ.reserveCap} weekly={data.econ.reserveWeek}/>}
 </div>;
 return <section className="region-industry">
  <div className="industry-total">{G.types} {groups.length} · L <NumericValue value={groups.reduce((n,g)=>n+g.levels,0)} format="compact"/></div>
  <ListTools placeholder={G.search} value={sort} onChange={setSort} direction={direction} onDirection={()=>setDirection(-direction)} search={search} onSearch={setSearch} count={filtered.length} options={[["level",G.levels],["name",G.name],["utilization",T.utilisation],["staffing",G.staffing],["profit",S.weekProfit]]}/>
  {filtered.map(g=>{
   const open=selected===g.typeId,items=g.buildings.filter(b=>view==='all'||(view==='state'?b.stateOwned:!b.stateOwned));
   const projects=g.projects.filter(c=>view==='all'||(view==='state')===!!world.companies.find(o=>o.id===c.companyId)?.state),data=summarizeBuildings(world,items);
   const queued=g.projects.reduce((n,c)=>n+(c.levels??1),0),required=g.projects.reduce((n,c)=>n+c.required,0);
   return <article key={g.typeId} className={`industry-group ${isOwnerBuilding(g.typeId)?'owner-group':''}`}>
    <button className="industry-group-head" aria-expanded={open} onClick={()=>{setSelected(open?null:g.typeId);setView('all');setInspect(null);}}><BuildingSprite typeId={g.typeId} size={40}/><strong>{buildingName(g.typeId)}</strong><span>×{g.levels}{queued>0&&<small className="accent"> +{queued}</small>}{g.shrinking>0&&<small className="neg"> {T.demolitionQueue(g.shrinking)}</small>}</span></button>
    <OwnershipBar world={world} buildings={g.buildings}/>{isOwnerBuilding(g.typeId)?<OwnerSummary buildings={g.buildings}/>:summary(g)}{required>0&&<Bar value={g.projects.reduce((n,c)=>n+c.points,0)/required} label={T.construct}/>}
    {open&&<div className="industry-group-detail"><div className="system-tabs">{(['all','private','state'] as const).map(v=>{const count=g.buildings.filter(b=>v==='all'||(v==='state')===b.stateOwned).reduce((n,b)=>n+b.level,0);const pending=g.projects.some(c=>v==='all'||(v==='state')===!!world.companies.find(o=>o.id===c.companyId)?.state);return <button key={v} aria-pressed={view===v} disabled={!count&&!pending} onClick={()=>{setView(v);setInspect(null);}}>{S[v]} <small>{count}</small></button>;})}</div>
     <OwnershipBar world={world} buildings={items}/>{isOwnerBuilding(g.typeId)?<OwnerSummary buildings={items}/>:<>{summary(data)}<div className="system-facts"><span>{T.utilisation}<b>{pct(data.utilization)}</b></span>{[[S.sales,data.econ.day.sales],[S.inputs,-data.econ.day.inputs],[T.wages,-data.econ.day.wages],[S.profit,data.econ.day.profit]].map(([label,value])=><span key={label}>{label} / {S.day}<b><NumericValue value={Number(value)} format="signedMoney"/></b></span>)}</div></>}
     <GroupDetail world={world} buildings={items} game={game} onGood={onGood} onOwner={id=>onOpenBuilding?.(id)} showControls={view!=='private'&&region.kingdomId===me?.kingdomId}/>
     {items.map(b=><div key={b.id}><button className="entity-link" aria-expanded={inspect===b.id} onClick={()=>setInspect(inspect===b.id?null:b.id)}>{b.stateOwned?S.state:S.private} · {companyName(world.companies.find(c=>c.id===b.companyId)!)} ×{b.level} ↗</button>{inspect===b.id&&<BuildingInspector game={game} building={b} world={world} onGood={onGood} onCompany={onCompany}/>}</div>)}
     {me&&projects.length>0&&<Projects game={game} world={world} owner={world.companies.find(c=>c.kingdomId===region.kingdomId&&c.state)??me} projects={projects} regionId={region.id}/>}
     {me&&region.kingdomId===me.kingdomId&&view!=='private'&&!g.buildings.some(b=>b.companyId===me.id)&&<BuildList game={game} world={world} me={me} region={region} projects={world.constructions.filter(c=>c.companyId===me.id).length} includeTypes={[g.typeId]}/>}
    </div>}
   </article>;
  })}
  {!filtered.length&&<p className="empty">{T.noMatches}</p>}
  {me&&region.kingdomId===me.kingdomId&&<><button className="industry-new" aria-expanded={build} onClick={()=>setBuild(!build)}>{G.newBuilding}</button>{build&&<BuildList game={game} world={world} me={me} region={region} projects={world.constructions.filter(c=>c.companyId===me.id).length} excludeTypes={groups.map(g=>g.typeId)}/>}</>}
 </section>;
}
