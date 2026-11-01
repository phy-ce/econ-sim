import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,playerCompany,privatizePrice,sellsShares} from '@econ/sim';
import {BuildingEconomics} from '../src/views/BuildingEconomics';
import {NavigationProvider} from '../src/NavigationHistory';
import {setLang} from '../src/i18n';
import {exactNumber} from '../src/format';
import type {Game} from '../src/useGame';

describe('privatization controls',()=>{
 for(const lang of ['ko','en'] as const)it(`quotes the actual per-level sale price in ${lang}`,()=>{
  setLang(lang);const world=createWorld(42),me=playerCompany(world)!;
  const b=world.buildings.find(b=>sellsShares(b.typeId))!;
  b.companyId=me.id;b.stateOwned=true;b.level=3;b.profitEma=123.456;
  const sale=privatizePrice(world,me,b);
  const html=renderToStaticMarkup(<NavigationProvider><BuildingEconomics world={world} building={b} game={{command:()=>{}} as unknown as Game}/></NavigationProvider>);
  expect(html).toContain('type="checkbox"');
  expect(html).toContain(`ƒ${exactNumber(sale.price)}`);
  expect(html).toContain(`ƒ${exactNumber(sale.yearProfit)}`);
 });
 it('does not offer the unsupported trading-post sale',()=>{
  setLang('ko');const world=createWorld(42),me=playerCompany(world)!;
  const b=world.buildings.find(b=>b.typeId==='trading_post')!;
  b.companyId=me.id;b.stateOwned=true;
  const html=renderToStaticMarkup(<NavigationProvider><BuildingEconomics world={world} building={b} game={{command:()=>{}} as unknown as Game}/></NavigationProvider>);
  expect(html).not.toContain('type="checkbox"');
 });
});
