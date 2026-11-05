import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {BUILDING_BY_ID,TUNE,taxCapacity,createWorld,crewOf,efficiency,getMethod,harvestFactor} from '@econ/sim';
import {actualOutputFactors} from '../src/actualOutput';
import {ActualOutput} from '../src/views/ActualOutput';
describe('actual output rate',()=>{
 it('matches the administrative tax capacity, including missing inputs',()=>{
  const w=createWorld(42),b=w.buildings.find(b=>b.typeId==='admin')!;b.crew=.65;b.utilization=.8;b.last.inputFill=.4;b.active=true;b.idle=false;
  w.buildings=[b];
  const nominal=getMethod(b.typeId,b.methodId).taxCapacity!*TUNE.adminScale*b.level;
  expect(actualOutputFactors(w,b).rate*nominal).toBeCloseTo(taxCapacity(w,w.regions.find(r=>r.id===b.regionId)!.kingdomId),9);
  b.last.inputFill=0;expect(actualOutputFactors(w,b).rate).toBe(0);
 });
 it('zeros stopped buildings and idle offices even with stale input coverage',()=>{
  const w=createWorld(42),b=w.buildings.find(b=>b.typeId==='builder')!;b.last.inputFill=1;b.crew=1;b.active=false;
  expect(actualOutputFactors(w,b).rate).toBe(0);b.active=true;b.idle=true;
  expect(actualOutputFactors(w,b).rate).toBe(0);b.idle=false;w.constructions=[];
  expect(actualOutputFactors(w,b).office).toBe(0);expect(actualOutputFactors(w,b).rate).toBe(0);
 });
 it('includes harvest effects and leaves rates above 100% uncapped',()=>{
  const w=createWorld(42),b=w.buildings.find(b=>b.typeId==='lumber')!;b.active=true;b.idle=false;b.exp=1;b.level=100;b.utilization=1;b.crew=1;b.last.inputFill=1;
  const expected=crewOf(b)*efficiency(b)*harvestFactor(w,b.regionId,BUILDING_BY_ID[b.typeId].land);
  expect(actualOutputFactors(w,b).rate).toBeCloseTo(expected,10);
  expect(expected).toBeGreaterThan(1);
  expect(renderToStaticMarkup(<ActualOutput world={w} building={b}/>)).toContain(`${(expected*100).toFixed(2)}%`);
 });
});
