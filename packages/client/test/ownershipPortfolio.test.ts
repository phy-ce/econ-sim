import {describe,it,expect} from 'vitest';
import {createWorld,shareWeight} from '@econ/sim';
import {ownershipPeople,shareLabel} from '../src/ownershipPortfolio';
describe('ownership portfolios',()=>{
 it('keeps tiny positive shares visible without enlarging their ratio',()=>{expect(shareLabel(.000001)).toBe('<0.01%');expect(shareLabel(.125)).toBe('12.50%');expect(shareLabel(0)).toBe('0.00%');});
 it('uses fund units rather than worker population',()=>{const w=createWorld(42),b=w.buildings.find(b=>b.typeId==='finance')!,p=w.pops[0];w.pops=[{...p,id:1,size:10000,work:b.id,fund:{id:[b.id+1,b.id],u:[99,1]}},{...p,id:2,size:10,work:0,fund:{id:[b.id],u:[3]}}];expect(ownershipPeople(w,b).map(x=>[x.p.id,x.weight])).toEqual([[2,3],[1,1]]);});
 it('limits manor distribution to its seated pops and applies class weights',()=>{const w=createWorld(42),b=w.buildings.find(b=>b.typeId==='manor')!,p=w.pops[0];w.pops=[{...p,id:1,prof:'gentry',work:b.id,size:10},{...p,id:2,prof:'gentry',work:0,size:9000}];expect(ownershipPeople(w,b).map(x=>[x.p.id,x.weight])).toEqual([[1,10*shareWeight('gentry')]]);});
});
