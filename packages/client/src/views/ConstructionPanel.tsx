import {Segmented} from '../ui/components';
import {Select as UISelect,Button as UIButton} from '../ui/controls';
import {useMemo} from 'react';
import {Lock} from 'lucide-react';
import {BUILDING_TYPES} from '@econ/sim';
import type {Company,GoodId,World} from '@econ/sim';
import type {Game} from '../useGame';
import {useNavigationState} from '../NavigationHistory';
import {buildingName,regionName,useLang,useT} from '../i18n';
import {NumericValue} from '../NumericValue';
import {BuildingSprite} from '../sprites';
import {buildBlockers,constructionForecast,constructionForecastKey,matchesConstructionCategory,type ConstructionCategory} from '../constructionCatalogue';
import {ActiveContent} from './ActiveContent';
import {DetailWindow} from './DetailWindow';
import {ConstructionDetail} from './ConstructionDetail';
import {Projects} from './CompanyPanel';

export function ConstructionPanel({world,game,me,regionId,onRegion,onOpenRegion,onGood=()=>{},onCompany=()=>{},onOpenBuilding=()=>{}}:{world:World;game:Game;me:Company;regionId:number;onRegion:(id:number)=>void;onOpenRegion:(id:number)=>void;onGood?:(g:GoodId)=>void;onCompany?:(id:number)=>void;onOpenBuilding?:(id:number)=>void}){
 const T=useT(),C=T.constructionUI,lang=useLang();
 const [tab,setTab]=useNavigationState<'build'|'queue'>('construction:tab','build');
 const [category,setCategory]=useNavigationState<ConstructionCategory>('construction:category','all');
 const [sort,setSort]=useNavigationState('construction:sort','profit');
 const [selected,setSelected]=useNavigationState<string|null>('construction:selected',null);
 const region=world.regions.find(r=>r.id===regionId&&r.kingdomId===me.kingdomId)??world.regions.find(r=>r.kingdomId===me.kingdomId);
 const key=constructionForecastKey(world,me,region?.id??regionId);
 const forecast=useMemo(()=>new Map(BUILDING_TYPES.filter(b=>!b.auto&&(!b.stateOnly||me.state)).map(b=>[b.id,constructionForecast(world,me,region?.id??regionId,b.id)])),[key]);
 if(!region)return null;
 const cards=BUILDING_TYPES.filter(b=>!b.auto&&(!b.stateOnly||me.state)&&matchesConstructionCategory(b.id,category)).sort((a,b)=>{
  const x=forecast.get(a.id)!,y=forecast.get(b.id)!;
  return (sort==='name'?buildingName(a.id).localeCompare(buildingName(b.id),lang):sort==='payback'?(x.payback??Infinity)-(y.payback??Infinity):(y.profit??-Infinity)-(x.profit??-Infinity))||a.id.localeCompare(b.id);
 });
 const projects=world.constructions.filter(p=>world.companies.find(c=>c.id===p.companyId)?.kingdomId===me.kingdomId);
 return <section className="construction-hub">
  <div className="construction-region"><UISelect aria-label={T.system.region} value={region.id} onChange={e=>{onRegion(Number(e.target.value));setSelected(null);}}>{world.regions.filter(r=>r.kingdomId===me.kingdomId).map(r=><option key={r.id} value={r.id}>{regionName(r)}</option>)}</UISelect><b aria-label={T.constructionQueue}>+{projects.filter(p=>p.regionId===region.id).length}</b></div>
  <Segmented className="system-tabs" label={C.manage} value={tab} onChange={value=>setTab(value as typeof tab)} options={[{id:'build',label:C.manage},{id:'queue',label:`${T.constructionQueue} · ${projects.length}`}]}/>
  <div hidden={tab!=='build'}><ActiveContent active={tab==='build'}><div className="construction-filters"><UISelect aria-label={C.category} value={category} onChange={e=>setCategory(e.target.value as ConstructionCategory)}>{(['all','primary','processing','heavy','luxury','government'] as const).map(id=><option key={id} value={id}>{C[id]}</option>)}</UISelect><UISelect aria-label={T.screenText.sortBuildings} value={sort} onChange={e=>setSort(e.target.value)}>{(['profit','name','payback'] as const).map(id=><option key={id} value={id}>{C[id]}</option>)}</UISelect></div>
  <div className="construction-cards">{cards.map(bt=>{
   const blockers=buildBlockers(world,me,region,bt.id),estimate=forecast.get(bt.id)!;
   const buildings=world.buildings.filter(b=>b.regionId===region.id&&b.typeId===bt.id),queued=world.constructions.filter(p=>p.regionId===region.id&&p.typeId===bt.id).reduce((n,p)=>n+(p.levels??1),0);
   return <UIButton className={`construction-card land-${bt.land??'none'}`} key={bt.id} aria-haspopup="dialog" aria-expanded={selected===bt.id} data-type-id={bt.id} data-help={blockers.length?blockers.join(' · '):C.weekly} onClick={()=>setSelected(bt.id)}>
    <BuildingSprite typeId={bt.id} size={40}/><strong title={buildingName(bt.id)}>{buildingName(bt.id)}</strong><span className="construction-levels" data-help={`${C.levels}\n${T.system.state}: ${buildings.filter(b=>b.companyId===me.id).reduce((n,b)=>n+b.level,0)}\n${T.system.private}: ${buildings.filter(b=>b.companyId!==me.id).reduce((n,b)=>n+b.level,0)}`}>({buildings.reduce((n,b)=>n+b.level,0)}+{queued})</span>{blockers.length>0&&<Lock size={16} aria-label={T.blocked}/>}
    <span className={estimate.profit!==null&&estimate.profit>=0?'pos':'neg'}>{estimate.profit===null?'—':<NumericValue value={estimate.profit} format="signedCompactMoney"/>}<small>{T.perDay}</small></span><span>{C.payback} {estimate.payback===null?'—':T.nDays(Math.ceil(estimate.payback))}</span>
   </UIButton>;
  })}</div></ActiveContent></div>
  <div hidden={tab!=='queue'}><ActiveContent active={tab==='queue'}><Projects game={game} world={world} owner={me} projects={projects} onRegion={onOpenRegion}/></ActiveContent></div>
  <DetailWindow size={3} hideTrigger title={selected?`${buildingName(selected)} · ${regionName(region)}`:C.manage} help={C.manage} open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null);}}>{selected&&<ConstructionDetail key={`${region.id}:${selected}`} world={world} game={game} region={region} typeId={selected} onGood={onGood} onCompany={onCompany} onOpenBuilding={onOpenBuilding} onRegion={onOpenRegion}/>}</DetailWindow>
 </section>;
}
