import { HelpText } from '../TooltipLayer';
import { NumericValue } from '../NumericValue';
import { BUDGET_ITEMS, TUNE, taxRates, creditLimit } from '@econ/sim';
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
 const groups:[string,LedgerKey[]][]=[[T.receipts,['sales','tax','mint','buildFees']],[T.expenses,['wages','inputs','research','interest']],[T.capitalFlows,['dividends','investment','buildPaid']]];
 const rates=taxRates(kingdom);
 const label=(key:LedgerKey)=>T.ledgerLabels[key];
 const multipliers={tax:TUNE.taxLevels,wages:TUNE.govWageLevels,research:TUNE.researchLevels};
 return <SectionStack storageKey="finance" items={[
 {id:'treasury',title:T.treasury,height:126,content:<div className="stats"><div className="stat"><span>{T.cash}</span><b><NumericValue value={me.cash} format="money"/></b></div><div className="stat"><span>{T.loanLimit}</span><b><NumericValue value={me.debt} format="money"/> / <NumericValue value={creditLimit(world,me)} format="money"/></b></div><div className="stat"><span>{T.lastWeekPL}</span><b className={me.lastWeekProfit<0?'neg':'pos'}><NumericValue value={me.lastWeekProfit} format="signedMoney"/></b></div></div>},
 {id:'accounts',title:T.weeklyAccounts,height:510,content:<><div className="tax-law"><label><HelpText text={T.help.taxLaw}>{T.taxLaw}</HelpText> <select aria-label={T.taxLaw} value={kingdom.taxLaw} onChange={e=>game.command({type:'setTaxLaw',law:e.target.value as 'land'|'capita'})}><option value="land">{T.landBased}</option><option value="capita">{T.perCapita}</option></select></label><span>{kingdom.taxLaw==='land'?`${T.landBased} ${pct(rates.land)}`:<>{T.pollTax} <NumericValue value={rates.poll} format="money"/> · {T.incomeTax} {pct(rates.income)}</>}</span></div><div className="finance-scroll"><table className="finance-table"><colgroup><col style={{width:'30%'}}/><col style={{width:'20%'}}/><col style={{width:'20%'}}/><col style={{width:'30%'}}/></colgroup><thead><tr><th></th><th><HelpText text={T.help.previousWeek}>{T.previousWeek}</HelpText></th><th><HelpText text={T.help.currentWeek}>{T.currentWeek}</HelpText></th><th><HelpText text={T.help.policy}>{T.policyLevel}</HelpText></th></tr></thead>
 {groups.map(([title,keys])=><tbody key={title}><tr className="account-group"><th colSpan={4}>{title}</th></tr>{keys.map(key=>{
  const budget=BUDGET_ITEMS.includes(key as BudgetItem)?key as BudgetItem:null;
  const previous=me.lastLedger[key as LedgerKey];
  return <tr key={key}><th><HelpText text={T.help[key as keyof typeof T.help]??label(key)}>{label(key)}</HelpText> {key==='tax'&&<small data-help={T.help.taxCollection} tabIndex={0}>{pct(taxCollectionRatio(kingdom))}</small>}</th><td><NumericValue value={previous} format="money"/></td><td><NumericValue value={me.ledger[key]} format="money"/></td><td>{budget&&<div className="policy-steps" role="group" aria-label={`${label(key)} ${T.policyLevel}`}>{[1,2,3,4,5].map(level=><button key={level} aria-pressed={kingdom.budget[budget]===level} data-help={`${label(key)} · ${level} · ×${multipliers[budget][level-1]}`} onClick={()=>game.command({type:'setBudget',item:budget,value:level})}>{level}</button>)}</div>}</td></tr>;
 })}</tbody>)}
 <tfoot><tr><th>{T.weeklyProfit}</th><td><NumericValue value={me.lastWeekProfit} format="signedMoney"/></td><td><NumericValue value={me.weekProfit} format="signedMoney"/></td><td/></tr><tr><th>{T.budgetRevenue}</th><td><NumericValue value={kingdom.lastBudget?.revenue??0} format="money"/></td><td><NumericValue value={kingdom.revenueWeek} format="money"/></td><td/></tr></tfoot></table></div></>},
 {id:'wages',title:T.wages,height:320,content:<Wages game={game} world={world} me={me}/>},
 ]}/>;
}
