import {Button as UIButton} from '../ui/controls';
import {useMemo} from 'react';
import {buildingEcon,isOwnerBuilding} from '@econ/sim';
import type {World} from '@econ/sim';
import {useNavigationState} from '../NavigationHistory';
import {buildingName,regionName,useLang,useT} from '../i18n';
import {BuildingSprite} from '../sprites';
import {NumericValue} from '../NumericValue';
import {Bar} from '../ui';
import {ListTools} from './ListTools';
import {OwnershipBar} from './OwnershipBar';
import {ReserveBar} from './ReserveBar';

export function KingdomBuildings({world,id,onBuilding}:{world:World;id:number;onBuilding:(id:number)=>void}){
 const T=useT(),lang=useLang(),prefix=`kingdom-buildings:${id}`;
 const [filter,setFilter]=useNavigationState(prefix+':filter','all'),[sort,setSort]=useNavigationState(prefix+':sort','profit');
 const [direction,setDirection]=useNavigationState(prefix+':direction',-1),[search,setSearch]=useNavigationState(prefix+':search','');
 const regions=new Map(world.regions.filter(r=>r.kingdomId===id).map(r=>[r.id,r]));
 const rows=world.buildings.filter(b=>regions.has(b.regionId)&&!isOwnerBuilding(b.typeId)).map(b=>({b,e:buildingEcon(world,b),region:regions.get(b.regionId)!}));
 const matches=(r:typeof rows[number],kind:string)=>kind==='all'||(kind==='manor'&&r.b.typeId==='subsistence')||r.e.owners.some(o=>o.owner===kind&&o.levels>0);
 const ids=rows.map(r=>r.b.id).join(','),week=Math.floor(world.tick/7);
 const order=useMemo(()=>[...rows].sort((a,b)=>{
  if(sort==='name')return buildingName(a.b.typeId).localeCompare(buildingName(b.b.typeId))*direction;
  if(sort==='region')return regionName(a.region).localeCompare(regionName(b.region))*direction;
  const value=(r:typeof a)=>sort==='levels'?r.b.level:sort==='staff'?r.e.staffing:sort==='reserve'?(r.e.reserveCap?r.e.reserve/r.e.reserveCap:0):r.e.profitWeek;
  return (value(a)-value(b))*direction||a.b.id-b.b.id;
 }).map(r=>r.b.id),[id,ids,week,sort,direction,lang]);
 const byId=new Map(rows.map(r=>[r.b.id,r]));
 const shown=order.map(id=>byId.get(id)!).filter(r=>r&&matches(r,filter)&&`${buildingName(r.b.typeId)} ${regionName(r.region)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
 const filters=[['all',T.system.all],['state',T.stateOwner],['manor',T.system.manor],['finance',T.system.finance]];
 const options:[string,string][]=[['profit',T.system.weekProfit],['levels',T.buildingGroups.levels],['name',T.buildingGroups.name],['region',T.popRegion],['staff',T.buildingGroups.staffing],['reserve',T.system.reserve]];
 return <div className="kingdom-buildings">
 <div className="fchips">{filters.map(([kind,label])=><UIButton key={kind} aria-pressed={kind===filter} onClick={()=>setFilter(kind)}>{label} <NumericValue value={rows.filter(r=>matches(r,kind)).length} format="int"/></UIButton>)}</div>
 <ListTools value={sort} onChange={setSort} direction={direction} onDirection={()=>setDirection(-direction)} options={options} search={search} onSearch={setSearch} placeholder={T.buildingGroups.search} count={shown.length}/>
 {shown.length===0&&<span>—</span>}
 {shown.map(({b,e,region})=><article key={b.id} className="kingdom-building-row">
 <UIButton className="kingdom-building-link" onClick={()=>onBuilding(b.id)}><BuildingSprite typeId={b.typeId} size={32}/><strong>{buildingName(b.typeId)} ×<NumericValue value={b.level} format="compact"/></strong><span>{regionName(region)} ↗</span></UIButton>
 <OwnershipBar world={world} buildings={[b]}/>
 <div className="kingdom-building-facts"><span>{T.hStaff}<b><NumericValue value={e.employed} format="compact"/> / <NumericValue value={e.jobs} format="compact"/></b><Bar value={e.staffing} label={T.hStaff}/></span><span>{T.system.weekProfit}<b className={e.profitWeek<0?'neg':'pos'}><NumericValue value={e.profitWeek} format="signedMoney"/></b></span></div>
 {e.hasReserve?<ReserveBar value={e.reserve} cap={e.reserveCap} weekly={e.reserveWeek}/>:<span className="muted">{T.system.reserve} —</span>}
 {!!b.shrinking&&<span className="neg">{T.demolitionQueue(b.shrinking)}</span>}
 </article>)}
 </div>;
}
