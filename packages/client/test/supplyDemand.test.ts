import {describe,it,expect} from 'vitest';
import {marketSD,sdPosition} from '../src/supplyDemand';

describe('supply-demand previews',()=>{
 it('does not invent a ratio for zero aggregate demand',()=>{
  expect(marketSD({supplyEma:10,demandEma:0})).toBeNull();expect(marketSD({supplyEma:12,demandEma:8})).toBe(1.5);
 });
 it('centres equality and clips only the logarithmic marker position',()=>{
  expect(sdPosition(1)).toBe(.5);expect(sdPosition(.5)).toBe(.25);expect(sdPosition(2)).toBe(.75);expect(sdPosition(0)).toBe(0);expect(sdPosition(100)).toBe(1);
 });
});
