import {describe,it,expect} from 'vitest';
import {dangerPause} from '../src/dangerPause';
describe('danger pause episodes',()=>{
 it('does not pause again during four-week repeats but resets after a gap',()=>{
  const seen=new Map(),base={kind:'danger' as const,companyId:100,text:'미지급 100',buildingId:3};
  expect(dangerPause(seen,{...base,tick:1},true)).toBe(true);
  expect(dangerPause(seen,{...base,text:'미지급 200',tick:29},true)).toBe(false);
  expect(dangerPause(seen,{...base,tick:57},true)).toBe(false);
  expect(dangerPause(seen,{...base,tick:93},true)).toBe(true);
 });
 it('keeps independent building keys and does not consume a pause while paused',()=>{
  const seen=new Map(),base={kind:'danger' as const,companyId:100,text:'unpaid',tick:1};
  expect(dangerPause(seen,{...base,buildingId:1},false)).toBe(false);
  expect(dangerPause(seen,{...base,buildingId:1,tick:29},true)).toBe(true);
  expect(dangerPause(seen,{...base,buildingId:2,tick:29},true)).toBe(true);
 });
});
