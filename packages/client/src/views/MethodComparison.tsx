import {BUILDING_BY_ID,GOOD_IDS,SKILLS,TUNE,estimateMethod,knowsTech,regionPerk,tradeReserveOf,wagesAt,methodMarginAtBase} from '@econ/sim';
import {IndustryLabel} from './IndustryLabel';
import type {Building,Company,MethodDef,World} from '@econ/sim';
import {Lock} from 'lucide-react';
import type {Game} from '../useGame';
import {goodName,methodName,skillName,techName,useT} from '../i18n';
import {ClassSprite,GoodSprite} from '../sprites';
import {NumericValue} from '../NumericValue';
import {compact,signedMoney} from '../format';
import type {ReactNode} from 'react';

export function MethodComparison({world,building:b,owner,game}:{world:World;building:Building;owner:Company;game:Game}){
 const T=useT(),methods=[...BUILDING_BY_ID[b.typeId].methods].sort((a,c)=>Number(c.id===b.methodId)-Number(a.id===b.methodId));
 const current=methods.find(m=>m.id===b.methodId)!,wages=wagesAt(owner,b.typeId,world,b.regionId);
 const estimates=new Map(methods.map(m=>[m.id,estimateMethod(world,b.regionId,b.typeId,m.id,wages,b.stateOwned)]));
 const quantity=(value:number,format:'count'|'money'|'ratio')=>format==='ratio'?`${(value*100).toFixed(2)}%`:<NumericValue value={value} format={format==='money'?'signedMoney':'compact'}/>;
 const row=(key:string,label:ReactNode,value:(m:MethodDef)=>number|null,format:'count'|'money'|'ratio'='count')=>{
  const base=value(current);return <tr key={key}><th>{label}</th>{methods.map(m=>{const v=value(m),delta=v!==null&&base!==null?v-base:0;return <td key={m.id} className={`${m.id===b.methodId?'is-current ':''}${!knowsTech(owner,m.tech)?'is-locked':''}`}>
   {v===null?'—':quantity(v,format)}{m.id!==b.methodId&&Math.abs(delta)>1e-9&&<small className={`method-delta ${delta>0?'pos':'neg'}`}>{format==='money'?signedMoney(delta):`${delta>0?'+':'−'}${format==='ratio'?`${(Math.abs(delta)*100).toFixed(2)}%`:compact(Math.abs(delta))}`}</small>}
  </td>;})}</tr>;
 };
 return <details className="method-comparison"><summary>{methodName(current)} · ×{b.level}</summary><div className="method-columns"><table style={{minWidth:90+methods.length*110}}>
  <thead><tr><th>×{b.level}</th>{methods.map(m=>{const locked=!knowsTech(owner,m.tech);return <th key={m.id} tabIndex={locked?0:undefined} data-help={locked&&m.tech?techName(m.tech):undefined} className={m.id===b.methodId?'is-current':''}>
   <button disabled={locked||m.id===b.methodId} aria-pressed={m.id===b.methodId} data-help={locked&&m.tech?techName(m.tech):methodName(m)} onClick={()=>game.command({type:'setMethod',buildingId:b.id,methodId:m.id})}>{locked&&<Lock size={14}/>} {methodName(m)}</button>
   <IndustryLabel typeId={b.typeId} methodId={m.id}/>{m.id!==b.methodId&&<small>{T.expDrop}</small>}
  </th>;})}</tr></thead><tbody>
  {GOOD_IDS.filter(g=>methods.some(m=>m.inputs[g])).map(g=>row(`in-${g}`,<span><GoodSprite g={g} size={24}/>{T.hInputs} · {goodName(g)}</span>,m=>(m.inputs[g]??0)*b.level))}
  {GOOD_IDS.filter(g=>methods.some(m=>m.outputs[g])).map(g=>row(`out-${g}`,<span><GoodSprite g={g} size={24}/>{T.hOutput} · {goodName(g)}</span>,m=>(m.outputs[g]??0)*b.level*(1+regionPerk(b.regionId,b.typeId))))}
  {methods.some(m=>m.construction)&&row('points',T.buildPts,m=>(m.construction??0)*b.level)}
  {methods.some(m=>m.taxCapacity)&&row('tax',T.taxCapacity,m=>(m.taxCapacity??0)*b.level*TUNE.adminScale)}
  {methods.some(m=>m.seats)&&row('seats',T.schoolSeats,m=>(m.seats??0)*b.level)}
  {b.typeId==='trading_post'&&row('trade-reserve',T.tradeReserveLevel,m=>tradeReserveOf(m.id),'money')}
  {SKILLS.filter(s=>methods.some(m=>m.workers[s])).map(s=>row(`job-${s}`,<span><ClassSprite c={s} size={24}/>{skillName(s)}</span>,m=>(m.workers[s]??0)*b.level))}
  {row('profit',`${T.system.profit} ${T.perDay}`,m=>estimates.get(m.id)!.profit*b.level,'money')}
  {row('margin',T.margin,m=>{const e=estimates.get(m.id)!;return e.revenue>0?e.profit/e.revenue:null;},'ratio')}
  {row('input-share',T.inputRevenueRatio,m=>{const e=methodMarginAtBase(b.typeId,m.id);return e.revenue>0?e.input/e.revenue:null;},'ratio')}
 </tbody></table></div></details>;
}
