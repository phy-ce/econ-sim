import {t as uiCopy} from '../i18n';
import {SKILLS,TUNE,paysShare,slots} from '@econ/sim';
import type {Building} from '@econ/sim';
import {className,useT} from '../i18n';
import {Coins} from 'lucide-react';
import {NumericValue} from '../NumericValue';
import {Bar,CLASS_COLOR} from '../ui';
export function OwnerSummary({buildings}:{buildings:Building[]}){
 const T=useT(),finance=buildings.some(b=>b.typeId==='finance');
 const rows=SKILLS.map(id=>({id,jobs:buildings.reduce((n,b)=>n+slots(b,id),0),employed:buildings.reduce((n,b)=>n+(b.employed[id]??0),0),dividend:buildings.some(b=>slots(b,id)>0&&paysShare(b,id))})).filter(x=>x.jobs>0||x.employed>0);
 return <section className="owner-summary" aria-label={uiCopy().screenText['ownershipInstitutionSummary']}>
 <div className="explorer-facts"><span tabIndex={0} data-help={uiCopy().screenText['cashHeldByTheInstitutionExcludesThe']}>{uiCopy().screenText['treasury']}<b><NumericValue value={buildings.reduce((n,b)=>n+(b.cash??0),0)} format="money"/></b></span><span tabIndex={0} data-help={T.ownerReceiptsWeekHelp}>{T.ownerReceiptsWeek}<b><NumericValue value={buildings.reduce((n,b)=>n+b.profitEma*7,0)} format="money"/></b></span></div>
 <h4>{finance?(uiCopy().screenText['staffing168']):TUNE.manorShares?T.manorNobleSeats:(uiCopy().screenText['nobleSeats'])}</h4>
 <div className="workforce-list">{rows.map(x=><div className="workforce-row" key={x.id} tabIndex={0} data-help={uiCopy().screenText['occupiedWorkersAvailablePositionsSeparateFromInvestment']}><span>{className(x.id)} {x.dividend&&<span title={T.dividend} aria-label={T.dividend}><Coins size={13}/></span>}</span><Bar value={x.jobs?x.employed/x.jobs:0} color={CLASS_COLOR[x.id]} label={className(x.id)}/><b><NumericValue value={x.employed} format="compact"/> / <NumericValue value={x.jobs} format="compact"/></b></div>)}</div>
 </section>;
}
