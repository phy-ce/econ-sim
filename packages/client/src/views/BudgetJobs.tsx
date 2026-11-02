import type {WageDrillJob} from '@econ/sim';
import {ClassSprite} from '../sprites';
import {NumericValue} from '../NumericValue';
import {className,useT} from '../i18n';
import {exactNumber} from '../format';

export function BudgetJobs({rows}:{rows:WageDrillJob[]}){
 const T=useT();
 return <details className="budget-formula"><summary>{T.system.formula}</summary><div className="budget-jobs">{rows.filter(j=>j.employed>0||j.jobs>0).map(j=><section key={j.skill}>
 <strong><ClassSprite c={j.skill} size={24}/>{className(j.skill)}</strong><div className="budget-job-figures">
 <span>{T.hStaff}<b><NumericValue value={j.employed} format="compact"/> / <NumericValue value={j.jobs} format="compact"/></b></span>
 <span>{T.perHeadDay}<b><NumericValue value={j.perHead} format="money" formula={j.marketWage!==undefined?`${T.marketWage} ${exactNumber(j.marketWage)}${j.premium?` × (1 + ${T.wagePremium} ${exactNumber(j.premium)})`:''} × ${T.stage} ${exactNumber(j.stepMult)}`:`${T.wageIndexLabel}: ${exactNumber(j.wageIndex)}\n${exactNumber(j.baseWage)} × ${exactNumber(j.wageIndex)} × ${exactNumber(j.stepMult)}`}/></b></span>
 <span>{T.system.week}<b><NumericValue value={j.weekly} format="signedMoney" formula={`−${exactNumber(j.employed)} × ${exactNumber(j.perHead)} × 7`}/></b></span>
 </div></section>)}</div></details>;
}
