import {CLASS_DEFS,TICKS_PER_WEEK,wealthDrivers} from '@econ/sim';
import type {Pop,World} from '@econ/sim';
export function wealthSummary(world:World,pops:Pop[]){
 const size=pops.reduce((n,p)=>n+p.size,0);
 const totals=pops.reduce((n,p)=>{const d=wealthDrivers(world,p);return {income:n.income+d.income,inKind:n.inKind+d.inKind,fromSavings:n.fromSavings+d.fromSavings,costNow:n.costNow+d.costNow,costNext:n.costNext+d.costNext,drift:n.drift+d.drift*p.size,savings:n.savings+p.savings};},{income:0,inKind:0,fromSavings:0,costNow:0,costNext:0,drift:0,savings:0});
 return {...totals,size,weeklyDrift:size?totals.drift/size*TICKS_PER_WEEK:0,savingsWeeks:totals.costNow>0?totals.savings/(totals.costNow*TICKS_PER_WEEK):null,hasSavingsIncome:pops.some(p=>CLASS_DEFS[p.prof].stratum==='lower')};
}
