import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,getMethod} from '@econ/sim';
import {FlowRow} from '../src/views/FlowRow';
import {setLang,goodName} from '../src/i18n';

describe('production diagram',()=>{
 it('names actual resource quantities and retains the unit price in the tooltip',()=>{
  setLang('en');const world=createWorld(42),b=world.buildings.find(b=>b.typeId==='farm')!;
  b.active=true;b.idle=false;b.last.output.grain=123.456;b.last.inputFill=.5;
  const html=renderToStaticMarkup(<FlowRow world={world} building={b}/>);
  expect(html).toContain('Actual · /day');expect(html).toContain('Grain');expect(html).toContain('123.46');
  expect(html).toContain('Unit: ƒ10');expect(html).toContain('Sell-through');expect(html).toContain('Margin');
  expect(html).not.toContain('disabled=');expect(html).not.toContain('<button');
 });
 it('keeps the daily recipe distinct from actual results and allows opening goods',()=>{
  setLang('ko');const world=createWorld(42),b=world.buildings.find(b=>b.typeId==='farm')!;
  const html=renderToStaticMarkup(<FlowRow world={world} typeId={b.typeId} methodId={b.methodId} regionId={b.regionId} onGood={()=>{}}/>);
  expect(html).toContain('기준 · /일');expect(html).toContain('aria-label="곡물"');expect(html).toContain('gu-button gu-button-secondary gu-production-item');
  expect(html).toContain('비용');expect(html).toContain('매출');expect(html).not.toContain('이익률');
  expect(html).not.toContain('gu-production-meter');
 });
 it('retains readable resources with zero quantities and an explicit stopped label',()=>{
  setLang('en');const world=createWorld(42),b=world.buildings.find(b=>b.typeId==='farm')!;
  b.active=false;b.last.output.grain=999;
  const html=renderToStaticMarkup(<FlowRow world={world} building={b}/>);
  expect(html).toContain('Stopped');expect(html).toContain('Grain');expect(html).not.toContain('999');expect(html).not.toContain('gu-production-meter');
 });
 it('shows subsistence goods alongside harvest context rather than replacing outputs with badges',()=>{
  setLang('ko');const world=createWorld(42),b=world.buildings.find(b=>b.typeId==='subsistence')!;
  const method=getMethod(b.typeId,b.methodId),html=renderToStaticMarkup(<FlowRow world={world} building={b}/>);
  for(const id of Object.keys(method.outputs) as (keyof typeof method.outputs)[])expect(html).toContain(goodName(id));
 });
});
