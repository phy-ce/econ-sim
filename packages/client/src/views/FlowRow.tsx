import {officeLoadFor} from '../officeLoad';
import {BUILDING_BY_ID,GOOD_IDS,TUNE,crewOf,efficiencyParts,getMethod,harvestFactor,isOwnerBuilding,sellThrough,officeLoad,companyById} from '@econ/sim';
import type {Building,GoodId,World} from '@econ/sim';
import {BuildingSprite,GoodSprite} from '../sprites';
import {NumericValue} from '../NumericValue';
import {Bar} from '../ui';
import {goodName,useT} from '../i18n';
import {exactNumber,pct} from '../format';
import {HarvestBadge} from './HarvestBadge';
import './flow-row.css';
export type FlowSummary={inputs:{g:GoodId;cur:number;price:number;value:number}[];outputs:{g:GoodId;cur:number;price:number;value:number}[];inputFill:number;rev:number;raw:number;wage:number;stopped:boolean;points:number;tax:number;seats:number;officeLoad:number};
export function FlowRow({world,building:b,typeId=b?.typeId,methodId=b?.methodId,regionId=b?.regionId,levels=b?.level??1,onGood,summary}:{world:World;summary?:FlowSummary;building?:Building;typeId?:string;methodId?:string;regionId?:number;levels?:number;onGood?:(g:GoodId)=>void}){
 const T=useT();if(!typeId||!methodId||regionId===undefined||isOwnerBuilding(typeId))return null;
 const m=getMethod(typeId,methodId),region=world.regions.find(r=>r.id===regionId);if(!region)return null;
 const stopped=summary?.stopped??(!!b&&(!b.active||!!b.idle)),run=b?(stopped?0:levels*b.utilization*crewOf(b)*harvestFactor(world,regionId,BUILDING_BY_ID[typeId].land)):levels;
 const load=summary?.officeLoad??(b&&m.construction?officeLoadFor(world,b):1);
 const efficiency=b?efficiencyParts(b):null,weather=harvestFactor(world,regionId,BUILDING_BY_ID[typeId].land);
 const factors=[...(efficiency?[[T.flowEfficiency,efficiency.total],[T.flowExperience,efficiency.experience],[T.flowScale,efficiency.scale],[T.flowPerk,efficiency.perk],[T.flowCrew,efficiency.crew]] as [string,number][]:[]),[T.flowWeather,weather] as [string,number]].map(([name,value])=>`${name}: ${exactNumber(value)}×`).join('\n');
 const side=(output:boolean)=><div className="flow-chips">{GOOD_IDS.filter(g=>summary?(output?summary.outputs:summary.inputs).some(f=>f.g===g):(output?m.outputs:m.inputs)[g]).map(g=>{
  const market=region.market[g],recipe=(output?m.outputs:m.inputs)[g]??0;
  const aggregated=(output?summary?.outputs:summary?.inputs)?.find(f=>f.g===g);
  const amount=aggregated?aggregated.cur:b?(output?(stopped?0:b.last.output[g]??0):recipe*run*b.last.inputFill*(m.construction?load:1)):recipe*levels;
  const rate=output?sellThrough(market):summary?.inputFill??b?.last.inputFill??1;
  const scarce=!output&&market.demandEma>0&&market.supplyEma/market.demandEma<.99;
  return <button key={g} disabled={!onGood} onClick={()=>onGood?.(g)} data-help={`${output?T.hOutput:T.hInputs} · ${goodName(g)}\n${T.perDay} · ${T.owned}: ${exactNumber(levels)}\n${exactNumber(recipe)} / L\n${pct(rate)}\n${factors}`} className={scarce?'flow-chip neg':'flow-chip'}><GoodSprite g={g} size={24}/><strong><NumericValue value={amount} format="compact"/></strong><small><NumericValue value={aggregated?(aggregated.cur?aggregated.value/aggregated.cur:aggregated.price):market.price} format="money"/> · <NumericValue value={(aggregated?.value??amount*market.price)*(output?1:-1)} format="signedMoney"/></small>{!stopped&&<Bar value={rate} tone={output?'out':'in'} label={output?T.hOutput:T.hInputs}/>}</button>;
 })}{!(output?summary?summary.outputs.length:Object.keys(m.outputs).length:summary?summary.inputs.length:Object.keys(m.inputs).length)&&<span>—</span>}</div>;
 const service=summary?(summary.tax?{label:T.taxCapacity,value:summary.tax}:summary.seats?{label:T.schoolSeats,value:summary.seats}:m.construction?{label:T.buildPts,value:summary.points}:null):m.taxCapacity?{label:T.taxCapacity,value:m.taxCapacity*levels*TUNE.adminScale}:m.seats?{label:T.schoolSeats,value:m.seats*levels}:m.construction?{label:T.buildPts,value:b?(stopped?0:b.last.points):m.construction*levels}:null;
 const margin=summary?(summary.rev>0?(summary.rev-summary.raw-summary.wage)/summary.rev:null):b&&b.last.revenue>0?(b.last.revenue-b.last.inputCost-b.last.wageCost)/b.last.revenue:null;
 return <div className={`flow-row${stopped?' flow-stopped':''}`} aria-label={`${T.hInputs} → ${T.hOutput}`}>
 {side(false)}<span aria-hidden="true">→</span><span className="flow-building"><BuildingSprite typeId={typeId} size={24}/><b>×<NumericValue value={levels} format="compact"/></b></span><span aria-hidden="true">→</span>
 {typeId==='subsistence'?<HarvestBadge world={world} regionId={regionId} typeId={typeId}/>:service?<span className="flow-service">{service.label}<strong><NumericValue value={service.value} format="compact"/></strong>{m.construction&&<small>{T.officeLoad}: {pct(load)}</small>}</span>:side(true)}
 {(b||summary)&&<span className={margin===null?'muted':margin<0?'neg':'pos'} data-help={T.margin}>{margin===null?'—':pct(margin)}</span>}
 </div>;
}
