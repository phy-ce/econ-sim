import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,playerCompany} from '@econ/sim';
import {NavigationProvider} from '../src/NavigationHistory';
import {FinancePanel} from '../src/views/FinancePanel';
import {KO} from '../src/strings';
import {setLang} from '../src/lang';
import type {Game} from '../src/useGame';

describe('budget production accounts',()=>{
 const render=(withoutFirms:boolean)=>{
  setLang('ko');
  const world=createWorld(42),me=playerCompany(world)!;
  if(withoutFirms)world.buildings=world.buildings.filter(b=>b.companyId!==me.id||b.typeId==='admin'||b.typeId==='school');
  const game={command:()=>{}} as unknown as Game;
  return renderToStaticMarkup(<NavigationProvider><FinancePanel world={world} me={me} game={game}/></NavigationProvider>);
 };
 it('keeps the enterprise account when the crown has a construction office',()=>{
  expect(render(false)).toContain(KO.budgetLines.stateFirms);
 });
 it('omits the empty enterprise account while retaining government staff costs',()=>{
  const html=render(true);
  expect(html).not.toContain(KO.budgetLines.stateFirms);
  expect(html).toContain(KO.budgetLines.wages);
 });
});
