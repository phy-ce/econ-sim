import {FormattedValue} from './ui/primitives';
import {memo} from 'react';
import * as numbers from './format';
type NumberFormat='int'|'one'|'two'|'money'|'signedMoney'|'compact'|'compactMoney'|'signedCompactMoney';
function NumericValueView({value,format='compact',formula}:{value:number;format?:NumberFormat;formula?:string}) {
  const currency=format.toLowerCase().includes('money');
  const signed=format.startsWith('signed');
  const exact=`${signed&&value>=0?'+':''}${currency?'ƒ':''}${numbers.exactNumber(value)}`;
  return <FormattedValue className={`numeric-value ${format.toLowerCase().includes('compact')?'gu-figure-compact':''}`} exact={exact} help={formula?`${exact}\n${formula}`:exact} focusable={!!formula||Math.abs(value)>=1000}>{numbers[format](value)}</FormattedValue>;
}

export const NumericValue=memo(NumericValueView);
