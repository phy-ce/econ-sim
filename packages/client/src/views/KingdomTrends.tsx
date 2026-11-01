import type {World} from '@econ/sim';
import {useNavigationState} from '../NavigationHistory';
import {useT} from '../i18n';
import {compact,compactMoney,exactNumber} from '../format';
import {TimeChart} from './Chart';

export function KingdomTrends({world,id}:{world:World;id:number}){
 const T=useT(),[metric,setMetric]=useNavigationState(`kingdom-trends:${id}:metric`,'levels');
 const data=world.metrics.flatMap(p=>{const m=p.kingdoms[id];return m?[{tick:p.tick,state:m.levelsState,manor:m.levelsManor,finance:m.levelsFinance,unassigned:Math.max(0,m.levelsPrivate-m.levelsManor-m.levelsFinance),treasury:m.treasury-m.debt,private:m.privateCash+m.pool,gdp:m.gdp}]:[];});
 const labels={levels:T.buildingGroups.levels,money:T.cash,gdp:T.annualGdp};
 const series=metric==='levels'?[{key:'state',name:T.stateOwner,color:'var(--royal-owner)'},{key:'manor',name:T.system.manor,color:'var(--manor-owner)'},{key:'finance',name:T.system.finance,color:'var(--finance-owner)'},{key:'unassigned',name:T.system.none,color:'var(--unassigned-owner)'}]:metric==='money'?[{key:'treasury',name:T.treasury,color:'var(--royal-owner)'},{key:'private',name:T.privateOwner,color:'var(--finance-owner)'}]:[{key:'gdp',name:T.annualGdp,color:'var(--gold)'}];
 return <section className="kingdom-trends"><nav className="system-tabs">{Object.entries(labels).map(([key,label])=><button key={key} aria-pressed={metric===key} onClick={()=>setMetric(key)}>{label}</button>)}</nav>
 <ul className="legend">{series.map(s=><li key={s.key}><i className="swatch" style={{background:s.color}}/>{s.name}</li>)}</ul>
 <TimeChart data={data} series={series} stacked={metric==='levels'} format={metric==='levels'?compact:compactMoney} tooltipFormat={v=>`${metric==='levels'?'':'ƒ'}${exactNumber(v)}`} height={180} axisWidth={52}/>
 </section>;
}
