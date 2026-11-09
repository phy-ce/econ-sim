import type {BuildingEcon} from '@econ/sim';
import {useT} from '../i18n';
import {marginText,exactNumber} from '../format';
import {SegBar} from '../ui';

export function BuildingCostBar({econ:e}: {econ:BuildingEcon}){
 const T=useT(),S=T.system,d=e.day;
 if(d.sales<=0||e.margin===null)return null;
 const cash=(v:number,signed=false)=>`${v<0?'−':signed?'+':''}ƒ${exactNumber(Math.abs(v))}`;
 const help=[`${T.balance} · ${d.fee>0?T.constructionFees:S.sales} ${cash(d.sales)}`,`${T.screenLists.incomeLabels.tax} ${cash(d.tax)}`,`${S.inputs} ${cash(-d.inputs)}`,`${T.wages} ${cash(-d.wages)}`,`${S.profit} ${cash(d.profit,true)}`,`${T.margin} ${marginText(e.margin,{detail:true})}`].join('\n');
 const segs=[{key:'inputs',grow:d.inputs,value:1,color:'var(--wf-raw)'},{key:'wages',grow:d.wages,value:1,color:'var(--wf-wage)'},{key:'profit',grow:Math.max(0,d.profit),value:1,color:'var(--good)'}].filter(s=>s.grow>0);
 return <div className={`building-cost-bar ${d.profit<0?'loss':''}`} tabIndex={0} data-help={help}><SegBar segs={segs} label={help}/></div>;
}
