import {Button as UIButton} from '../ui/controls';
import {t as uiCopy} from '../i18n';
import {useMemo} from 'react';
import type {World} from '@econ/sim';
import {useNavigationState} from '../NavigationHistory';
import {useLang} from '../i18n';
import {compact,compactMoney,exactNumber} from '../format';
import {TimeChart} from './Chart';
type Metric='gdp'|'perHead'|'pop'|'sol'|'unemployment'|'literacy'|'treasury'|'debt'|'savings';
const groups={economy:['gdp','perHead'],living:['pop','sol','unemployment','literacy'],finance:['treasury','debt','savings']} as const;
export function EconomyCharts({world}:{world:World}){
 const ko=useLang()==='ko';
 const [group,setGroup]=useNavigationState<keyof typeof groups>('economic-charts:group','economy');
 const [period,setPeriod]=useNavigationState('economic-charts:period',0);
 const [hidden,setHidden]=useNavigationState<number[]>('economic-charts:hidden',[]);
 const labels:Record<Metric,string>=uiCopy().screenLists.metricLabels;
 const members=world.kingdoms.filter(k=>!hidden.includes(k.id));
 const series=members.map(k=>({key:String(k.id),name:ko?k.name:k.nameEn,color:k.color}));
 const records=useMemo(()=>world.metrics.filter(p=>!period||p.tick>=world.tick-period),[world.metrics,world.tick,period]);
 const data=(metric:Metric)=>records.map(p=>{const row:Record<string,number>={tick:p.tick};for(const k of members){const m=p.kingdoms[k.id];if(!m)continue;const value=metric==='perHead'?(m.pop>0?m.gdp/m.pop:NaN):metric==='sol'?(m.pop>0?Object.entries(m.popBy).reduce((s,[c,n])=>s+n*(m.solBy[c as keyof typeof m.solBy]??NaN),0)/m.pop:NaN):metric==='unemployment'?m.joblessShare:m[metric];if(Number.isFinite(value))row[String(k.id)]=value;}return row;});
 const money=(metric:Metric)=>['gdp','perHead','treasury','debt','savings'].includes(metric);
 const ratio=(metric:Metric)=>metric==='unemployment'||metric==='literacy';
 return <div className="economy-charts">
 <nav className="system-tabs" aria-label={uiCopy().screenText['statisticsGroup']}>{(Object.keys(groups) as (keyof typeof groups)[]).map(g=><UIButton key={g} aria-pressed={g===group} onClick={()=>setGroup(g)}>{({economy:uiCopy().screenText['economy'],living:uiCopy().screenText['population68'],finance:uiCopy().screenText['finance']})[g]}</UIButton>)}</nav>
 <div className="chart-period" role="group" aria-label={uiCopy().screenText['period']}>{[360,1800,0].map(days=><UIButton key={days} aria-pressed={period===days} onClick={()=>setPeriod(days)}>{days===0?(uiCopy().screenText['all']):days===360?(uiCopy().screenText['1Year']):(uiCopy().screenText['5Years'])}</UIButton>)}<small tabIndex={0} data-help={uiCopy().screenText['recordedEvery30DaysMissingHistoryIs']}>{uiCopy().screenText['monthlyRecords']}</small></div>
 <div className="chart-kingdoms" role="group" aria-label={uiCopy().screenText['compareKingdoms']}>{world.kingdoms.map(k=><UIButton key={k.id} aria-pressed={!hidden.includes(k.id)} onClick={()=>setHidden(ids=>ids.includes(k.id)?ids.filter(id=>id!==k.id):[...ids,k.id])}><i style={{background:k.color}}/>{ko?k.name:k.nameEn}</UIButton>)}</div>
 {!members.length?<p className="muted" tabIndex={0} data-help={uiCopy().screenText['selectAKingdomToCompare']}>—</p>:groups[group].map(metric=><section className="economic-chart" key={metric}><h4 tabIndex={0} data-help={metric==='gdp'||metric==='perHead'?(uiCopy().screenText['estimatedAsTheSumOfDailyHousehold']):metric==='treasury'?(uiCopy().screenText['treasuryCashBeforeSubtractingGovernmentDebt']):metric==='sol'?(uiCopy().screenText['populationWeightedMeanOfClassLivingStandards']):labels[metric]}>{labels[metric]}</h4>{records.length<2?<p className="muted chart-pending" tabIndex={0} data-help={uiCopy().screenText['chartsAppearAfterTwoMonthlyRecords']}>—</p>:<TimeChart data={data(metric)} series={series} format={v=>ratio(metric)?`${(v*100).toFixed(0)}%`:money(metric)?compactMoney(v):metric==='sol'?v.toFixed(1):compact(v)} tooltipFormat={v=>ratio(metric)?`${(v*100).toFixed(2)}%`:`${money(metric)?'ƒ':''}${exactNumber(v)}`} height={180}/>}</section>)}
 </div>;
}
