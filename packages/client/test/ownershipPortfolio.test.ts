import {describe,it,expect} from 'vitest';
import {createWorld,KEEP_SHARE,TUNE,shareWeight} from '@econ/sim';
import {ownershipPeople,ownerUnitStats,shareLabel} from '../src/ownershipPortfolio';
describe('ownership portfolios',()=>{
 it('keeps tiny positive shares visible without enlarging their ratio',()=>{expect(shareLabel(.000001)).toBe('<0.01%');expect(shareLabel(.125)).toBe('12.50%');expect(shareLabel(0)).toBe('0.00%');});
 for(const type of ['finance','manor'])it(`${type} uses owned units including unemployed gentry, rather than seated population`,()=>{const w=createWorld(42),b=w.buildings.find(b=>b.typeId===type)!,p=w.pops[0];w.pops=[{...p,id:1,size:10000,work:b.id,fund:{id:[b.id+1,b.id],u:[99,1]}},{...p,id:2,prof:'gentry',size:10,work:0,fund:{id:[b.id],u:[3]}}];expect(ownershipPeople(w,b).map(x=>[x.p.id,x.weight])).toEqual([[2,3],[1,1]]);b.profitEma=100;b.nav=10;const stats=ownerUnitStats(w,b);expect(stats.units).toBe(4);expect(stats.weekly).toBe(100*7*(1-KEEP_SHARE[type])/4);});
 it('preserves seated class weights only when manor shares are disabled',()=>{const previous=TUNE.manorShares;TUNE.manorShares=0;try{const w=createWorld(42),b=w.buildings.find(b=>b.typeId==='manor')!,p=w.pops[0];w.pops=[{...p,id:1,prof:'gentry',work:b.id,size:10},{...p,id:2,prof:'gentry',work:0,size:9000}];expect(ownershipPeople(w,b).map(x=>[x.p.id,x.weight])).toEqual([[1,10*shareWeight('gentry')]]);}finally{TUNE.manorShares=previous;}});
});
