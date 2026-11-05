import {industryOf,INDUSTRIES} from '@econ/sim';
import {useLang} from '../i18n';
export function IndustryLabel({typeId,methodId}:{typeId:string;methodId?:string}){
 const ko=useLang()==='ko',industry=industryOf(typeId,methodId);
 return industry?<small className="tag-soft industry-label">{ko?INDUSTRIES[industry].name:INDUSTRIES[industry].nameEn}</small>:null;
}
