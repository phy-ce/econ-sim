import {ProductionDiagram,ProductionItem} from '../ui/primitives';
import {QuakeBadge} from './QuakeBadge';
import {officeLoadFor} from '../officeLoad';
import {BUILDING_BY_ID,GOOD_IDS,TUNE,crewOf,efficiencyParts,getMethod,harvestFactor,isOwnerBuilding,sellThrough,officeLoad,companyById} from '@econ/sim';
import type {Building,GoodId,World} from '@econ/sim';
import {BuildingSprite,GoodSprite} from '../sprites';
import {NumericValue} from '../NumericValue';
import {Bar} from '../ui';
import {goodName,buildingName,useT} from '../i18n';
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
 const side=(output:boolean)=><>{GOOD_IDS.filter(g=>summary?(output?summary.outputs:summary.inputs).some(f=>f.g===g):(output?m.outputs:m.inputs)[g]).map(g=>{
  const market=region.market[g],recipe=(output?m.outputs:m.inputs)[g]??0;
  const aggregated=(output?summary?.outputs:summary?.inputs)?.find(f=>f.g===g);
  const amount=aggregated?aggregated.cur:b?(output?(stopped?0:b.last.output[g]??0):recipe*run*b.last.inputFill*(m.construction?load:1)):recipe*levels;
  const rate=output?sellThrough(market):summary?.inputFill??b?.last.inputFill??1;
  const scarce=!output&&market.demandEma>0&&market.supplyEma/market.demandEma<.99;
  const unitPrice=aggregated?(aggregated.cur?aggregated.value/aggregated.cur:aggregated.price):market.price;
  return <ProductionItem key={g} name={goodName(g)} icon={<GoodSprite g={g} size={24}/>} quantity={<NumericValue value={amount} format="compact"/>} onSelect={onGood?()=>onGood(g):undefined} className={scarce?'is-scarce':''} help={`${goodName(g)} · ${T.perDay}\n${T.colUnit}: ƒ${exactNumber(unitPrice)}\n${T.owned}: ${exactNumber(levels)}\n${exactNumber(recipe)} / L\n${factors}`} detail={<><span>{output?T.wfRev:T.cost}</span><NumericValue value={aggregated?.value??amount*market.price} format="compactMoney"/></>} meter={!stopped&&(b||summary)?<><small>{output?T.flowSoldRate:T.buildingGroups.coverage}</small><small>{pct(rate)}</small><Bar value={rate} tone={output?'out':'in'} label={output?T.flowSoldRate:T.buildingGroups.coverage}/></>:undefined}/>;
 })}{!(output?summary?summary.outputs.length:Object.keys(m.outputs).length:summary?summary.inputs.length:Object.keys(m.inputs).length)&&<span className="gu-production-empty">—</span>}</>;
 const service=summary?(summary.tax?{label:T.taxCapacity,value:summary.tax}:summary.seats?{label:T.schoolSeats,value:summary.seats}:m.construction?{label:T.buildPts,value:summary.points}:null):m.taxCapacity?{label:T.taxCapacity,value:m.taxCapacity*levels*TUNE.adminScale}:m.seats?{label:T.schoolSeats,value:m.seats*levels}:m.construction?{label:T.buildPts,value:b?(stopped?0:b.last.points):m.construction*levels}:null;
 const margin=summary?(summary.rev>0?(summary.rev-summary.raw-summary.wage)/summary.rev:null):b&&b.last.revenue>0?(b.last.revenue-b.last.inputCost-b.last.wageCost)/b.last.revenue:null;
 return <ProductionDiagram className={stopped?'flow-stopped':''} aria-label={T.buildingGroups.flows} inputLabel={T.hInputs} outputLabel={T.hOutput} period={[b||summary?T.flowActual:T.flowBase,T.perDay].join(' · ')}
 inputs={side(false)} outputs={service?<div className="gu-production-service"><span>{service.label}</span><strong><NumericValue value={service.value} format="compact"/></strong>{m.construction&&<small>{T.officeLoad}: {pct(load)}</small>}</div>:side(true)}
 building={<><BuildingSprite typeId={typeId} size={56}/><strong>{buildingName(typeId)}</strong><small>×<NumericValue value={levels} format="compact"/></small></>}
 footer={<>{stopped&&<span>{b?.idle?T.idle:T.stopped}</span>}{typeId==='subsistence'&&<span><HarvestBadge world={world} regionId={regionId} typeId={typeId}/><QuakeBadge world={world} regionId={regionId}/></span>}{(b||summary)&&<span className="gu-production-margin"><span>{T.margin}</span><strong className={margin===null?'muted':margin<0?'neg':'pos'}>{margin===null?'—':pct(margin)}</strong></span>}</>}/>;
}
