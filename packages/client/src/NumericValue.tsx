import * as numbers from './format';
type NumberFormat='int'|'one'|'two'|'money'|'signedMoney'|'compact'|'compactMoney'|'signedCompactMoney';
export function NumericValue({value,format='compact',formula}:{value:number;format?:NumberFormat;formula?:string}) {
  const currency=format.toLowerCase().includes('money');
  const signed=format.startsWith('signed');
  const exact=`${signed&&value>=0?'+':''}${currency?'ƒ':''}${numbers.exactNumber(value)}`;
  return <span className="numeric-value" data-help={formula?`${exact}\n${formula}`:exact} aria-label={exact} tabIndex={formula||Math.abs(value)>=1000?0:undefined}>{numbers[format](value)}</span>;
}
