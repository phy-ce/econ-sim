import {creditLimit} from '@econ/sim';
import type {World} from '@econ/sim';
import {kingdomStats} from '../kingdomStats';
import {useT} from '../i18n';
import {NumericValue} from '../NumericValue';

export function KingdomMoney({world,id,includePrivate=false,onFinance}:{world:World;id:number;includePrivate?:boolean;onFinance?:()=>void}){
 const T=useT(),d=kingdomStats(world,id),government=d.government;
 if(!government)return null;
 const treasury=<><span>{T.treasury}{government.isPlayer&&onFinance?' ↗':''}</span><b><span className={d.treasury<0?'neg':undefined}><NumericValue value={d.treasury} format="compactMoney"/></span> / <NumericValue value={creditLimit(world,government)} format="compactMoney"/></b><span>{T.lastWeekPL}</span><b className={government.lastWeekProfit<0?'neg':'pos'}><NumericValue value={government.lastWeekProfit} format="signedCompactMoney"/></b></>;
 const reserve=d.production.filter(b=>!b.stateOwned).reduce((n,b)=>n+(b.reserve??0),0);
 const manor=d.buildings.filter(b=>b.typeId==='manor').reduce((n,b)=>n+(b.cash??0),0),finance=d.buildings.filter(b=>b.typeId==='finance').reduce((n,b)=>n+(b.cash??0),0);
 return <div className="kingdom-money">
 {government.isPlayer&&onFinance?<button className="kingdom-money-card" onClick={onFinance}>{treasury}</button>:<div className="kingdom-money-card">{treasury}</div>}
 {includePrivate&&<div className="kingdom-money-card"><span>{T.privateOwner}</span><b className={d.privateFunds<0?'neg':undefined}><NumericValue value={d.privateFunds} format="compactMoney"/></b><span tabIndex={0} data-help={T.reserveIncludedInPrivateCash}>{T.system.reserve}</span><b><NumericValue value={reserve} format="compactMoney"/></b><span>{T.system.manor}</span><b><NumericValue value={manor} format="compactMoney"/></b><span>{T.system.finance}</span><b><NumericValue value={finance} format="compactMoney"/></b></div>}
 </div>;
}
