import {officeMargin} from '@econ/sim';
import {t} from './i18n';
import {exactNumber,pct} from './format';
export function officeFeeHelp(methodId:string,fee?:number){
 const T=t();return [fee===undefined?null:`${T.constructionFees}: ƒ${exactNumber(fee)}`,T.officeFeeFormula(pct(officeMargin(methodId)))].filter(Boolean).join('\n');
}
