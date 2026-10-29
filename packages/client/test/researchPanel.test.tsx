import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,playerCompany} from '@econ/sim';
import {ResearchPanel} from '../src/views/ResearchPanel';
import {NavigationProvider} from '../src/NavigationHistory';
import {setLang} from '../src/i18n';
import type {Game} from '../src/useGame';
describe('research desk',()=>{
 for(const lang of ['ko','en'] as const)it(`renders the compact desk in ${lang} without embedding the full graph`,()=>{
 setLang(lang);const world=createWorld(42),me=playerCompany(world)!;
 const html=renderToStaticMarkup(<NavigationProvider><ResearchPanel world={world} me={me} game={{command:()=>{}} as unknown as Game}/></NavigationProvider>);
 expect(html).toContain('research-catalog');expect(html).toContain('research-dossier');expect(html).toContain('aria-haspopup="dialog"');expect(html).not.toContain('class="research-tree"');expect(html).toContain(lang==='ko'?'열리는 것':'Unlocks');expect(html).toContain(lang==='ko'?'기술 검색':'Search technologies');
 });
});
