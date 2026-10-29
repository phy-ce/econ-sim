import {Users,TrendingUp,TrendingDown,Layers} from 'lucide-react';
import {useLang,useT} from '../i18n';
import {compact,compactMoney,exactNumber,pct} from '../format';
import {NumericValue} from '../NumericValue';
import {DetailWindow} from './DetailWindow';

export function BuildingMetricBars({employed,jobs,profit,perLevel}:{employed?:number;jobs?:number;profit:number;perLevel:number}){
 const ko=useLang()==='ko',S=useT().system;
 const staffing=jobs&&jobs>0?(employed??0)/jobs:0;
 const rows=[...(employed!==undefined&&jobs!==undefined?[{id:'staff',label:ko?'충원':'Staffing',value:employed,display:`${compact(employed)} / ${compact(jobs)}`,suffix:jobs>0?pct(staffing):'—',fill:Math.max(0,Math.min(1,staffing)),color:'#246f96',Icon:Users,help:ko?'현재 고용 인구 / 필요한 직원 수':'Employed population / required staff'}]:[]),
 {id:'profit',label:S.weekProfit,value:profit,display:`${profit>=0?'+':''}${compactMoney(profit)}`,suffix:ko?'/ 주':'/ wk',fill:1,color:profit<0?'#993c35':profit>0?'#286950':'#414b54',Icon:profit<0?TrendingDown:TrendingUp,help:ko?'건물의 합산 주간 이익입니다. 색은 흑자·적자를 뜻하며 충전율이 아닙니다.':'Combined weekly profit. Color indicates profit or loss, not a fill percentage.'},
 {id:'level',label:ko?'레벨당 이익':'Profit / level',value:perLevel,display:`${perLevel>=0?'+':''}${compactMoney(perLevel)}`,suffix:ko?'/ 주·L':'/ wk·L',fill:1,color:perLevel<0?'#993c35':perLevel>0?'#286950':'#414b54',Icon:Layers,help:ko?'주간 이익을 건물 총 레벨로 나눈 값입니다.':'Weekly profit divided by total building levels.'}];
 return <div className="building-metric-bars">{rows.map(r=><DetailWindow key={r.id} title={r.label} help={`${r.help}\n${exactNumber(r.value)}${r.id==='staff'?` / ${exactNumber(jobs!)}`:''}`} triggerContent={<span className="ownership-meter reserve-meter metric-meter">
 <span className="reserve-fill" style={{width:`${r.fill*100}%`,background:r.color}} aria-hidden="true"/>
 <span className="reserve-label"><r.Icon size={15}/><b>{r.label}</b><strong>{r.display}</strong><b>{r.suffix}</b></span>
 </span>}><dl className="reserve-details"><div><dt>{r.label}</dt><dd><NumericValue value={r.value} format={r.id==='staff'?'compact':'signedMoney'}/></dd></div>{r.id==='staff'?<><div><dt>{ko?'필요 인원':'Required staff'}</dt><dd><NumericValue value={jobs!} format="compact"/></dd></div><div><dt>{ko?'충원율':'Staffing rate'}</dt><dd>{r.suffix}</dd></div></>:<div><dt>{ko?'기준':'Basis'}</dt><dd>{r.id==='level'?(ko?'1레벨 · 1주':'1 level · 1 week'):(ko?'전체 레벨 · 1주':'All levels · 1 week')}</dd></div>}</dl></DetailWindow>)}</div>;
}
