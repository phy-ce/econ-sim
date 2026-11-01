import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {WindowWorkspace} from '../src/views/WindowWorkspace';
import type {WindowDefinition,WindowId} from '../src/views/WindowWorkspace';
describe('multiple floating windows',()=>{
 it('keeps three windows visible together rather than evicting a side',()=>{
  const ids:WindowId[]=['region','market','state'];
  const windows:WindowDefinition[]=[{id:'map',title:'Map',icon:null,content:'map'},...ids.map(id=>({id,title:id,icon:null,content:id}))];
  const html=renderToStaticMarkup(React.createElement(WindowWorkspace,{windows,opened:ids,onOpened:()=>{}}));
  expect((html.match(/<section /g)??[]).length).toBe(3);expect(html).not.toContain('<section hidden');expect((html.match(/aria-pressed="true"/g)??[]).length).toBe(3);
 });
});