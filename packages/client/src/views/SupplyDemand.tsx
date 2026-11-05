import {TUNE} from '@econ/sim';
import type {World} from '@econ/sim';
import {goodName,useT} from '../i18n';
import {compact,exactNumber} from '../format';
import {sdPosition,sdText,supplyDemandProjection} from '../supplyDemand';

export function SupplyDemandBar({now,one,five,ai=false,compact=false}:{now:number|null;one?:number|null;five?:number|null;ai?:boolean;compact?:boolean}){
 const T=useT();
 return <span className={`sd-bar${compact?' sd-compact':''}`} role="img" aria-label={`${T.supplyDemandRatio}: ${sdText(now)}`}>
  {[.5,1,2].map(n=><span key={n} className="sd-tick" style={{left:`${sdPosition(n)*100}%`}} data-help={sdText(n)}><small>{n}</small></span>)}
  {ai&&TUNE.aiGlutSD>0&&<span className="sd-ai" tabIndex={0} style={{left:`${sdPosition(TUNE.aiGlutSD)*100}%`}} data-help={`${T.aiStopsExpanding} ${sdText(TUNE.aiGlutSD)}`}/>}
  {([['now',now],['one',one],['five',five]] as const).map(([kind,value])=>value!==null&&value!==undefined?<span key={kind} className={`sd-point sd-${kind}`} tabIndex={0} style={{left:`${sdPosition(value)*100}%`}} data-help={`${kind==='now'?T.sdNow:kind==='one'?'+1':'+5'}: ${sdText(value)}`}/>:null)}
 </span>;
}
export function SupplyDemandPreview({world,regionId,typeId,methodId}:{world:World;regionId:number;typeId:string;methodId?:string}){
 const T=useT(),values=methodId?supplyDemandProjection(world,regionId,typeId,methodId):null;
 if(!values)return null;
 const market=world.regions.find(r=>r.id===regionId)!.market[values.good];
 const help=`${goodName(values.good)}\n${T.supply}: ${compact(market.supplyEma)}\n${T.demand}: ${compact(market.demandEma)}\n${T.sdNow}: ${sdText(values.now)}\n+1: ${sdText(values.one)}\n+5: ${sdText(values.five)}`;
 return <div className="sd-preview" data-help={help}><span>{T.supplyDemandRatio} · {goodName(values.good)}</span><div className="sd-values"><span>{T.sdNow} <b>{sdText(values.now)}</b></span><span>+1 <b>{sdText(values.one)}</b></span><span>+5 <b>{sdText(values.five)}</b></span></div><SupplyDemandBar {...values} ai/></div>;
}
