import type {World} from '@econ/sim';
import {kingdomStats} from '../kingdomStats';
import {useT} from '../i18n';
import {exactNumber,pct} from '../format';
import {NumericValue} from '../NumericValue';
import '../kingdom-economy.css';

const colors={royal:'var(--royal-owner)',manor:'var(--manor-owner)',finance:'var(--finance-owner)',unassigned:'var(--unassigned-owner)'};
export function KingdomTotals({world,id}:{world:World;id:number}){
 const T=useT(),d=kingdomStats(world,id);
 const names={royal:T.stateOwner,manor:T.system.manor,finance:T.system.finance,unassigned:T.system.none};
 const bar=(parts:typeof d.parts)=>{const total=Object.values(parts).reduce((n,v)=>n+Math.max(0,v),0);return <span className="kingdom-total-bar" tabIndex={0} data-help={Object.entries(parts).map(([key,v])=>`${names[key as keyof typeof names]}: ${exactNumber(v)} · ${pct(total?Math.max(0,v)/total:0)}`).join('\n')}>{(Object.keys(colors) as (keyof typeof colors)[]).map(key=><i key={key} style={{width:`${total?Math.max(0,parts[key])/total*100:0}%`,background:colors[key]}}/>)}</span>;};
 return <div className="kingdom-totals">
 <div><span>{T.population}</span><b><NumericValue value={d.population} format="compact"/></b></div>
 <div><span>{T.weeklyGdp}</span><b><NumericValue value={d.gdp/360*7} format="money"/></b></div>
 <div><span>{T.colBuildings}</span><b><NumericValue value={d.levels} format="compact"/></b>{bar(d.parts)}</div>
 <div><span>{T.hStaff}</span><b><NumericValue value={d.employed} format="compact"/> / <NumericValue value={d.jobs} format="compact"/></b>{bar(d.employment)}</div>
 <div><span>{T.system.weekProfit}</span><b className={d.profit<0?'neg':'pos'}><NumericValue value={d.profit} format="signedMoney"/></b>{bar(d.profits)}</div>
 </div>;
}
