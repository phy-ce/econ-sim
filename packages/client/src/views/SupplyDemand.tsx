import {GoodSprite} from '../sprites';
import {NumericValue} from '../NumericValue';
import {TUNE,GOOD_IDS,currentSD,getMethod} from '@econ/sim';
import type {World} from '@econ/sim';
import {goodName,useT} from '../i18n';
import {compact,exactNumber} from '../format';
import {sdPosition,sdText} from '../supplyDemand';

export function SupplyDemandBar({now,ai=false,compact=false}:{now:number|null;ai?:boolean;compact?:boolean}){
 const T=useT();
 return <span className={`sd-bar${compact?' sd-compact':''}`} role="img" aria-label={`${T.supplyDemandRatio}: ${sdText(now)}`}>
  {[.5,1,2].map(n=><span key={n} className="sd-tick" style={{left:`${sdPosition(n)*100}%`}} data-help={sdText(n)}><small>{n}</small></span>)}
  {ai&&TUNE.aiGlutSD>0&&<span className="sd-ai" tabIndex={0} style={{left:`${sdPosition(TUNE.aiGlutSD)*100}%`}} data-help={`${T.aiStopsExpanding} ${sdText(TUNE.aiGlutSD)}`}/>}
  {now!==null&&<span className="sd-point sd-now" tabIndex={0} style={{left:`${sdPosition(now)*100}%`}} data-help={`${T.sdNow}: ${sdText(now)}`}/>}
 </span>;
}
export function SupplyDemandPreview({world,regionId,typeId,methodId,methodIds=methodId?[methodId]:[]}:{world:World;regionId:number;typeId:string;methodId?:string;methodIds?:string[]}){
 const T=useT(),region=world.regions.find(r=>r.id===regionId);if(!region)return null;
 const goods=GOOD_IDS.filter(g=>methodIds.some(id=>(getMethod(typeId,id).outputs[g]??0)>0));
 return <div className="sd-preview">{goods.length>0&&<strong>{T.supplyDemandRatio}</strong>}{goods.map(g=>{const market=region.market[g],now=currentSD(world,regionId,g);return <div className="sd-current-row" key={g} data-help={`${T.supply}: ${exactNumber(market.supplyEma)}\n${T.demand}: ${exactNumber(market.demandEma)}`}><span><GoodSprite g={g} size={24}/>{goodName(g)}</span><b>{sdText(now)}</b><NumericValue value={market.price} format="money"/><SupplyDemandBar now={now}/></div>;})}</div>;
}