import {t as uiCopy} from '../i18n';
import {Users,TrendingUp,TrendingDown,Layers} from 'lucide-react';
import {useLang,useT} from '../i18n';
import {compact,compactMoney,exactNumber,pct} from '../format';
import {NumericValue} from '../NumericValue';
import {DetailWindow} from './DetailWindow';

export function BuildingMetricBars({employed,jobs,profit,perLevel}:{employed?:number;jobs?:number;profit:number;perLevel:number}){
 const ko=useLang()==='ko',S=useT().system;
 const staffing=jobs&&jobs>0?(employed??0)/jobs:0;
 const rows=[...(employed!==undefined&&jobs!==undefined?[{id:'staff',label:uiCopy().screenText['staffing'],value:employed,display:`${compact(employed)} / ${compact(jobs)}`,suffix:jobs>0?pct(staffing):'—',fill:Math.max(0,Math.min(1,staffing)),color:'var(--gu-action)',Icon:Users,help:uiCopy().screenText['employedPopulationRequiredStaff']}]:[]),
 {id:'profit',label:S.weekProfit,value:profit,display:`${profit>=0?'+':''}${compactMoney(profit)}`,suffix:uiCopy().screenText['wk'],fill:1,color:profit<0?'var(--gu-negative)':profit>0?'var(--gu-positive)':'var(--gu-muted)',Icon:profit<0?TrendingDown:TrendingUp,help:uiCopy().screenText['combinedWeeklyProfitColorIndicatesProfitOr']},
 {id:'level',label:uiCopy().screenText['profitLevel'],value:perLevel,display:`${perLevel>=0?'+':''}${compactMoney(perLevel)}`,suffix:uiCopy().screenText['wkL'],fill:1,color:perLevel<0?'var(--gu-negative)':perLevel>0?'var(--gu-positive)':'var(--gu-muted)',Icon:Layers,help:uiCopy().screenText['weeklyProfitDividedByTotalBuildingLevels']}];
 return <div className="building-metric-bars">{rows.map(r=><DetailWindow key={r.id} title={r.label} help={`${r.help}\n${exactNumber(r.value)}${r.id==='staff'?` / ${exactNumber(jobs!)}`:''}`} triggerContent={<span className="ownership-meter reserve-meter metric-meter">
 <span className="reserve-fill" style={{width:`${r.fill*100}%`,background:r.color}} aria-hidden="true"/>
 <span className="reserve-label"><r.Icon size={15}/><b>{r.label}</b><strong>{r.display}</strong><b>{r.suffix}</b></span>
 </span>}><dl className="reserve-details"><div><dt>{r.label}</dt><dd><NumericValue value={r.value} format={r.id==='staff'?'compact':'signedMoney'}/></dd></div>{r.id==='staff'?<><div><dt>{uiCopy().screenText['requiredStaff']}</dt><dd><NumericValue value={jobs!} format="compact"/></dd></div><div><dt>{uiCopy().screenText['staffingRate']}</dt><dd>{r.suffix}</dd></div></>:<div><dt>{uiCopy().screenText['basis']}</dt><dd>{r.id==='level'?(uiCopy().screenText['1Level1Week']):(uiCopy().screenText['allLevels1Week'])}</dd></div>}</dl></DetailWindow>)}</div>;
}
