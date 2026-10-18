import { NumericValue } from '../NumericValue';
import { BUDGET_ITEMS, creditLimit } from '@econ/sim';
import type { BudgetItem, Company, World, LedgerKey } from '@econ/sim';
import type { Game } from '../useGame';
import { useT } from '../i18n';
import { pct } from '../format';
import { taxCollectionRatio } from '../systemMetrics';
import { SectionStack } from './SectionStack';
import { Wages } from './CompanyPanel';
export function FinancePanel({game,world,me}:{game:Game;world:World;me:Company}) {
 const T=useT(),kingdom=world.kingdoms.find(k=>k.id===me.kingdomId);
 if(!kingdom)return null;
 const groups:[string,(LedgerKey|'education')[]][]=[[T.receipts,['sales','tax','mint','buildFees']],[T.expenses,['wages','inputs','research','education','interest','welfare']],[T.capitalFlows,['dividends','investment','buildPaid']]];
 const total=BUDGET_ITEMS.reduce((sum,key)=>sum+kingdom.budget[key],0);
 const label=(key:LedgerKey|'education')=>key==='education'?T.education:T.ledgerLabels[key];
 return <SectionStack storageKey="finance" items={[
 {id:'treasury',title:T.treasury,height:126,content:<div className="stats"><div className="stat"><span>{T.cash}</span><b><NumericValue value={me.cash} format="money"/></b></div><div className="stat"><span>{T.loanLimit}</span><b><NumericValue value={me.debt} format="money"/> / <NumericValue value={creditLimit(world,me)} format="money"/></b></div><div className="stat"><span>{T.lastWeekPL}</span><b className={me.lastWeekProfit<0?'neg':'pos'}><NumericValue value={me.lastWeekProfit} format="signedMoney"/></b></div></div>},
 {id:'accounts',title:T.weeklyAccounts,height:510,content:<div className="finance-scroll"><table className="finance-table"><colgroup><col style={{width:'30%'}}/><col style={{width:'20%'}}/><col style={{width:'20%'}}/><col style={{width:'30%'}}/></colgroup><thead><tr><th></th><th>{T.previousWeek}</th><th>{T.currentWeek}</th><th>{T.budgetShare}</th></tr></thead>
 <tbody>{(['poll','income'] as const).map(tax=><tr key={tax} className="tax-policy"><th>{tax==='poll'?T.pollTax:T.incomeTax}</th><td colSpan={3}><div className="tax-controls">{(['lower','middle','upper'] as const).map((stratum,i)=><label key={stratum}><span>{[T.lowerStratum,T.middleStratum,T.upperStratum][i]}</span><span><input type="number" min={0} max={tax==='poll'?5:50} step={tax==='poll'?.01:1} aria-label={`${tax==='poll'?T.pollTax:T.incomeTax} ${[T.lowerStratum,T.middleStratum,T.upperStratum][i]}`} value={tax==='poll'?kingdom.pollTax[stratum]:Math.round(kingdom.incomeTax[stratum]*100)} onChange={e=>{if(e.target.value!=='')game.command({type:'setTax',tax,stratum,value:Number(e.target.value)/(tax==='income'?100:1)});}}/>{tax==='income'?'%':'ƒ'}</span></label>)}</div></td></tr>)}</tbody>
 {groups.map(([title,keys])=><tbody key={title}><tr className="account-group"><th colSpan={4}>{title}</th></tr>{keys.map(key=>{
  const budget=BUDGET_ITEMS.includes(key as BudgetItem)?key as BudgetItem:null;
  const previous=budget?kingdom.lastBudget?.[budget]??0:me.lastLedger[key as LedgerKey];
  return <tr key={key}><th>{label(key)} {key==='tax'&&<small title={T.taxCollection}>{pct(taxCollectionRatio(kingdom))}</small>}</th><td><NumericValue value={previous} format="money"/></td><td>{key==='education'?<span title={T.educationPending}>—</span>:<NumericValue value={me.ledger[key]} format="money"/>}</td><td>{budget&&<label className="budget-control"><input type="range" min={0} max={Math.round((1-total+kingdom.budget[budget])*100)} step={1} value={Math.round(kingdom.budget[budget]*100)} aria-label={`${label(key)} ${T.budgetShare}`} onChange={e=>game.command({type:'setBudget',item:budget,value:Number(e.target.value)/100})}/><output>{pct(kingdom.budget[budget])}</output></label>}</td></tr>;
 })}</tbody>)}
 <tfoot><tr><th>{T.weeklyProfit}</th><td><NumericValue value={me.lastWeekProfit} format="signedMoney"/></td><td><NumericValue value={me.weekProfit} format="signedMoney"/></td><td/></tr><tr><th>{T.budgetRevenue}</th><td><NumericValue value={kingdom.lastBudget?.revenue??0} format="money"/></td><td><NumericValue value={kingdom.revenueWeek} format="money"/></td><td/></tr><tr><th>{T.retainedBudget}</th><td/><td/><td>{pct(Math.max(0,1-total))}</td></tr></tfoot></table></div>},
 {id:'wages',title:T.wages,height:320,content:<Wages game={game} world={world} me={me}/>},
 ]}/>;
}
