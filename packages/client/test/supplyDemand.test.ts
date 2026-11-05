import {describe,it,expect} from 'vitest';
import {createWorld,currentSD,projectedSD,getMethod,mainOutput,regionPerk} from '@econ/sim';
import {marketSD,sdPosition,supplyDemandProjection} from '../src/supplyDemand';

describe('supply-demand previews',()=>{
 it('uses the selected method output and regional perk for one and five levels',()=>{
  const w=createWorld(42),b=w.buildings.find(b=>b.typeId==='lumber')!,r=w.regions.find(r=>r.id===b.regionId)!;
  const g=mainOutput(b.typeId,b.methodId)!;r.market[g].supplyEma=20;r.market[g].demandEma=10;
  const per=getMethod(b.typeId,b.methodId).outputs[g]!*(1+regionPerk(r.id,b.typeId));
  const result=supplyDemandProjection(w,r.id,b.typeId,b.methodId)!;
  expect(result.now).toBe(currentSD(w,r.id,g));expect(result.one).toBe(projectedSD(w,r.id,g,per));expect(result.five).toBe(projectedSD(w,r.id,g,per*5));
  r.market[g].demandEma=0;expect(supplyDemandProjection(w,r.id,b.typeId,b.methodId)).toMatchObject({now:null,one:null,five:null});
 });
 it('does not invent a ratio for a service building or zero aggregate demand',()=>{
  const w=createWorld(42),b=w.buildings.find(b=>b.typeId==='school')!;
  expect(supplyDemandProjection(w,b.regionId,b.typeId,b.methodId)).toBeNull();
  expect(marketSD({supplyEma:10,demandEma:0})).toBeNull();expect(marketSD({supplyEma:12,demandEma:8})).toBe(1.5);
 });
 it('centres equality and clips only the logarithmic marker position',()=>{
  expect(sdPosition(1)).toBe(.5);expect(sdPosition(.5)).toBe(.25);expect(sdPosition(2)).toBe(.75);expect(sdPosition(0)).toBe(0);expect(sdPosition(100)).toBe(1);
 });
});
