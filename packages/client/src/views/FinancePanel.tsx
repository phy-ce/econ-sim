import { HelpText } from '../TooltipLayer';
import { NumericValue } from '../NumericValue';
import { TUNE, taxRates, creditLimit, budgetPreview, roundBudget } from '@econ/sim';
import type { BudgetLine, Company, World } from '@econ/sim';
import type { Game } from '../useGame';
import { useT } from '../i18n';
import { pct } from '../format';
import { taxCollectionRatio } from '../systemMetrics';
import { SectionStack } from './SectionStack';
export function FinancePanel({game,world,me}:{game:Game;world:World;me:Company}) {
 const T=useT(),kingdom=world.kingdoms.find(k=>k.id===me.kingdomId);
 if(!kingdom)return null;
 const rates=taxRates(kingdom);
 const preview=budgetPreview(world,kingdom.id);
 const multipliers={tax:TUNE.taxLevels,wages:TUNE.govWageLevels,research:TUNE.researchLevels};
 const name=(l:BudgetLine)=>T.budgetLines[l.key]??l.key;
 const groups:[string,BudgetLine[]][]=[[T.receipts,preview.lines.filter(l=>['tax','tariffs','mint','fees'].includes(l.key))],[T.expenses,preview.lines.filter(l=>['wages','goods','research','interest'].includes(l.key))]];
 const row=(l:BudgetLine)=>{
  const knob=l.knob&&l.key===l.knob?l.knob:null;
  return <tr key={l.key}><th>{name(l)} {l.key==='tax'&&<small data-help={T.help.taxCollection} tabIndex={0}>{pct(taxCollectionRatio(kingdom))}</small>}</th><td><NumericValue value={roundBudget(l.weekly)} format="signedMoney"/></td><td>{knob&&<div className="policy-steps" role="group" aria-label={`${name(l)} ${T.policyLevel}`}>{[1,2,3,4,5].map(level=><button key={level} aria-pressed={kingdom.budget[knob]===level} data-help={`${name(l)} ${level} · ×${multipliers[knob][level-1]} · ${roundBudget(l.byLevel?.[level-1]??0)} · ${T.budgetNet} ${roundBudget(preview.netByLevel[knob][level-1])}`} onClick={()=>game.command({type:'setBudget',item:knob,value:level})}>{level}</button>)}</div>}</td></tr>;
 };
 return <SectionStack storageKey="finance" items={[
 {id:'treasury',title:T.treasury,height:126,content:<div className="stats"><div className="stat"><span>{T.cash}</span><b><NumericValue value={me.cash} format="money"/></b></div><div className="stat"><span>{T.loanLimit}</span><b><NumericValue value={me.debt} format="money"/> / <NumericValue value={creditLimit(world,me)} format="money"/></b></div><div className="stat"><span>{T.budgetNet}</span><b className={preview.net<0?'neg':'pos'}><NumericValue value={roundBudget(preview.net)} format="signedMoney"/></b></div></div>},
 {id:'accounts',title:T.weeklyBudget,height:510,content:<><div className="tax-law"><label><HelpText text={T.help.taxLaw}>{T.taxLaw}</HelpText> <select aria-label={T.taxLaw} value={kingdom.taxLaw} onChange={e=>game.command({type:'setTaxLaw',law:e.target.value as 'land'|'poll'|'income'})}><option value="land">{T.landBased}</option><option value="poll">{T.pollTax}</option><option value="income">{T.incomeTax}</option></select></label><span>{kingdom.taxLaw==='land'?`${T.landBased} ${pct(rates.land)}`:<>{T.pollTax} <NumericValue value={rates.poll} format="money"/> · {T.incomeTax} {pct(rates.income)}</>}</span></div><div className="finance-scroll"><table className="finance-table"><colgroup><col style={{width:'40%'}}/><col style={{width:'25%'}}/><col style={{width:'35%'}}/></colgroup><thead><tr><th></th><th>{T.weeklyBudget}</th><th><HelpText text={T.help.policy}>{T.policyLevel}</HelpText></th></tr></thead>
 {groups.map(([title,ls])=><tbody key={title}><tr className="account-group"><th colSpan={3}>{title}</th></tr>{ls.map(row)}</tbody>)}
 <tfoot><tr><th>{T.budgetNet}</th><td><NumericValue value={roundBudget(preview.net)} format="signedMoney"/></td><td/></tr></tfoot></table></div></>},
 ]}/>;
}
