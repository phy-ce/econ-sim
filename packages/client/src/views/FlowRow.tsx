import {BUILDING_BY_ID,GOOD_IDS,TUNE,crewOf,getMethod,harvestFactor,isOwnerBuilding,sellThrough} from '@econ/sim';
import type {Building,GoodId,World} from '@econ/sim';
import {BuildingSprite,GoodSprite} from '../sprites';
import {NumericValue} from '../NumericValue';
import {Bar} from '../ui';
import {goodName,useT} from '../i18n';
import {pct} from '../format';
import {HarvestBadge} from './HarvestBadge';
import './flow-row.css';
export function FlowRow({world,building:b,typeId=b?.typeId,methodId=b?.methodId,regionId=b?.regionId,levels=b?.level??1,onGood}:{world:World;building?:Building;typeId?:string;methodId?:string;regionId?:number;levels?:number;onGood?:(g:GoodId)=>void}){
 const T=useT();if(!typeId||!methodId||regionId===undefined||isOwnerBuilding(typeId))return null;
 const m=getMethod(typeId,methodId),region=world.regions.find(r=>r.id===regionId);if(!region)return null;
 const stopped=!!b&&(!b.active||!!b.idle),run=b?(stopped?0:levels*b.utilization*crewOf(b)*harvestFactor(world,regionId,BUILDING_BY_ID[typeId].land)):levels;
 const side=(output:boolean)=><div className="flow-chips">{GOOD_IDS.filter(g=>(output?m.outputs:m.inputs)[g]).map(g=>{
  const market=region.market[g],recipe=(output?m.outputs:m.inputs)[g]??0;
  const amount=b?(output?(stopped?0:b.last.output[g]??0):recipe*run*b.last.inputFill):recipe*levels;
  const rate=output?sellThrough(market):b?.last.inputFill??1;
  const scarce=!output&&market.demandEma>0&&market.supplyEma/market.demandEma<.99;
  return <button key={g} disabled={!onGood} onClick={()=>onGood?.(g)} data-help={`${output?T.hOutput:T.hInputs} · ${goodName(g)}\n${T.perDay} · ${T.owned}: ${levels}\n${recipe} / L\n${pct(rate)}`} className={scarce?'flow-chip neg':'flow-chip'}><GoodSprite g={g} size={24}/><strong><NumericValue value={amount} format="compact"/></strong><small><NumericValue value={market.price} format="money"/> · <NumericValue value={amount*market.price*(output?1:-1)} format="signedMoney"/></small>{!stopped&&<Bar value={rate} tone={output?'out':'in'} label={output?T.hOutput:T.hInputs}/>}</button>;
 })}</div>;
 const service=m.taxCapacity?{label:T.taxCapacity,value:m.taxCapacity*levels*TUNE.adminScale}:m.seats?{label:T.schoolSeats,value:m.seats*levels}:m.construction?{label:T.buildPts,value:b?(stopped?0:b.last.points):m.construction*levels}:null;
 const margin=b&&b.last.revenue>0?(b.last.revenue-b.last.inputCost-b.last.wageCost)/b.last.revenue:null;
 return <div className={`flow-row${stopped?' flow-stopped':''}`} aria-label={`${T.hInputs} → ${T.hOutput}`}>
 {side(false)}<span aria-hidden="true">→</span><span className="flow-building"><BuildingSprite typeId={typeId} size={24}/><b>×<NumericValue value={levels} format="compact"/></b></span><span aria-hidden="true">→</span>
 {typeId==='subsistence'?<HarvestBadge world={world} regionId={regionId} typeId={typeId}/>:service?<span className="flow-service">{service.label}<strong><NumericValue value={service.value} format="compact"/></strong></span>:side(true)}
 {b&&<span className={margin===null?'muted':margin<0?'neg':'pos'} data-help={T.margin}>{margin===null?'—':pct(margin)}</span>}
 </div>;
}
