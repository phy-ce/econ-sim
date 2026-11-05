import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,companyById,BUILDING_BY_ID} from '@econ/sim';
import {MethodComparison} from '../src/views/MethodComparison';
import {methodName,setLang} from '../src/i18n';
import type {Game} from '../src/useGame';

describe('production method comparison',()=>{
 it('keeps the current method first and marks locked alternatives without changing it',()=>{
  setLang('en');const world=createWorld(42),b=world.buildings.find(b=>b.typeId==='lumber')!,owner=companyById(world,b.companyId)!;
  const methods=BUILDING_BY_ID[b.typeId].methods;b.methodId=methods[1].id;owner.research.known=[];
  const html=renderToStaticMarkup(<MethodComparison world={world} building={b} owner={owner} game={{command:()=>{throw Error('preview must not change method');}} as unknown as Game}/>);
  const header=html.match(/<thead>[\s\S]*?<\/thead>/)![0];
  expect(header.indexOf(methodName(methods[1]))).toBeLessThan(header.indexOf(methodName(methods[0])));
  expect(html).toContain('Experience −50%');expect(html).toContain('method-delta');expect(html).toContain('disabled');
  expect(b.methodId).toBe(methods[1].id);
 });
});
