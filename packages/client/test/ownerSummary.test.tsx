import {NavigationProvider} from '../src/NavigationHistory';
import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,TUNE} from '@econ/sim';
import {BuildingInspector} from '../src/views/ResourceInspector';
import {setLang} from '../src/i18n';
import {OwnerSummary} from '../src/views/OwnerSummary';
describe('owner institution display',()=>{
 it('shows the default share-based manor seats without a seated gentry row',()=>{
  setLang('ko');const world=createWorld(42),manor=world.buildings.find(b=>b.typeId==='manor')!;
  expect(TUNE.manorShares).toBe(1);
  const html=renderToStaticMarkup(<OwnerSummary buildings={[manor]}/>);
  expect(html).toContain('상급 귀족 자리');expect(html).not.toContain('하급 귀족');
  expect(html).toMatch(/상급 귀족 <span title="배당" aria-label="배당">/);
 });
 for(const type of ['manor','finance'])it(`${type} shows staffing and treasury without factory metrics`,()=>{setLang('ko');const world=createWorld(42),building=world.buildings.find(b=>b.typeId===type)!;const html=renderToStaticMarkup(<NavigationProvider><BuildingInspector world={world} building={building} onGood={()=>{}} onCompany={()=>{}}/></NavigationProvider>);expect(html).toContain('금고');expect(html).toContain('받은 돈 / 주');expect(html).toContain(type==='manor'?'귀족 자리':'직원 충원');expect(html).not.toContain('가동률');expect(html).not.toContain('원료 충족');expect(html).not.toContain('class="recipe"');});
 it('keeps production metrics for a producing building',()=>{setLang('ko');const world=createWorld(42),building=world.buildings.find(b=>b.typeId==='logging')??world.buildings.find(b=>b.typeId==='farm')!;expect(building).toBeTruthy();const html=renderToStaticMarkup(<NavigationProvider><BuildingInspector world={world} building={building} onGood={()=>{}} onCompany={()=>{}}/></NavigationProvider>);expect(html).toContain('가동률');expect(html).toContain('원료 충족');});
});
