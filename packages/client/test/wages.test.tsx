import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,playerCompany} from '@econ/sim';
import {Wages} from '../src/views/CompanyPanel';
import {setLang} from '../src/i18n';
import type {Game} from '../src/useGame';

describe('royal wage summary',()=>{
 for(const lang of ['ko','en'] as const)it(`uses kingdom regional wages and unemployment in ${lang}`,()=>{
  setLang(lang);const world=createWorld(42),me=playerCompany(world)!;
  const own=world.regions.filter(r=>r.kingdomId===me.kingdomId),foreign=world.regions.find(r=>r.kingdomId!==me.kingdomId)!;
  own.forEach((r,i)=>{r.wages={...me.wages,unskilled:i?9.87654:1.23456};});
  foreign.wages={...me.wages,unskilled:999.12345};me.wages.unskilled=4.56789;
  const template=world.pops.find(p=>p.prof==='unskilled')!;
  world.pops=[{...template,regionId:own[0].id,size:100,work:0},{...template,regionId:own[0].id,size:300,work:1},{...template,regionId:foreign.id,size:99999,work:0}];
  const html=renderToStaticMarkup(<Wages world={world} me={me} game={{command:()=>{throw Error('read only');}} as unknown as Game}/>);
  expect(html).toContain('ƒ1.23');expect(html).toContain('ƒ9.88');expect(html).toContain('4.57');
  expect(html).toContain('25%');expect(html).not.toContain('999.12');expect(html).not.toContain('type="range"');
 });
});
