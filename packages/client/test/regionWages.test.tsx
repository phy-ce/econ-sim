import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,playerCompany} from '@econ/sim';
import {RegionWages} from '../src/views/RegionWages';
import {setLang} from '../src/i18n';

describe('regional wages',()=>{
 for(const lang of ['ko','en'] as const)it(`shows the region's three wage series in ${lang}`,()=>{
  setLang(lang);const world=createWorld(42),region=world.regions[0],me=playerCompany(world)!;
  region.wages={...me.wages,unskilled:1.234567};region.wageAvg={...me.wages,unskilled:2.345678};region.stateWages={...me.wages,unskilled:3.456789};
  const html=renderToStaticMarkup(<RegionWages world={world} region={region}/>);
  expect(html).toContain('ƒ1.23');expect(html).toContain('ƒ2.35');expect(html).toContain('ƒ3.46');
  expect((html.match(/class="regional-wage-class"/g)??[]).length).toBe(7);
  delete region.wageAvg;delete region.stateWages;
  const missing=renderToStaticMarkup(<RegionWages world={world} region={region}/>);
  expect((missing.match(/<td>—<\/td>/g)??[]).length).toBe(14);
 });
 it('omits the table when regional market wages are absent',()=>{
  setLang('ko');const world=createWorld(42),region=world.regions[0];delete region.wages;
  expect(renderToStaticMarkup(<RegionWages world={world} region={region}/>)).toBe('');
 });
});
