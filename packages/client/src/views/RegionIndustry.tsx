import {useEffect,useMemo} from 'react';
import {BUILDING_BY_ID,isOwnerBuilding} from '@econ/sim';
import type {GoodId,Region,World} from '@econ/sim';
import type {Game} from '../useGame';
import {buildingGroups} from '../buildingGroups';
import {useNavigationState} from '../NavigationHistory';
import {buildingName,regionName,useLang,useT} from '../i18n';
import {NumericValue} from '../NumericValue';
import {BuildingSprite} from '../sprites';
import {BuildingMetricBars} from './BuildingMetricBars';
import {BuildingCostBar} from './BuildingCostBar';
import {ReserveBar} from './ReserveBar';
import {OwnerSummary} from './OwnerSummary';
import {OwnershipBar} from './OwnershipBar';
import {DemolitionBadge} from './DemolitionBadge';
import {DetailWindow} from './DetailWindow';
import {ConstructionDetail} from './ConstructionDetail';
import {ListTools} from './ListTools';

export function RegionIndustry({world,region,game,request,onGood,onCompany,onOpenBuilding=()=>{}}:{world:World;region:Region;game:Game;request?:{id:number;sequence:number}|null;onGood:(g:GoodId)=>void;onCompany:(id:number)=>void;onOpenBuilding?:(id:number)=>void}){
 const T=useT(),S=T.system,G=T.buildingGroups,lang=useLang();
 const [selected,setSelected]=useNavigationState<string|null>('region-industry:selected',null);
 const [search,setSearch]=useNavigationState('views/RegionIndustry.tsx:search',''),[sort,setSort]=useNavigationState('views/RegionIndustry.tsx:sort','level'),[direction,setDirection]=useNavigationState('views/RegionIndustry.tsx:direction',-1);
 useEffect(()=>setSelected(null),[region.id]);
 useEffect(()=>{const b=world.buildings.find(b=>b.id===request?.id&&b.regionId===region.id);if(b){setSelected(b.typeId);setSearch('');}},[request,region.id]);
 const groups=buildingGroups(world,region.id),week=Math.floor(world.tick/7),typeKey=groups.map(g=>g.typeId).sort().join('|');
 const order=useMemo(()=>[...groups].sort((a,b)=>{
  const ownership=Number(isOwnerBuilding(a.typeId))-Number(isOwnerBuilding(b.typeId));if(ownership)return ownership;
  const value=(g:typeof a)=>sort==='level'?g.levels:sort==='utilization'?g.utilization:sort==='staffing'?g.econ.staffing:sort==='perLevel'?g.econ.profitWeekPerLevel:sort==='dividend'?g.econ.dividendsWeek:g.econ.profitWeek;
  return (sort==='name'?buildingName(a.typeId).localeCompare(buildingName(b.typeId),lang):value(a)-value(b))*direction||a.typeId.localeCompare(b.typeId);
 }).map(g=>g.typeId),[region.id,week,typeKey,sort,direction,lang]);
 const filtered=order.map(id=>groups.find(g=>g.typeId===id)!).filter(g=>buildingName(g.typeId).toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 return <section className="region-industry">
  <div className="industry-total">{G.types} {groups.length} · L <NumericValue value={groups.reduce((n,g)=>n+g.levels,0)} format="compact"/></div>
  <ListTools placeholder={G.search} value={sort} onChange={setSort} direction={direction} onDirection={()=>setDirection(-direction)} search={search} onSearch={setSearch} count={filtered.length} options={[["level",G.levels],["name",G.name],["utilization",T.utilisation],["staffing",G.staffing],["profit",S.weekProfit],["perLevel",S.perLevel],["dividend",S.dividend]]}/>
  {filtered.map(g=><article key={g.typeId} className={`industry-group ${isOwnerBuilding(g.typeId)?'owner-group':''}`}>
   <button className="industry-group-head" aria-haspopup="dialog" aria-expanded={selected===g.typeId} onClick={()=>setSelected(g.typeId)}><BuildingSprite typeId={g.typeId} size={40}/><strong>{buildingName(g.typeId)}</strong><span>×{g.levels}{g.projects.length>0&&<small className="accent"> +{g.projects.reduce((n,c)=>n+(c.levels??1),0)}</small>}{g.shrinking>0&&<DemolitionBadge levels={g.shrinking}/>}</span></button>
   <OwnershipBar world={world} buildings={g.buildings}/>{isOwnerBuilding(g.typeId)?<OwnerSummary buildings={g.buildings}/>:<div className="group-metrics">
    {(g.typeId==='builder'||!BUILDING_BY_ID[g.typeId].stateOnly&&!BUILDING_BY_ID[g.typeId].methods.some(m=>m.construction))&&<BuildingCostBar econ={g.econ}/>}
    <BuildingMetricBars employed={g.econ.employed} jobs={g.econ.jobs} profit={g.econ.profitWeek} perLevel={g.econ.profitWeekPerLevel}/>{g.econ.hasReserve&&<ReserveBar value={g.econ.reserve} cap={g.econ.reserveCap} weekly={g.econ.reserveWeek}/>}
   </div>}
  </article>)}
  <DetailWindow hideTrigger title={selected?`${buildingName(selected)} · ${regionName(region)}`:T.constructionUI.manage} help={T.constructionUI.manage} open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null);}}>{selected&&<ConstructionDetail key={`${region.id}:${selected}`} world={world} game={game} region={region} typeId={selected} initialBuildingId={request?.id} onGood={onGood} onCompany={onCompany} onOpenBuilding={onOpenBuilding}/>}</DetailWindow>
 </section>;
}
