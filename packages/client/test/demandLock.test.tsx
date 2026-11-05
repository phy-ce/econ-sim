import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,goodTechs,playerCompany} from '@econ/sim';
import {DemandLock} from '../src/views/DemandLock';
import {setLang,techName} from '../src/i18n';
describe('resident demand technology lock',()=>{
 it('uses the player kingdom for aggregate markets and the selected foreign region for regional markets',()=>{
  const w=createWorld(42),id=playerCompany(w)!.kingdomId,own=w.regions.find(r=>r.kingdomId===id)!,foreign=w.regions.find(r=>r.kingdomId!==id)!;
  own.lockedGoods=['transport'];foreign.lockedGoods=[];
  for(const lang of ['ko','en'] as const){setLang(lang);const html=renderToStaticMarkup(<DemandLock world={w} good="transport"/>);for(const tech of goodTechs('transport'))expect(html).toContain(techName(tech));}
  expect(renderToStaticMarkup(<DemandLock world={w} good="transport" regionId={foreign.id}/>)).toBe('');
  foreign.lockedGoods=['transport'];own.lockedGoods=[];
  expect(renderToStaticMarkup(<DemandLock world={w} good="transport"/>)).toBe('');
  expect(renderToStaticMarkup(<DemandLock world={w} good="transport" regionId={foreign.id}/>)).toContain('demand-lock');
 });
});
