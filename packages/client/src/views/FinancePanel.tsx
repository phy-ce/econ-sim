import {DetailWindow} from './DetailWindow';
import {BudgetJobs} from './BudgetJobs';
import {useNavigationState} from '../NavigationHistory';
import { Wages } from './CompanyPanel';
import { SortHeader } from './SortHeader';
import { useState, useEffect } from 'react';
import { TUNE, creditLimit, budgetPreview, budgetDrill, roundBudget } from '@econ/sim';
import type { BudgetLineKey, Company, World } from '@econ/sim';
import type { Game } from '../useGame';
import { NumericValue } from '../NumericValue';
import {BuildingSprite,ClassSprite,GoodSprite} from '../sprites';
import {Bar} from '../ui';
import {UsersRound} from 'lucide-react';
import { buildingName, className, goodName, regionName, useT,useLang } from '../i18n';
import { exactNumber } from '../format';
import '../system-ui.css';
const precisePct=(value:number)=>`${exactNumber(value*100)}%`;

export function FinancePanel({game,world,me,onBuilding,onPolicies,active=true}:{active?:boolean;game:Game;world:World;me:Company;onBuilding?:(id:number)=>void;onPolicies?:()=>void}) {
 const T=useT(),S=T.system,ko=useLang()==='ko';
 const [detail,setDetail]=useNavigationState<BudgetLineKey|null>('views/FinancePanel.tsx:detail',null);
 const [direction,setDirection]=useState(-1);
 const [breakdown,setBreakdown]=useNavigationState('views/FinancePanel.tsx:breakdown',false);
 useEffect(()=>setBreakdown(false),[detail]);
 useEffect(()=>{if(!active){setDetail(null);setHover(null);}},[active]);
 const [hover,setHover]=useState<{knob:'tax'|'wages'|'welfare';level:number}|null>(null);

 const k=world.kingdoms.find(k=>k.id===me.kingdomId);
 if(!k)return null;
 const preview=budgetPreview(world,k.id),drill=detail?budgetDrill(world,k.id,detail,hover?{[hover.knob]:hover.level}:undefined):null;
 const secondary=drill?.key==='goods'?drill.byGood:drill?.key==='tariffs'?drill.byPartner:null;
 const empty=breakdown&&secondary?secondary.length===0:drill?.rows.length===0;
 const hasStateFirms=(drill?.key==='stateFirms'?drill:budgetDrill(world,k.id,'stateFirms')).rows.length>0;
 const label=(key:BudgetLineKey)=>T.budgetLines[key]??key;
 const multipliers={tax:TUNE.taxLevels,wages:TUNE.govWageLevels,welfare:TUNE.welfareLevels};
 const amount=(current:number,projected?:number)=><><NumericValue value={roundBudget(current)} format="signedMoney"/>{projected!==undefined&&<small className="budget-preview">→ <NumericValue value={roundBudget(projected)} format="signedMoney"/></small>}</>;
 const projectedNet=hover?preview.netByLevel[hover.knob][hover.level-1]:undefined;
 const totals=(rows:{weekly:number}[],smoothing:number)=><tfoot>{Math.abs(smoothing)>=10&&<tr><th data-help={S.smoothingHelp}>{S.smoothing}</th><td><NumericValue value={smoothing} format="signedMoney"/></td></tr>}<tr><th>Σ</th><td><NumericValue value={rows.reduce((n,r)=>n+r.weekly,0)} format="signedMoney"/></td></tr></tfoot>;
 const region=(id:number)=>{const r=world.regions.find(r=>r.id===id);return r?regionName(r):String(id);};
 const kingdom=(id:number)=>{const k=world.kingdoms.find(k=>k.id===id);return k?(ko?k.name:k.nameEn):String(id);};
 return <div className="system-panel finance-ledger">
  <div className="system-facts"><span title={`${T.cash}: ${exactNumber(me.cash)}\n${T.loan}: ${exactNumber(me.debt)}`}>{T.treasury}<b><span className={me.cash-me.debt<0?'neg':undefined}><NumericValue value={me.cash-me.debt} format="money"/></span> / <NumericValue value={creditLimit(world,me)} format="money"/></b></span><span>{T.budgetNet}<b className={preview.net<0?'neg':'pos'}>{amount(preview.net,projectedNet)}</b></span></div>

  <table className="system-table"><thead><tr><th>{S.item}</th><th>{T.weeklyBudget}</th></tr></thead>
   {preview.groups.map(group=><tbody key={group.knob}><tr className="system-group"><th colSpan={2}><div><span>{group.knob==='welfare'&&k.welfareLaw==='none'&&<button className="entity-link" data-help={`${S.welfareLaw}: ${S.none}`} onClick={onPolicies}>🔒 {S.welfareLaw}: {S.none}</button>}{S[group.knob]} {amount(group.weekly,hover&&group.knob===hover.knob?group.byLevel?.[hover.level-1]:undefined)}</span>{group.knob!=='fixed'&&<span className="policy-steps" role="group" aria-label={S[group.knob]}>{[1,2,3,4,5].map(level=>{const knob=group.knob as 'tax'|'wages'|'welfare';return <button key={level} disabled={knob==='welfare'&&k.welfareLaw==='none'} aria-pressed={k.budget[knob]===level} data-help={`${S[knob]} ${level} · ${knob==='welfare'?S.target:'×'} ${multipliers[knob][level-1]}\n${T.weeklyBudget}: ${exactNumber(group.byLevel?.[level-1]??0)}\n${T.budgetNet}: ${exactNumber(preview.netByLevel[knob][level-1])}`} onMouseEnter={()=>setHover({knob,level})} onMouseLeave={()=>setHover(null)} onFocus={()=>setHover({knob,level})} onBlur={()=>setHover(null)} onClick={()=>game.command({type:'setBudget',item:knob,value:level})}>{level}</button>;})}</span>}</div></th></tr>
    {group.lines.filter(key=>key!=='stateFirms'||hasStateFirms).map(key=>{const line=preview.lines.find(l=>l.key===key)!;return <tr key={key}><th><button className="entity-link" aria-expanded={detail===key} onClick={()=>{setDetail(detail===key?null:key);}}>{label(key)} ↗ {key==='tax'&&<small>{precisePct(k.taxRatio??0)}</small>}</button></th><td className={line.weekly<0?'neg':'pos'}>{amount(line.weekly,hover&&line.knob===hover.knob?line.byLevel?.[hover.level-1]:undefined)}</td></tr>;})}
   </tbody>)}<tfoot><tr><th>{T.budgetNet}</th><td>{amount(preview.net,projectedNet)}</td></tr></tfoot>
  </table>
  <details><summary>{S.marketWages}</summary><Wages game={game} world={world} me={me}/></details>
  {drill&&<DetailWindow title={`${label(drill.key)} · ${S.details}`} help={label(drill.key)} open hideTrigger onOpenChange={open=>{if(!open)setDetail(null);}}>
   <div className="budget-detail-body">
    <b><NumericValue value={drill.weekly} format="signedMoney"/> / {S.week}</b>
    <div className="system-facts">
    {'law' in drill&&<span>{S[drill.law]}</span>}
    {'stepMult' in drill&&<span>{T.stage}<b>×{drill.stepMult.toFixed(2)}</b></span>}
    {'share' in drill&&<span>{T.share}<b>{drill.share===null?'—':precisePct(drill.share)}</b></span>}
    {'officeSales' in drill&&<span>{S.sales}<b><NumericValue value={drill.officeSales} format="money"/></b></span>}
    {'rates' in drill&&<><span>{S.land}<b><NumericValue value={drill.rates.land} format="money"/></b></span><span>{S.poll}<b><NumericValue value={drill.rates.poll} format="money"/></b></span><span>{S.income}<b>{precisePct(drill.rates.income)}</b></span></>}
    </div>
    {'collection' in drill&&<p>{T.taxCollection} {precisePct(drill.collection)}</p>}
    {'target' in drill&&<p>{S.target} {drill.target}</p>}
    {'debt' in drill&&<div className="system-facts"><span>{T.loan}<b><NumericValue value={drill.debt} format="money"/></b></span><span>{T.dailyRateLabel}<b>{precisePct(drill.dailyRate)}</b></span></div>}
    {secondary&&<div className="system-tabs"><button aria-pressed={!breakdown} onClick={()=>setBreakdown(false)}>{S.details}</button><button aria-pressed={breakdown} onClick={()=>setBreakdown(true)}>{drill.key==='goods'?T.system.goods:T.system.kingdom}</button></div>}
    {'laws' in drill&&<div className="budget-law-comparison">{drill.laws.map(l=><div key={l.law} data-current={l.law===drill.law}><span>{S[l.law]}</span><Bar value={Math.max(0,l.weekly)/Math.max(1,...drill.laws.map(l=>l.weekly))} tone={l.law===drill.law?'gold':'muted'} label={S[l.law]}/><NumericValue value={l.weekly} format="signedMoney"/></div>)}</div>}
    {empty?<p className="budget-empty"><NumericValue value={drill.weekly} format="money"/></p>:breakdown&&secondary?<table className="system-table"><thead><tr><th>{S.item}</th><SortHeader label={T.weeklyBudget} active direction={direction} onClick={()=>setDirection(-direction)}/></tr></thead><tbody>{[...secondary].sort((a,b)=>(Math.abs(a.weekly)-Math.abs(b.weekly))*direction).map((r,i)=><tr key={i}><th>{'good' in r?<><GoodSprite g={r.good} size={24}/>{goodName(r.good)}</>:<><i className="swatch" style={{background:world.kingdoms.find(k=>k.id===r.kingdomId)?.color}}/>{kingdom(r.kingdomId)}</>}{'qty' in r&&<small><NumericValue value={r.qty} format="compact"/> × <NumericValue value={r.price} format="money"/></small>}</th><td><NumericValue value={r.weekly} format="signedMoney"/></td></tr>)}</tbody>{totals(secondary,drill.smoothing)}</table>:<table className="system-table"><thead><tr><th>{S.item}</th><SortHeader label={T.weeklyBudget} active direction={direction} onClick={()=>setDirection(-direction)}/></tr></thead><tbody>{[...drill.rows].sort((a,b)=>(Math.abs(a.weekly)-Math.abs(b.weekly))*direction).map((row,i)=>{
     const name='typeId' in row?buildingName(row.typeId):'prof' in row?className(row.prof):'group' in row?(row.group==='poor'?T.welfareGroupPoor:T.welfareGroupWage):'good' in row?goodName(row.good):'part' in row?({base:S.base,gdp:S.gdp,wage:S.wages,other:S.other,interest:label('interest')})[row.part]:'';
     return <tr key={i} className={'covered' in row&&!row.covered?'budget-uncovered':undefined}><th>{'buildingId' in row?<button className="entity-link" onClick={()=>{setDetail(null);onBuilding?.(row.buildingId);}}>{'typeId' in row&&<BuildingSprite typeId={row.typeId} size={24}/>} {name} ↗</button>:<>{'group' in row&&<UsersRound size={24}/>} {'prof' in row&&<ClassSprite c={row.prof} size={24}/>} {'good' in row&&<GoodSprite g={row.good} size={24}/>} {name}</>}{'regionId' in row&&<small>{region(row.regionId)} {'level' in row&&<>×<NumericValue value={row.level} format="compact"/></>}</small>}{'employed' in row&&<small>{T.hStaff} <NumericValue value={row.employed} format="compact"/>{'jobs' in row&&<> / <NumericValue value={row.jobs} format="compact"/></>}</small>}
      {'jobsBy' in row&&<BudgetJobs rows={row.jobsBy}/>}
      {drill.key==='mint'&&'part' in row&&row.part==='gdp'&&<small>{T.weeklyGdp} <NumericValue value={drill.gdpWeek} format="money"/> · {precisePct(drill.rate)}</small>}{'sales' in row&&<small>{S.sales} <NumericValue value={row.sales} format="money"/> · {S.inputs} <NumericValue value={-row.inputs} format="money"/> · {T.wages} <NumericValue value={-row.wages} format="money"/></small>}
      {'payers' in row&&<small><NumericValue value={row.payers} format="compact"/> · {row.base==='income'?precisePct(row.rate):exactNumber(row.rate)}</small>}
      {'covered' in row&&<small data-help={`${T.targetIncomeLabel}: ${exactNumber(row.targetIncome)} / ${S.day}; ${S.welfare}: ${exactNumber(row.need)} / ${S.week}`}>{row.covered?S.covered:S.excluded} · <NumericValue value={row.short} format="compact"/><br/>{T.targetIncomeLabel} <NumericValue value={row.targetIncome} format="money"/> / {S.day}</small>}
     </th><td className={row.weekly<0?'neg':undefined} tabIndex={'covered' in row&&!row.covered?0:undefined} data-help={'covered' in row?`${S.welfare}: ${exactNumber(row.need)} / ${S.week}`:undefined}>{'covered' in row&&!row.covered?'—':<NumericValue value={row.weekly} format="signedMoney" formula={drill.key==='interest'?`${exactNumber(drill.debt)} × ${precisePct(drill.dailyRate)} × 7`:drill.key==='mint'&&'part' in row&&row.part==='gdp'?`${exactNumber(drill.gdpWeek)} × ${precisePct(drill.rate)}`:drill.key==='tax'?T.taxWeeklyFormula(precisePct(drill.collection)):'sales' in row?`${S.sales} ${exactNumber(row.sales)} − ${S.inputs} ${exactNumber(-row.inputs)} − ${T.wages} ${exactNumber(-row.wages)}`:undefined}/> }</td></tr>;
    })}</tbody>{totals(drill.rows,drill.smoothing)}</table>}
   </div>
  </DetailWindow>}
 </div>;
}
