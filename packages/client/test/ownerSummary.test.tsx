import {NavigationProvider} from '../src/NavigationHistory';
import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,TUNE} from '@econ/sim';
import {BuildingInspector} from '../src/views/ResourceInspector';
import {setLang} from '../src/i18n';
import {OwnerSummary} from '../src/views/OwnerSummary';
describe('owner institution display',()=>{
 it('marks the manor gentry position as receiving a share',()=>{
  // 저택 지분(manorShares 1, 기본)이면 하급 귀족은 저택에 앉지 않는다. 이 시험은 옛 자리 규칙(0)의 표시를 본다 (sim 쪽 최소 수정, UI_CHANGES 2-87)
  const prev=TUNE.manorShares;TUNE.manorShares=0;
  try{
  setLang('ko');const world=createWorld(42),manor=world.buildings.find(b=>b.typeId==='manor')!;
  const html=renderToStaticMarkup(<OwnerSummary buildings={[manor]}/>);
  expect(html).toMatch(/하급 귀족 <span title="배당" aria-label="배당">/);
  }finally{TUNE.manorShares=prev;}
 });
 for(const type of ['manor','finance'])it(`${type} shows staffing and treasury without factory metrics`,()=>{setLang('ko');const world=createWorld(42),building=world.buildings.find(b=>b.typeId===type)!;const html=renderToStaticMarkup(<NavigationProvider><BuildingInspector world={world} building={building} onGood={()=>{}} onCompany={()=>{}}/></NavigationProvider>);expect(html).toContain('금고');expect(html).toContain('수입 / 일');expect(html).toContain(type==='manor'?'귀족 자리':'직원 충원');expect(html).not.toContain('가동률');expect(html).not.toContain('원료 충족');expect(html).not.toContain('class="recipe"');});
 it('keeps production metrics for a producing building',()=>{setLang('ko');const world=createWorld(42),building=world.buildings.find(b=>b.typeId==='logging')??world.buildings.find(b=>b.typeId==='farm')!;expect(building).toBeTruthy();const html=renderToStaticMarkup(<NavigationProvider><BuildingInspector world={world} building={building} onGood={()=>{}} onCompany={()=>{}}/></NavigationProvider>);expect(html).toContain('가동률');expect(html).toContain('원료 충족');});
});
