import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,playerCompany,taxRates} from '@econ/sim';
import {PolicyPanel} from '../src/views/PolicyPanel';
import {NavigationProvider} from '../src/NavigationHistory';
import {setLang} from '../src/i18n';
import {exactNumber} from '../src/format';
import type {Game} from '../src/useGame';

describe('policy tax quotes',()=>{
 for(const lang of ['ko','en'] as const)it(`quotes every tax option at the current budget level in ${lang}`,()=>{
  setLang(lang);const world=createWorld(42),me=playerCompany(world)!;
  const k=world.kingdoms.find(k=>k.id===me.kingdomId)!;
  k.budget.tax=5;
  const html=renderToStaticMarkup(<NavigationProvider><PolicyPanel world={world} kingdomId={k.id} game={{command:()=>{}} as unknown as Game} onResearch={()=>{}}/></NavigationProvider>);
  for(const law of ['land','poll'] as const)expect(html).toContain(`ƒ${exactNumber(taxRates(k,law)[law])}`);
  expect(html).toContain(`${exactNumber(taxRates(k,'income').income*100)}%`);
 });
});
