import {LedgerTable as UITable} from '../ui/primitives';
import {TICKS_PER_WEEK,TUNE} from '@econ/sim';
import {useT} from '../i18n';
import {NumericValue} from '../NumericValue';
import {exactNumber} from '../format';
import type {wealthSummary} from '../wealthSummary';

export function WealthDrift({data,perHead}:{data:ReturnType<typeof wealthSummary>;perHead:boolean}){
 const T=useT(),divisor=perHead?Math.max(1,data.size):1,drift=Math.round(data.weeklyDrift*100)/100;
 const money=(value:number)=><NumericValue value={value/divisor} format="money"/>;
 const savingsFormula=`max(0, ${T.screenText.savings} − ${T.wealthCostNow} × ${TICKS_PER_WEEK} × ${exactNumber(TUNE.wealthSavBuffer)}) ÷ ${exactNumber(TUNE.wealthSavWeeks*TICKS_PER_WEEK)}`;
 return <details className="wealth-drivers"><summary>{T.wealthDrift}</summary><UITable className="system-table"><tbody>
  <tr><th>{T.wealthIncome}</th><td>{money(data.income)}</td></tr>
  <tr><th>{T.screenText.inKindGoods}</th><td>{money(data.inKind)}</td></tr>
  <tr><th tabIndex={0} data-help={savingsFormula}>{T.wealthFromSavings}</th><td>{data.hasSavingsIncome?money(data.fromSavings):'—'}</td></tr>
  <tr><th>{T.wealthTotal}</th><td>{money(data.income+data.inKind+data.fromSavings)}</td></tr>
  <tr><th>{T.wealthCostNow}</th><td>{money(data.costNow)}</td></tr>
  <tr><th>{T.wealthCostNext}</th><td>{money(data.costNext)}</td></tr>
  <tr><th>{T.wealthPerWeek}</th><td className={drift>0?'pos':drift<0?'neg':undefined}>{drift>=0?'+':'−'}{Math.abs(drift).toFixed(2)}</td></tr>
 </tbody></UITable></details>;
}
