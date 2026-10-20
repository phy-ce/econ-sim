import * as numbers from './format';
type NumberFormat='int'|'one'|'two'|'money'|'signedMoney'|'compact'|'compactMoney'|'signedCompactMoney';
export function NumericValue({value,format='compact'}:{value:number;format?:NumberFormat}) {
  const currency=format.toLowerCase().includes('money');
  const signed=format.startsWith('signed');
  const exact=`${signed&&value>=0?'+':''}${currency?'ƒ':''}${numbers.exactNumber(value)}`;
  return <span className="numeric-value" data-help={exact} aria-label={exact} tabIndex={Math.abs(value)>=1000?0:undefined}>{numbers[format](value)}</span>;
}
