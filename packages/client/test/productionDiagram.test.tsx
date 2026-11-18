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
  world.regions.find(r=>r.id===b.regionId)!.market.tools.price=10;
  const html=renderToStaticMarkup(<FlowRow world={world} building={b}/>);
  expect(html).toContain('Actual · /day');expect(html).toContain('Grain');expect(html).toContain('123.46');
  expect(html).toContain('Unit: ƒ10');expect(html).toContain('Sell-through');expect(html).toContain('Margin');
  expect(html).not.toContain('disabled=');expect(html).not.toContain('<button');
 });
 it('keeps the daily recipe distinct from actual results and allows opening goods',()=>{
  setLang('ko');const world=createWorld(42),b=world.buildings.find(b=>b.typeId==='farm')!;
  const html=renderToStaticMarkup(<FlowRow world={world} typeId={b.typeId} methodId={b.methodId} regionId={b.regionId} onGood={()=>{}}/>);
  expect(html).toContain('기준 · /일');expect(html).toContain('aria-label="곡물"');expect(html).toContain('gu-button gu-button-secondary es-resource-row');
  expect(html).toContain('비용');expect(html).toContain('매출');expect(html).not.toContain('이익률');
  expect(html).not.toContain('role="meter"');
 });
 it('retains readable resources with zero quantities and an explicit stopped label',()=>{
  setLang('en');const world=createWorld(42),b=world.buildings.find(b=>b.typeId==='farm')!;
  b.active=false;b.last.output.grain=999;
  const html=renderToStaticMarkup(<FlowRow world={world} building={b}/>);
  expect(html).toContain('Stopped');expect(html).toContain('Grain');expect(html).not.toContain('999');expect(html).not.toContain('role="meter"');
 });
 it('shows subsistence goods alongside harvest context rather than replacing outputs with badges',()=>{
  setLang('ko');const world=createWorld(42),b=world.buildings.find(b=>b.typeId==='subsistence')!;
  const method=getMethod(b.typeId,b.methodId),html=renderToStaticMarkup(<FlowRow world={world} building={b}/>);
  for(const id of Object.keys(method.outputs) as (keyof typeof method.outputs)[])expect(html).toContain(goodName(id));
 });
 it('preserves every input and output in aggregated multi-good production',()=>{
  setLang('en');const world=createWorld(42),b=world.buildings.find(b=>b.typeId==='farm')!;
  const html=renderToStaticMarkup(<FlowRow world={world} typeId={b.typeId} methodId={b.methodId} regionId={b.regionId} summary={{inputs:[{g:'tools',cur:12,price:10,value:120},{g:'timber',cur:20,price:5,value:100}],outputs:[{g:'grain',cur:200,price:1,value:200},{g:'fiber',cur:30,price:2,value:60}],inputFill:.62,rev:260,raw:220,wage:100,stopped:false,points:0,tax:0,seats:0,officeLoad:1}}/>);
  expect(html.match(/class="es-resource-row /g)).toHaveLength(4);
  for(const name of ['Tools','Timber','Grain','Fibre'])expect(html).toContain(name);
  expect(html).toContain('62%');expect(html).toContain('es-resource-columns');
 });
 it('caps extreme losses in the real game ledger',()=>{
  setLang('en');const world=createWorld(42),b=world.buildings.find(b=>b.typeId==='farm')!;
  b.last.revenue=.0001;b.last.inputCost=1e6;b.last.wageCost=0;
  expect(renderToStaticMarkup(<FlowRow world={world} building={b}/>)).toContain('&lt; −100%');
  b.last.revenue=0;
  expect(renderToStaticMarkup(<FlowRow world={world} building={b}/>)).not.toContain('&lt; −100%');
 });
});
