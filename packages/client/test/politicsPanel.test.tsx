import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,interestGroups,VOTING_NAMES} from '@econ/sim';
import {NavigationProvider} from '../src/NavigationHistory';
import {PoliticsPanel} from '../src/views/PoliticsPanel';
import {setLang} from '../src/i18n';
describe('read-only politics',()=>{
 it('renders every group for the selected kingdom in both languages without changing the world',()=>{
  const world=createWorld(42),before=JSON.stringify(world),id=world.kingdoms[1].id,status=interestGroups(world,id);
  for(const lang of ['ko','en'] as const){setLang(lang);const html=renderToStaticMarkup(<NavigationProvider><PoliticsPanel world={world} kingdomId={id}/></NavigationProvider>);
   expect(html).toContain(VOTING_NAMES[status.votingLaw][lang]);expect((html.match(/data-ig=/g)??[]).length).toBe(6);
   for(const g of status.groups)expect(html).toContain(lang==='ko'?g.name:g.nameEn);
   expect(html).not.toContain('lawChance');
  }
  expect(JSON.stringify(world)).toBe(before);
 });
});
