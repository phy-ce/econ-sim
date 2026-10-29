import {describe,it,expect} from 'vitest';
import {createWorld,playerCompany,GOODS} from '@econ/sim';
import {marketOf,marketPriceHistory,scopeRegions,validMarketScope} from '../src/marketScope';
describe('market scope',()=>{
 it('weights prices by actual volume and adds flows without changing source markets',()=>{
  const w=createWorld(42);w.regions=w.regions.slice(0,2);
  Object.assign(w.regions[0].market.food,{price:10,volumeEma:1,supplyEma:30,demandEma:40,inventory:5});
  Object.assign(w.regions[1].market.food,{price:30,volumeEma:3,supplyEma:70,demandEma:80,inventory:9});
  const before=JSON.stringify(w.regions);const m=marketOf(w,'world').food;
  expect(m).toEqual({price:25,ratio:25/GOODS.food.basePrice,volumeEma:4,supplyEma:100,demandEma:120,inventory:14});
  expect(JSON.stringify(w.regions)).toBe(before);
 });
 it('uses a simple mean when no trade exists and preserves local prices',()=>{
  const w=createWorld(42);w.regions=w.regions.slice(0,2);
  w.regions.forEach((r,i)=>Object.assign(r.market.food,{price:10+20*i,volumeEma:0}));
  expect(marketOf(w,'world').food.price).toBe(20);
  expect(marketOf(w,w.regions[1].id).food.price).toBe(30);
 });
 it('selects the player kingdom and safely rejects stale persisted region IDs',()=>{
  const w=createWorld(42),kid=playerCompany(w)!.kingdomId;
  expect(scopeRegions(w,'kingdom').map(r=>r.id)).toEqual(w.regions.filter(r=>r.kingdomId===kid).map(r=>r.id));
  expect(validMarketScope(999,w)).toBe('world');expect(validMarketScope(null,w)).toBe('world');
  expect(validMarketScope(w.regions[0].id,w)).toBe(w.regions[0].id);
  expect(marketOf({...w,regions:[]},'world').food.price).toBe(GOODS.food.basePrice);
 });
});

describe('market price history',()=>{
 it('keeps missing timestamps as gaps instead of joining adjacent observations',()=>{
  const history=[{tick:0,prices:{1:{food:10},2:{food:30}}},{tick:7,prices:{1:{food:12}}},{tick:14,prices:{1:{food:20},2:{food:40}}}] as unknown as import('@econ/sim').HistoryPoint[];
  expect(marketPriceHistory(history,[1,2],'food')).toEqual([{tick:0,price:20},{tick:7},{tick:14,price:30}]);
  expect(marketPriceHistory(history,[1],'food')).toEqual([{tick:0,price:10},{tick:7,price:12},{tick:14,price:20}]);
 });
 it('retains legitimate zero prices but excludes nonfinite and empty samples',()=>{
  const history=[{tick:0,prices:{1:{food:0},2:{food:NaN}}}] as unknown as import('@econ/sim').HistoryPoint[];
  expect(marketPriceHistory(history,[1],'food')).toEqual([{tick:0,price:0}]);
  expect(marketPriceHistory(history,[1,2],'food')).toEqual([{tick:0}]);
  expect(marketPriceHistory(history,[],'food')).toEqual([{tick:0}]);
 });
});
