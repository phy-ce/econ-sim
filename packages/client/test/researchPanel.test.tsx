import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,playerCompany,TECHS} from '@econ/sim';
import {techName} from '../src/i18n';
import {ResearchPanel} from '../src/views/ResearchPanel';
import {NavigationProvider} from '../src/NavigationHistory';
import {setLang} from '../src/i18n';
import type {Game} from '../src/useGame';
describe('research desk',()=>{
 it('shows the requested locked technology without changing the active research',()=>{
  setLang('ko');const world=createWorld(42),me=playerCompany(world)!,target=TECHS.at(-1)!;
  const current=me.research.current;
  const html=renderToStaticMarkup(<NavigationProvider><ResearchPanel world={world} me={me} game={{command:()=>{throw Error('selection must not start research');}} as unknown as Game} request={{id:target.id,sequence:1}}/></NavigationProvider>);
  const dossier=html.match(/class="research-dossier"[\s\S]*?<\/header>/)?.[0];
  expect(dossier).toContain(techName(target.id));
  expect(me.research.current).toBe(current);
 });
 for(const lang of ['ko','en'] as const)it(`renders the compact desk in ${lang} without embedding the full graph`,()=>{
 setLang(lang);const world=createWorld(42),me=playerCompany(world)!;
 const html=renderToStaticMarkup(<NavigationProvider><ResearchPanel world={world} me={me} game={{command:()=>{}} as unknown as Game}/></NavigationProvider>);
 expect(html).toContain('research-catalog');expect(html).toContain('research-dossier');expect(html).toContain('aria-haspopup="dialog"');expect(html).not.toContain('class="research-tree"');expect(html).toContain(lang==='ko'?'열리는 것':'Unlocks');expect(html).toContain(lang==='ko'?'기술 검색':'Search technologies');
 });
});
