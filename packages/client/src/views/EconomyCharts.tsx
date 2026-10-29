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
 const labels:Record<Metric,string>=ko?{gdp:'경제 규모 · 연간 GDP',perHead:'1인당 연간 GDP',pop:'인구',sol:'평균 생활수준',unemployment:'실업 인구 비율',literacy:'문해력',treasury:'국고 현금',debt:'국채 잔액',savings:'가계 저축'}:{gdp:'Economy · annual GDP',perHead:'Annual GDP per capita',pop:'Population',sol:'Mean living standard',unemployment:'Jobless population share',literacy:'Literacy',treasury:'Treasury cash',debt:'Government debt',savings:'Household savings'};
 const members=world.kingdoms.filter(k=>!hidden.includes(k.id));
 const series=members.map(k=>({key:String(k.id),name:ko?k.name:k.nameEn,color:k.color}));
 const records=useMemo(()=>world.metrics.filter(p=>!period||p.tick>=world.tick-period),[world.metrics,world.tick,period]);
 const data=(metric:Metric)=>records.map(p=>{const row:Record<string,number>={tick:p.tick};for(const k of members){const m=p.kingdoms[k.id];if(!m)continue;const value=metric==='perHead'?(m.pop>0?m.gdp/m.pop:NaN):metric==='sol'?(m.pop>0?Object.entries(m.popBy).reduce((s,[c,n])=>s+n*(m.solBy[c as keyof typeof m.solBy]??NaN),0)/m.pop:NaN):metric==='unemployment'?m.joblessShare:m[metric];if(Number.isFinite(value))row[String(k.id)]=value;}return row;});
 const money=(metric:Metric)=>['gdp','perHead','treasury','debt','savings'].includes(metric);
 const ratio=(metric:Metric)=>metric==='unemployment'||metric==='literacy';
 return <div className="economy-charts">
 <nav className="system-tabs" aria-label={ko?'통계 분야':'Statistics group'}>{(Object.keys(groups) as (keyof typeof groups)[]).map(g=><button key={g} aria-pressed={g===group} onClick={()=>setGroup(g)}>{({economy:ko?'경제':'Economy',living:ko?'인구·생활':'Population',finance:ko?'재정':'Finance'})[g]}</button>)}</nav>
 <div className="chart-period" role="group" aria-label={ko?'기간':'Period'}>{[360,1800,0].map(days=><button key={days} aria-pressed={period===days} onClick={()=>setPeriod(days)}>{days===0?(ko?'전체':'All'):days===360?(ko?'1년':'1 year'):(ko?'5년':'5 years')}</button>)}<small tabIndex={0} data-help={ko?'30일마다 기록한 값입니다. 기록이 없는 기간은 보간하거나 현재 값으로 채우지 않습니다.':'Recorded every 30 days. Missing history is not filled with current values.'}>{ko?'월별 기록':'Monthly records'}</small></div>
 <div className="chart-kingdoms" role="group" aria-label={ko?'비교 왕국':'Compare kingdoms'}>{world.kingdoms.map(k=><button key={k.id} aria-pressed={!hidden.includes(k.id)} onClick={()=>setHidden(ids=>ids.includes(k.id)?ids.filter(id=>id!==k.id):[...ids,k.id])}><i style={{background:k.color}}/>{ko?k.name:k.nameEn}</button>)}</div>
 {!members.length?<p className="muted">{ko?'비교할 왕국을 선택하세요.':'Select a kingdom to compare.'}</p>:groups[group].map(metric=><section className="economic-chart" key={metric}><h4 tabIndex={0} data-help={metric==='gdp'||metric==='perHead'?(ko?'가계 일일 소득 이동평균의 합계 × 360일로 추정합니다. 1인당 값은 같은 시점의 인구로 나눕니다.':'Estimated as the sum of daily household income moving averages × 360 days. Per-capita values use population at the same date.'):metric==='treasury'?(ko?'국고 현금입니다. 국채를 차감한 순금고가 아닙니다.':'Treasury cash before subtracting government debt.'):metric==='sol'?(ko?'직종별 생활수준을 인구로 가중한 평균입니다.':'Population-weighted mean of class living standards.'):labels[metric]}>{labels[metric]}</h4>{records.length<2?<p className="muted chart-pending">{ko?'월별 기록 2개부터 그래프가 표시됩니다.':'Charts appear after two monthly records.'}</p>:<TimeChart data={data(metric)} series={series} format={v=>ratio(metric)?`${(v*100).toFixed(0)}%`:money(metric)?compactMoney(v):metric==='sol'?v.toFixed(1):compact(v)} tooltipFormat={v=>ratio(metric)?`${(v*100).toFixed(2)}%`:`${money(metric)?'ƒ':''}${exactNumber(v)}`} height={180}/>}</section>)}
 </div>;
}
