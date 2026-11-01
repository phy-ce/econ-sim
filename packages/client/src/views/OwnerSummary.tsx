import {t as uiCopy} from '../i18n';
import {SKILLS,getMethod,slots} from '@econ/sim';
import type {Building} from '@econ/sim';
import {className,useLang} from '../i18n';
import {NumericValue} from '../NumericValue';
import {Bar,CLASS_COLOR} from '../ui';
export function OwnerSummary({buildings}:{buildings:Building[]}){
 const ko=useLang()==='ko',finance=buildings.some(b=>b.typeId==='finance');
 const rows=SKILLS.map(id=>({id,jobs:buildings.reduce((n,b)=>n+slots(b,id),0),employed:buildings.reduce((n,b)=>n+(b.employed[id]??0),0)})).filter(x=>x.jobs>0||x.employed>0);
 return <section className="owner-summary" aria-label={uiCopy().screenText['ownershipInstitutionSummary']}>
 <div className="explorer-facts"><span tabIndex={0} data-help={uiCopy().screenText['cashHeldByTheInstitutionExcludesThe']}>{uiCopy().screenText['treasury']}<b><NumericValue value={buildings.reduce((n,b)=>n+(b.cash??0),0)} format="money"/></b></span><span tabIndex={0} data-help={uiCopy().screenText['recordedDividendAndRentReceiptsForThe']}>{uiCopy().screenText['incomeDay']}<b><NumericValue value={buildings.reduce((n,b)=>n+b.last.revenue,0)} format="money"/></b></span></div>
 <h4>{finance?(uiCopy().screenText['staffing168']):(uiCopy().screenText['nobleSeats'])}</h4>
 <div className="workforce-list">{rows.map(x=><div className="workforce-row" key={x.id} tabIndex={0} data-help={uiCopy().screenText['occupiedWorkersAvailablePositionsSeparateFromInvestment']}><span>{className(x.id)}</span><Bar value={x.jobs?x.employed/x.jobs:0} color={CLASS_COLOR[x.id]} label={className(x.id)}/><b><NumericValue value={x.employed} format="compact"/> / <NumericValue value={x.jobs} format="compact"/></b></div>)}</div>
 </section>;
}
