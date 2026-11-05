import {t as uiCopy} from '../i18n';
import {useId} from 'react';
import {useNavigationState} from '../NavigationHistory';
import {GOOD_IDS,POP_CLASSES} from '@econ/sim';
import type {Building,World,PopClass,GoodId} from '@econ/sim';
import {className,regionName,goodName,useLang,useT} from '../i18n';
import {NumericValue} from '../NumericValue';
import {Bar} from '../ui';
import {PopHoldings} from './PopHoldings';
import {WealthDrift} from './WealthDrift';
import {wealthSummary} from '../wealthSummary';

/** Scope by actual work IDs, never by a region-wide household aggregate. */
export function BuildingPops({world,buildings,onGood,popIds}:{world:World;buildings:Building[];onGood:(id:GoodId)=>void;popIds?:number[]}){
 const scope=useId(),T=useT();
 const ko=useLang()==='ko',ids=new Set(buildings.map(b=>b.id));
 const pops=world.pops.filter(p=>(popIds?popIds.includes(p.id):ids.has(p.work))&&p.size>0);
 const [selected,setSelected]=useNavigationState<PopClass|null>(scope+':profession',null);
 const professions=POP_CLASSES.filter(c=>pops.some(p=>p.prof===c));
 const prof=selected&&professions.includes(selected)?selected:professions[0];
 const rows=pops.filter(p=>p.prof===prof),size=rows.reduce((n,p)=>n+p.size,0);
 const drivers=wealthSummary(world,rows);
 const sum=(key:'lastIncome'|'lastSpend'|'savings'|'incomeEma')=>rows.reduce((n,p)=>n+p[key],0);
 const avg=(key:'sol'|'food'|'fulfillment'|'literacy'|'growth'|'wealth')=>size?rows.reduce((n,p)=>n+p[key]*p.size,0)/size:0;
 const [perHead,setPerHead]=useNavigationState(scope+':per-head',true),divisor=perHead?Math.max(1,size):1;
 const region=world.regions.find(r=>r.id===(pops[0]?.regionId??buildings[0]?.regionId));
 const goods=GOOD_IDS.map(g=>({g,qty:rows.reduce((n,p)=>n+(p.inKind[g]??0),0)})).filter(x=>x.qty>0);
 if(!region)return null;
 return <details className="building-pops" open><summary>{uiCopy().screenText['popStatistics']} · <NumericValue value={pops.reduce((n,p)=>n+p.size,0)} format="compact"/></summary>
 <div className="system-tabs" role="group" aria-label={uiCopy().screenText['buildingPopProfession']}>{professions.map(c=><button key={c} aria-pressed={prof===c} onClick={()=>setSelected(c)}>{className(c)} ↗</button>)}</div>
 {!rows.length?<p className="muted">—</p>:<>
 <h4>{regionName(region)} · {className(prof)}</h4>
 <p className="muted" tabIndex={0} data-help={uiCopy().screenText['onlyTheSelectedPopulationGroupPopulationIncludes']}>{uiCopy().screenText['includesDependantsSelectedPops']}</p>
 <div className="system-facts"><span>{uiCopy().screenText['population']}<b><NumericValue value={size} format="compact"/></b></span><span>{uiCopy().screenText['groups']}<b>{rows.length}</b></span><span>{uiCopy().screenText['livingStandard']}<b>{avg('sol').toFixed(1)}</b></span><span>{uiCopy().screenText['wealthLevel']}<b>{avg('wealth').toFixed(1)}</b></span><span>{T.savingsCosts}<b>{drivers.savingsWeeks===null?'—':drivers.savingsWeeks.toFixed(1)} {T.system.weeks}</b></span></div>
 <div className="system-tabs"><button aria-pressed={!perHead} onClick={()=>setPerHead(false)}>{uiCopy().screenText['total']}</button><button aria-pressed={perHead} onClick={()=>setPerHead(true)}>{uiCopy().screenText['perCapita']}</button></div>
 <WealthDrift data={drivers} perHead={perHead}/>
 <table className="system-table"><tbody>{([
 [uiCopy().screenText['afterTaxCashIncomeDay'],sum('lastIncome')],
 [uiCopy().screenText['cashSpendingDay'],sum('lastSpend')],
 [uiCopy().screenText['cashBalanceDay'],sum('lastIncome')-sum('lastSpend')],
 [uiCopy().screenText['smoothedIncomeDay'],sum('incomeEma')],
 [uiCopy().screenText['savings'],sum('savings')],
 ] as [string,number][]).map(([name,value])=><tr key={name}><th tabIndex={0} data-help={uiCopy().screenText['lastSimulationValuesInKindGoodsAre']}>{name}</th><td><NumericValue value={value/divisor} format="money"/></td></tr>)}</tbody></table>
 {(['food','fulfillment','literacy'] as const).map(key=><div className="workforce-row" key={key}><span>{({food:uiCopy().screenText['food'],fulfillment:uiCopy().screenText['needs'],literacy:uiCopy().screenText['literacy']})[key]}</span><Bar value={avg(key)} label={key}/><b>{(avg(key)*100).toFixed(1)}%</b></div>)}
 <p>{uiCopy().screenText['populationGrowthAnnual']} {avg('growth').toFixed(2)}%</p>
 <details open><summary>{uiCopy().screenText['incomeAndTaxBreakdown']}</summary><WealthDrift data={drivers} perHead={perHead}/>
 <table className="system-table"><tbody>{(['wages','dividends','rent','sales','welfare','other','tax'] as const).map(key=><tr key={key}><th tabIndex={0} data-help={uiCopy().screenText['cashReceivedByThisPopIDLast']}>{(uiCopy().screenLists.incomeLabels)[key]}</th><td>{rows.every(p=>p.incomeBreakdown!==undefined)?<NumericValue value={rows.reduce((n,p)=>n+(p.incomeBreakdown?.[key]??0),0)/divisor} format="money"/>:<span tabIndex={0} data-help={uiCopy().screenText['olderSaveAdvanceOneDayToRecord']}>—</span>}</td></tr>)}</tbody></table></details>
 <details><summary>{uiCopy().screenText['inKindGoods']} · {goods.length}</summary><table className="system-table"><tbody>{goods.map(({g,qty})=><tr key={g}><th><span>{goodName(g)}</span></th><td><NumericValue value={qty/divisor} format="compact"/></td><td data-help={uiCopy().screenText['valuedAtCurrentLocalPriceNotCash']}><NumericValue value={qty*region.market[g].price/divisor} format="money"/></td></tr>)}</tbody></table>{!goods.length&&<span>—</span>}</details>
 <PopHoldings world={world} pops={rows}/>
 </>}
 </details>;
}
