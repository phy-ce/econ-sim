import {welfareCapDaily} from '@econ/sim';
import type {Kingdom} from '@econ/sim';
import {useT} from '../i18n';
import {NumericValue} from '../NumericValue';
export function WelfareCap({kingdom,step=kingdom.budget.welfare,projectedStep}:{kingdom:Kingdom;step?:number;projectedStep?:number}){
 const T=useT(),cap=welfareCapDaily(kingdom,step)*7,projected=projectedStep===undefined?null:welfareCapDaily(kingdom,projectedStep)*7;
 if(!Number.isFinite(cap))return null;
 return <span className="welfare-cap">{T.welfareCap} / {T.system.week} <b><NumericValue value={cap} format="money"/></b>{projected!==null&&Number.isFinite(projected)&&projectedStep!==step&&<small> → <NumericValue value={projected} format="money"/></small>}</span>;
}
