import { Wages } from './CompanyPanel';
import { SortHeader } from './SortHeader';
import { useState, useEffect } from 'react';
import { TUNE, creditLimit, budgetPreview, budgetDrill, roundBudget } from '@econ/sim';
import type { BudgetLineKey, Company, World } from '@econ/sim';
import type { Game } from '../useGame';
import { NumericValue } from '../NumericValue';
import { buildingName, className, goodName, regionName, useT } from '../i18n';
import { exactNumber, pct } from '../format';
import '../system-ui.css';

export function FinancePanel({game,world,me,onBuilding,onPolicies,active=true}:{active?:boolean;game:Game;world:World;me:Company;onBuilding?:(id:number)=>void;onPolicies?:()=>void}) {
 const T=useT(),S=T.system;
 const [detail,setDetail]=useState<BudgetLineKey|null>(null);
 const [direction,setDirection]=useState(-1);
 const [breakdown,setBreakdown]=useState(false);
 useEffect(()=>setBreakdown(false),[detail]);
 useEffect(()=>{if(!active){setDetail(null);setHover(null);}},[active]);
 const [popup,setPopup]=useState({left:456,top:100});
 const [hover,setHover]=useState<{knob:'tax'|'wages'|'welfare';level:number}|null>(null);
 useEffect(()=>{if(!detail)return;const close=(e:KeyboardEvent)=>{if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();setDetail(null);}};document.addEventListener('keydown',close,true);return()=>document.removeEventListener('keydown',close,true);},[detail]);
 const k=world.kingdoms.find(k=>k.id===me.kingdomId);
 if(!k)return null;
 const preview=budgetPreview(world,k.id),drill=detail?budgetDrill(world,k.id,detail,hover?{[hover.knob]:hover.level}:undefined):null;
 const secondary=drill?.key==='goods'?drill.byGood:drill?.key==='tariffs'?drill.byPartner:null;
 const label=(key:BudgetLineKey)=>T.budgetLines[key]??key;
 const multipliers={tax:TUNE.taxLevels,wages:TUNE.govWageLevels,welfare:TUNE.welfareLevels};
 const region=(id:number)=>{const r=world.regions.find(r=>r.id===id);return r?regionName(r):String(id);};
 return <div className="system-panel finance-ledger">
  <div className="system-facts"><span title={`${T.cash}: ${exactNumber(me.cash)}\n${T.loan}: ${exactNumber(me.debt)}`}>{T.treasury}<b><NumericValue value={me.cash-me.debt} format="money"/> / <NumericValue value={creditLimit(world,me)} format="money"/></b></span><span>{T.budgetNet}<b className={preview.net<0?'neg':'pos'}><NumericValue value={roundBudget(preview.net)} format="signedMoney"/></b></span></div>
  <button className="entity-link" onClick={onPolicies}>{S.policies} ↗</button>
  <table className="system-table"><thead><tr><th>{S.item}</th><th>{T.weeklyBudget}</th></tr></thead>
   {preview.groups.map(group=><tbody key={group.knob}><tr className="system-group"><th colSpan={2}><div><span>{S[group.knob]} <NumericValue value={group.weekly} format="signedMoney"/></span>{group.knob!=='fixed'&&<span className="policy-steps" role="group" aria-label={S[group.knob]}>{[1,2,3,4,5].map(level=>{const knob=group.knob as 'tax'|'wages'|'welfare';return <button key={level} aria-pressed={k.budget[knob]===level} data-help={`${S[knob]} ${level} · ${knob==='welfare'?S.target:'×'} ${multipliers[knob][level-1]}\n${T.weeklyBudget}: ${exactNumber(group.byLevel?.[level-1]??0)}\n${T.budgetNet}: ${exactNumber(preview.netByLevel[knob][level-1])}`} onMouseEnter={()=>setHover({knob,level})} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover({knob,level})} onBlur={()=>setHover(null)} onClick={()=>game.command({type:'setBudget',item:knob,value:level})}>{level}</button>;})}</span>}</div></th></tr>
    {group.lines.map(key=>{const line=preview.lines.find(l=>l.key===key)!;return <tr key={key}><th><button className="entity-link" aria-expanded={detail===key} onClick={e=>{const panel=e.currentTarget.closest('.strategy-panel')!.getBoundingClientRect();const row=e.currentTarget.getBoundingClientRect();setPopup({left:panel.left<window.innerWidth/2?panel.right+8:panel.left-368,top:Math.max(52,Math.min(row.top,window.innerHeight-606))});setDetail(detail===key?null:key);}}>{label(key)} ↗ {key==='tax'&&<small>{pct(k.taxRatio??0)}</small>}</button></th><td className={line.weekly<0?'neg':'pos'}><NumericValue value={roundBudget(hover&&line.knob===hover.knob?(line.byLevel?.[hover.level-1]??line.weekly):line.weekly)} format="signedMoney"/></td></tr>;})}
   </tbody>)}<tfoot><tr><th>{T.budgetNet}</th><td><NumericValue value={roundBudget(preview.net)} format="signedMoney"/></td></tr></tfoot>
  </table>
  <details><summary>{S.marketWages}</summary><Wages game={game} world={world} me={me}/></details>
  {drill&&<aside style={popup} className="budget-detail" role="dialog" aria-label={`${label(drill.key)} · ${S.details}`} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setDetail(null);}}}>
   <header><strong>{label(drill.key)}</strong><button aria-label={T.windowClose} onClick={()=>setDetail(null)}>×</button></header>
   <div className="budget-detail-body">
    <b><NumericValue value={drill.weekly} format="signedMoney"/> / {S.week}</b>
    {'collection' in drill&&<p>{T.taxCollection} {pct(drill.collection)}</p>}
    {'target' in drill&&<p>{S.target} {drill.target}</p>}
    {'debt' in drill&&<p><NumericValue value={drill.debt} format="money"/> × {pct(drill.dailyRate)} × 7</p>}
    {secondary&&<div className="system-tabs"><button aria-pressed={!breakdown} onClick={()=>setBreakdown(false)}>{S.details}</button><button aria-pressed={breakdown} onClick={()=>setBreakdown(true)}>{drill.key==='goods'?T.system.goods:T.system.kingdom}</button></div>}
    {'laws' in drill&&<div className="system-facts">{drill.laws.map(l=><span key={l.law}>{S[l.law]}<b><NumericValue value={l.weekly} format="signedMoney"/></b></span>)}</div>}
    {breakdown&&secondary?<table className="system-table"><tbody>{[...secondary].sort((a,b)=>Math.abs(b.weekly)-Math.abs(a.weekly)).map((r,i)=><tr key={i}><th>{'good' in r?goodName(r.good):world.kingdoms.find(k=>k.id===r.kingdomId)?.name}{'qty' in r&&<small><NumericValue value={r.qty} format="compact"/> × <NumericValue value={r.price} format="money"/></small>}</th><td><NumericValue value={r.weekly} format="signedMoney"/></td></tr>)}</tbody></table>:<table className="system-table"><thead><tr><th>{S.item}</th><SortHeader label={T.weeklyBudget} active direction={direction} onClick={()=>setDirection(-direction)}/></tr></thead><tbody>{[...drill.rows].sort((a,b)=>(Math.abs(a.weekly)-Math.abs(b.weekly))*direction).map((row,i)=>{
     const name='typeId' in row?buildingName(row.typeId):'prof' in row?className(row.prof):'group' in row?S[row.group as 'poor'|'wage']:'good' in row?goodName(row.good):'part' in row?({base:S.base,gdp:S.gdp,wage:S.wages,other:S.other,interest:label('interest')})[row.part]:'';
     return <tr key={i}><th>{'buildingId' in row?<button className="entity-link" onClick={()=>onBuilding?.(row.buildingId)}>{name} ↗</button>:name}{'regionId' in row&&<small>{region(row.regionId)}</small>}
      {'jobsBy' in row&&<details><summary>{S.formula}</summary>{row.jobsBy.filter(j=>j.employed>0).map(j=><p key={j.skill}>{className(j.skill)}: <NumericValue value={j.employed} format="compact"/> × <NumericValue value={j.baseWage} format="money"/> × {j.wageIndex.toFixed(2)} × {j.stepMult.toFixed(2)} × 7 = <NumericValue value={j.weekly} format="money"/></p>)}</details>}
      {'sales' in row&&<small>{S.sales} <NumericValue value={row.sales} format="money"/> − {S.inputs} <NumericValue value={row.inputs} format="money"/> − {S.wages} <NumericValue value={row.wages} format="money"/></small>}
      {'payers' in row&&<small><NumericValue value={row.payers} format="compact"/> · {row.base==='income'?pct(row.rate):exactNumber(row.rate)}</small>}
      {'covered' in row&&<small>{row.covered?S.covered:S.excluded} · <NumericValue value={row.short} format="compact"/></small>}
     </th><td><NumericValue value={row.weekly} format="signedMoney"/></td></tr>;
    })}<tr><th>Σ</th><td><NumericValue value={drill.rows.reduce((n,r)=>n+r.weekly,0)} format="signedMoney"/></td></tr>{Math.abs(drill.smoothing)>=10&&<tr><th data-help={S.smoothingHelp}>{S.smoothing}</th><td><NumericValue value={drill.smoothing} format="signedMoney"/></td></tr>}</tbody></table>}
   </div>
  </aside>}
 </div>;
}
