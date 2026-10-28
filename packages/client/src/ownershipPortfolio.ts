import {shareWeight} from '@econ/sim';
import type {World,Building} from '@econ/sim';
export const shareLabel=(share:number)=>share>0&&share<.0001?'<0.01%':`${(share*100).toFixed(2)}%`;
export function ownershipPeople(world:World,b:Building){return world.pops.map(p=>{const index=p.fund?.id.indexOf(b.id)??-1;return {p,weight:b.typeId==='finance'?(index>=0?p.fund!.u[index]:0):(p.work===b.id?p.size*shareWeight(p.prof):0)};}).filter(x=>x.weight>0).sort((a,b)=>b.weight-a.weight);}
