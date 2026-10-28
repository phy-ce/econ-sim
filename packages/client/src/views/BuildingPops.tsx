import {useState} from 'react';
import {GOOD_IDS,POP_CLASSES} from '@econ/sim';
import type {Building,World,PopClass,GoodId} from '@econ/sim';
import {className,regionName,goodName,useLang} from '../i18n';
import {NumericValue} from '../NumericValue';
import {Bar} from '../ui';

/** Scope by actual work IDs, never by a region-wide household aggregate. */
export function BuildingPops({world,buildings,onGood,popIds}:{world:World;buildings:Building[];onGood:(id:GoodId)=>void;popIds?:number[]}){
 const ko=useLang()==='ko',ids=new Set(buildings.map(b=>b.id));
 const pops=world.pops.filter(p=>(popIds?popIds.includes(p.id):ids.has(p.work))&&p.size>0);
 const [selected,setSelected]=useState<PopClass|null>(null);
 const professions=POP_CLASSES.filter(c=>pops.some(p=>p.prof===c));
 const prof=selected&&professions.includes(selected)?selected:professions[0];
 const rows=pops.filter(p=>p.prof===prof),size=rows.reduce((n,p)=>n+p.size,0);
 const sum=(key:'lastIncome'|'lastSpend'|'savings'|'incomeEma')=>rows.reduce((n,p)=>n+p[key],0);
 const avg=(key:'sol'|'food'|'fulfillment'|'literacy'|'growth'|'wealth')=>size?rows.reduce((n,p)=>n+p[key]*p.size,0)/size:0;
 const [perHead,setPerHead]=useState(false),divisor=perHead?Math.max(1,size):1;
 const region=world.regions.find(r=>r.id===(pops[0]?.regionId??buildings[0]?.regionId));
 const goods=GOOD_IDS.map(g=>({g,qty:rows.reduce((n,p)=>n+(p.inKind[g]??0),0)})).filter(x=>x.qty>0);
 if(!region)return null;
 return <details className="building-pops" open><summary>{ko?'팝 통계':'Pop statistics'} · <NumericValue value={pops.reduce((n,p)=>n+p.size,0)} format="compact"/></summary>
 <div className="system-tabs" role="group" aria-label={ko?'건물 팝 직종':'Building pop profession'}>{professions.map(c=><button key={c} aria-pressed={prof===c} onClick={()=>setSelected(c)}>{className(c)} ↗</button>)}</div>
 {!rows.length?<p className="muted">{ko?'이 건물에 속한 팝이 없습니다.':'No pops attached to these buildings.'}</p>:<>
 <h4>{regionName(region)} · {className(prof)}</h4>
 <p className="muted" tabIndex={0} data-help={ko?'선택한 팝만 집계합니다. 인구는 부양가족을 포함하므로 위의 노동 인원과 다릅니다. 평균은 인구 가중치입니다.':'Only the selected population group. Population includes dependants; averages are population weighted.'}>{ko?'부양가족 포함 · 선택 팝 기준':'Includes dependants · selected pops'}</p>
 <div className="system-facts"><span>{ko?'인구':'Population'}<b><NumericValue value={size} format="compact"/></b></span><span>{ko?'팝 집단':'Groups'}<b>{rows.length}</b></span><span>{ko?'생활수준':'Living standard'}<b>{avg('sol').toFixed(1)}</b></span><span>{ko?'부 단계':'Wealth level'}<b>{avg('wealth').toFixed(1)}</b></span></div>
 <div className="system-tabs"><button aria-pressed={!perHead} onClick={()=>setPerHead(false)}>{ko?'집단 전체':'Total'}</button><button aria-pressed={perHead} onClick={()=>setPerHead(true)}>{ko?'1인당':'Per capita'}</button></div>
 <table className="system-table"><tbody>{([
 [ko?'세후 현금 소득 / 일':'After-tax cash income / day',sum('lastIncome')],
 [ko?'현금 지출 / 일':'Cash spending / day',sum('lastSpend')],
 [ko?'현금 수지 / 일':'Cash balance / day',sum('lastIncome')-sum('lastSpend')],
 [ko?'평균 소득 / 일':'Smoothed income / day',sum('incomeEma')],
 [ko?'저축':'Savings',sum('savings')],
 ] as [string,number][]).map(([name,value])=><tr key={name}><th tabIndex={0} data-help={ko?'직전 시뮬레이션 집계 값입니다. 현물은 현금 소득에 더하지 않고 아래에 따로 표시합니다.':'Last simulation values. In-kind goods are shown separately from cash.'}>{name}</th><td><NumericValue value={value/divisor} format="money"/></td></tr>)}</tbody></table>
 {(['food','fulfillment','literacy'] as const).map(key=><div className="workforce-row" key={key}><span>{({food:ko?'식량 충족':'Food',fulfillment:ko?'욕구 충족':'Needs',literacy:ko?'문해력':'Literacy'})[key]}</span><Bar value={avg(key)} label={key}/><b>{(avg(key)*100).toFixed(1)}%</b></div>)}
 <p>{ko?'인구 증감 · 연율':'Population growth · annual'} {avg('growth').toFixed(2)}%</p>
 <details open><summary>{ko?'소득·세금 세부 내역':'Income and tax breakdown'}</summary><table className="system-table"><tbody>{(['wages','dividends','rent','sales','welfare','other','tax'] as const).map(key=><tr key={key}><th tabIndex={0} data-help={ko?'직전 하루 이 팝 ID가 받은 현금 기록입니다. 임금에는 금융가 성과급, 기타에는 금고 환급이 포함됩니다. 주간 지급은 지급일에 표시합니다. 인구 이동 전 다른 팝의 과거 수입은 이전하지 않습니다.':'Cash received by this pop ID last day. Wages include staff bonuses; other includes treasury releases. Weekly payments appear on payment day. Earlier receipts do not move with people.'}>{(ko?{wages:'임금·성과급',dividends:'배당',rent:'지대',sales:'판매 수입',welfare:'복지',other:'기타·금고 환급',tax:'세금'}:{wages:'Wages / bonuses',dividends:'Dividends',rent:'Rent',sales:'Sales',welfare:'Welfare',other:'Other / treasury releases',tax:'Tax'})[key]}</th><td>{rows.every(p=>p.incomeBreakdown!==undefined)?<NumericValue value={rows.reduce((n,p)=>n+(p.incomeBreakdown?.[key]??0),0)/divisor} format="money"/>:<span tabIndex={0} data-help={ko?'이전 저장 데이터입니다. 하루 진행 후 기록됩니다.':'Older save: advance one day to record.'}>—</span>}</td></tr>)}</tbody></table></details>
 <details><summary>{ko?'현물 내역':'In-kind goods'} · {goods.length}</summary><table className="system-table"><tbody>{goods.map(({g,qty})=><tr key={g}><th><span>{goodName(g)}</span></th><td><NumericValue value={qty/divisor} format="compact"/></td><td data-help={ko?'현재 지역 가격으로 환산한 값이며 현금 수입이 아닙니다.':'Valued at current local price; not cash income.'}><NumericValue value={qty*region.market[g].price/divisor} format="money"/></td></tr>)}</tbody></table>{!goods.length&&<span>—</span>}</details>
 </>}
 </details>;
}
