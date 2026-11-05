import {KEEP_SHARE,TUNE,shareWeight} from '@econ/sim';
import type {World,Building} from '@econ/sim';
export const shareLabel=(share:number)=>share>0&&share<.0001?'<0.01%':`${(share*100).toFixed(2)}%`;
export const usesOwnerUnits=(b:Building)=>b.typeId==='finance'||b.typeId==='manor'&&!!TUNE.manorShares;
export function ownershipPeople(world:World,b:Building){return world.pops.map(p=>{const index=p.fund?.id.indexOf(b.id)??-1;return {p,weight:usesOwnerUnits(b)?(index>=0?p.fund!.u[index]:0):(p.work===b.id?p.size*shareWeight(p.prof):0)};}).filter(x=>x.weight>0).sort((a,b)=>b.weight-a.weight);}
export function ownerUnitStats(world:World,b:Building){
 const units=ownershipPeople(world,b).reduce((n,x)=>n+x.weight,0),nav=b.nav;
 const weekly=units>0?Math.max(0,b.profitEma)*7*(1-KEEP_SHARE[b.typeId])/units:0;
 return {units,nav,weekly,yield:nav&&nav>0?weekly/nav:null};
}
