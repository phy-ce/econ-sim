import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,wagesAt} from '@econ/sim';
import {WorkforceWage,workforceWageQuotes} from '../src/views/WorkforceWage';
import {setLang} from '../src/i18n';

describe('workforce wages',()=>{
 it('shows actual AI premium pay and the employed-weighted group wage',()=>{
  setLang('en');const w=createWorld(42),b=w.buildings.find(b=>b.typeId==='lumber')!,c=w.companies.find(c=>c.id===b.companyId)!;
  const r=w.regions.find(r=>r.id===b.regionId)!;
  r.wages={...c.wages,unskilled:8};c.wageOffset=undefined;
  c.aiPremium={[r.id]:{off:{...b.employed,unskilled:.25},emp:{...b.employed},vac:{...b.employed}}};
  b.employed.unskilled=100;
  const single=renderToStaticMarkup(<WorkforceWage world={w} buildings={[b]} skill="unskilled"/>);
  expect(wagesAt(c,b.typeId,w,r.id).unskilled).toBe(10);expect(single).toContain('ƒ10.00');expect(single).toContain('+25%');
  const secondRegion=w.regions.find(x=>x.id!==r.id)!;secondRegion.wages={...c.wages,unskilled:20};
  const second={...b,id:b.id+10000,regionId:secondRegion.id,employed:{...b.employed,unskilled:300}};
  const group=renderToStaticMarkup(<WorkforceWage world={w} buildings={[b,second]} skill="unskilled"/>);
  expect(group).toContain('ƒ17.50');expect(group).toContain('ƒ10 ~ ƒ20');
 });
 it('does not substitute a wage for share-paid manor positions',()=>{
  const w=createWorld(42),b=w.buildings.find(b=>b.typeId==='manor')!;
  expect(workforceWageQuotes(w,[b],'aristocrat',new Map())).toEqual([]);
 });
});
