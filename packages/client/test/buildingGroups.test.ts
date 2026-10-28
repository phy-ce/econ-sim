import {describe,it,expect} from 'vitest';
import {createWorld,buildingEcon} from '@econ/sim';
import type {World} from '@econ/sim';
import {buildingGroups,sumEcon,summarizeBuildings} from '../src/buildingGroups';
describe('building groups',()=>{
 it('combines ownership by owner ID and computes ratios from totals',()=>{
  const w=createWorld(42),base=buildingEcon(w,w.buildings[0]);
  const a={...base,day:{sales:100,inputs:20,wages:30,profit:50,tax:0,fee:0},profitWeek:350,jobs:10,employed:5,owners:[{owner:'state' as const,levels:2,share:1,dividendWeek:10}]};
  const b={...a,day:{sales:300,inputs:100,wages:100,profit:100,tax:0,fee:0},profitWeek:700,jobs:90,employed:90,owners:[{owner:'state' as const,levels:3,share:1,dividendWeek:20}]};
  const e=sumEcon([a,b],5);
  expect(e.staffing).toBe(.95);expect(e.margin).toBe(.375);expect(e.profitWeekPerLevel).toBe(210);
  expect(e.owners).toEqual([{owner:'state',levels:5,share:1,dividendWeek:30}]);
 });
 it('keeps pending-only types and combines duplicate building types',()=>{
  const w=createWorld(42),b=w.buildings[0];
  w.buildings=[b,{...b,id:999,level:3}];
  w.constructions=[{id:1000,regionId:b.regionId,typeId:'distillery',companyId:b.companyId,levels:5,points:10,required:100} as World['constructions'][number]];
  const groups=buildingGroups(w,b.regionId);
  expect(groups.find(g=>g.typeId===b.typeId)?.levels).toBe(b.level+3);
  expect(groups.find(g=>g.typeId==='distillery')?.levels).toBe(0);
  expect(groups.find(g=>g.typeId==='distillery')?.projects).toHaveLength(1);
 });
 it('weights utilization by levels and treats stopped buildings as zero',()=>{
  const w=createWorld(42),b=w.buildings[0];
  expect(summarizeBuildings(w,[{...b,level:1,active:true,idle:false,utilization:1},{...b,level:3,active:false,utilization:1}]).utilization).toBe(.25);
  expect(sumEcon([],0).margin).toBeNull();expect(sumEcon([],0).staffing).toBe(0);
 });
});
