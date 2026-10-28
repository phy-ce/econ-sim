import {SKILLS,getMethod,slots} from '@econ/sim';
import type {Building} from '@econ/sim';
import {className,useLang} from '../i18n';
import {NumericValue} from '../NumericValue';
import {Bar,CLASS_COLOR} from '../ui';
export function OwnerSummary({buildings}:{buildings:Building[]}){
 const ko=useLang()==='ko',finance=buildings.some(b=>b.typeId==='finance');
 const rows=SKILLS.map(id=>({id,jobs:buildings.reduce((n,b)=>n+slots(b,id),0),employed:buildings.reduce((n,b)=>n+(b.employed[id]??0),0)})).filter(x=>x.jobs>0||x.employed>0);
 return <section className="owner-summary" aria-label={ko?'소유 기관 현황':'Ownership institution summary'}>
 <div className="explorer-facts"><span tabIndex={0} data-help={ko?'소유 기관이 보유한 현금입니다. 보유 건물의 자산 가치는 포함하지 않습니다.':'Cash held by the institution; excludes the value of its holdings.'}>{ko?'금고':'Treasury'}<b><NumericValue value={buildings.reduce((n,b)=>n+(b.cash??0),0)} format="money"/></b></span><span tabIndex={0} data-help={ko?'마지막 하루에 기록된 배당·지대 수입 합계입니다. 금고에 남긴 금액과는 다릅니다.':'Recorded dividend and rent receipts for the last day, not cash retained in treasury.'}>{ko?'수입 / 일':'Income / day'}<b><NumericValue value={buildings.reduce((n,b)=>n+b.last.revenue,0)} format="money"/></b></span></div>
 <h4>{finance?(ko?'직원 충원':'Staffing'):(ko?'귀족 자리':'Noble seats')}</h4>
 <div className="workforce-list">{rows.map(x=><div className="workforce-row" key={x.id} tabIndex={0} data-help={ko?'현재 충원 인원 / 해당 직종 자리 수. 투자 지분 비중과는 별개입니다.':'Occupied workers / available positions; separate from investment ownership.'}><span>{className(x.id)}</span><Bar value={x.jobs?x.employed/x.jobs:0} color={CLASS_COLOR[x.id]} label={className(x.id)}/><b><NumericValue value={x.employed} format="compact"/> / <NumericValue value={x.jobs} format="compact"/></b></div>)}</div>
 </section>;
}
