import {MetricRow} from '../system-02/blocks';
import {Users,ChartNoAxesCombined,Factory,UsersRound,Coins} from 'lucide-react';
import type {World} from '@econ/sim';
import {kingdomStats} from '../kingdomStats';
import {useT} from '../i18n';
import {exactNumber,pct} from '../format';
import {NumericValue} from '../NumericValue';

const colors={royal:'var(--royal-owner)',manor:'var(--manor-owner)',finance:'var(--finance-owner)',unassigned:'var(--unassigned-owner)'};
export function KingdomTotals({world,id}:{world:World;id:number}){
 const T=useT(),d=kingdomStats(world,id);
 const names={royal:T.stateOwner,manor:T.system.manor,finance:T.system.finance,unassigned:T.system.none};
 const bar=(parts:typeof d.parts)=>{const total=Object.values(parts).reduce((n,v)=>n+Math.max(0,v),0);return <span className="kingdom-total-bar" tabIndex={0} data-help={Object.entries(parts).map(([key,v])=>`${names[key as keyof typeof names]}: ${exactNumber(v)} · ${pct(total?Math.max(0,v)/total:0)}`).join('\n')}>{(Object.keys(colors) as (keyof typeof colors)[]).map(key=><i key={key} style={{width:`${total?Math.max(0,parts[key])/total*100:0}%`,background:colors[key]}}/>)}</span>;};
 return <div className="kingdom-totals es-metric-list">
 <MetricRow label={T.population} icon={<Users/>} value={<NumericValue value={d.population} format="compact"/>}/>
 <MetricRow label={T.weeklyGdp} icon={<ChartNoAxesCombined/>} value={<NumericValue value={d.gdp/360*7} format="money"/>}/>
 <MetricRow label={T.buildingGroups.levels} icon={<Factory/>} value={<NumericValue value={d.levels} format="compact"/>} track={bar(d.parts)}/>
 <MetricRow label={T.hStaff} icon={<UsersRound/>} value={<><NumericValue value={d.employed} format="compact"/> / <NumericValue value={d.jobs} format="compact"/></>} track={bar(d.employment)}/>
 <MetricRow label={T.system.weekProfit} icon={<Coins/>} value={<span className={d.profit<0?'neg':'pos'}><NumericValue value={d.profit} format="signedMoney"/></span>} help={Object.entries(d.profits).map(([key,value])=>names[key as keyof typeof names]+': '+exactNumber(value)).join('\n')}/>
 </div>;
}