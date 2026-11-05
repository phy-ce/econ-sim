import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {BUILDING_TYPES,createWorld,playerCompany} from '@econ/sim';
import {buildBlockers,constructionTarget,matchesConstructionCategory} from '../src/constructionCatalogue';
import {SupplyDemandPreview} from '../src/views/SupplyDemand';
import {ConstructionDetail} from '../src/views/ConstructionDetail';
import {NavigationProvider} from '../src/NavigationHistory';
import {setLang,goodName} from '../src/i18n';
import type {Game} from '../src/useGame';
describe('construction management',()=>{
 it('preserves an existing Crown method when expanding',()=>{
  const w=createWorld(42),owner=playerCompany(w)!,b=w.buildings.find(b=>b.companyId===owner.id&&!BUILDING_TYPES.find(t=>t.id===b.typeId)!.auto)!;
  b.methodId=BUILDING_TYPES.find(t=>t.id===b.typeId)!.methods.at(-1)!.id;
  expect(constructionTarget(w,owner,b.regionId,b.typeId)).toMatchObject({building:{id:b.id},methodId:b.methodId});
 });
 it('includes mixed luxury methods and checks deposits',()=>{
  const w=createWorld(42),owner=playerCompany(w)!,region=w.regions.find(r=>r.kingdomId===owner.kingdomId)!;
  const luxury=BUILDING_TYPES.find(t=>t.methods.some(m=>m.industry==='luxury'))!;
  expect(matchesConstructionCategory(luxury.id,'luxury')).toBe(true);
  const mine=BUILDING_TYPES.find(t=>t.deposit)!;region.deposits[mine.deposit!]=0;
  expect(buildBlockers(w,owner,region,mine.id).length).toBeGreaterThan(0);
 });
 it('shows every mixed output without expansion predictions',()=>{
  setLang('en');const w=createWorld(42),type=BUILDING_TYPES.find(t=>t.methods.some(m=>Object.keys(m.outputs).length>1))!,method=type.methods.find(m=>Object.keys(m.outputs).length>1)!;
  const html=renderToStaticMarkup(<SupplyDemandPreview world={w} regionId={w.regions[0].id} typeId={type.id} methodId={method.id}/>);
  for(const g of Object.keys(method.outputs))expect(html).toContain(goodName(g as Parameters<typeof goodName>[0]));
  expect(html).not.toContain('sd-one');expect(html).not.toContain('sd-five');
 });
 it('keeps foreign buildings read only',()=>{
  const w=createWorld(42),owner=playerCompany(w)!,b=w.buildings.find(b=>!BUILDING_TYPES.find(t=>t.id===b.typeId)!.auto&&w.regions.find(r=>r.id===b.regionId)!.kingdomId!==owner.kingdomId)!;
  const html=renderToStaticMarkup(<NavigationProvider><ConstructionDetail world={w} game={{command:()=>{}} as unknown as Game} region={w.regions.find(r=>r.id===b.regionId)!} typeId={b.typeId} onGood={()=>{}} onCompany={()=>{}} onOpenBuilding={()=>{}}/></NavigationProvider>);
  expect(html).not.toContain('class="hctrl"');expect(html).not.toContain('construction-crown');
 });
});
