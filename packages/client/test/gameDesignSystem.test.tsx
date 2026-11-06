import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {chartPoints,ConfirmDemolition,Figure,FillBar,GameUIProvider,HistoryChart,ledgerRowHeight,MarketLedger,operationRate,OwnershipStrip} from '../src/foundations/game-ui';
import {ComponentExample,ConstructionWorkspace} from '../src/foundations/game-examples';
import {componentInfo,groups,type ComponentId} from '../src/foundations/game-copy';
import {dependencies} from '../src/foundations/game-catalogue';

describe('game design system',()=>{
 it('keeps missing, zero, signs and display precision distinct',()=>{
  const render=(value:number|null)=>renderToStaticMarkup(<Figure value={value} unit="ƒ" signed/>);
  expect(render(null)).toContain('—');expect(render(0)).toContain('aria-label="0 ƒ"');
  expect(render(-10.125)).toContain('−10.13');expect(render(Infinity)).toContain('—');
  expect(renderToStaticMarkup(<Figure value={1248032.451} compact/>)).toContain('aria-label="1,248,032.45"');
 });
 it('includes crew, input constraints and harvest in operation and zeroes stopped output',()=>{
  const factors={utilization:.5,crew:.82,efficiency:1.18,inputFill:.64,harvest:.8};
  expect(operationRate(factors)).toBeCloseTo(.2477056);
  expect(operationRate({...factors,inputFill:0})).toBe(0);
  expect(operationRate({...factors,crew:0})).toBe(0);
  expect(operationRate({...factors,stopped:true})).toBe(0);
 });
 it('caps only the meter geometry while preserving values above capacity',()=>{
  const html=renderToStaticMarkup(<FillBar label="Actual operation" value={1.18}/>);
  expect(html).toContain('width:100%');expect(html).toContain('118');
  expect(renderToStaticMarkup(<FillBar label="Missing" value={null}/>)).toContain('—');
 });
 it('keeps compact rows independent of hidden art and derives illustrated rows from the actual icon footprint',()=>{
  expect(ledgerRowHeight(true,48,4,14)).toBe(32);
  expect(ledgerRowHeight(false,32,12,18)).toBe(89);
  const html=renderToStaticMarkup(<MarketLedger selected="timber" onSelect={()=>{}} compact={false} iconSize={32} rowPadding={12} textSize={18}/>);
  expect(html).toContain('--gu-ledger-art:64px');expect(html).toContain('--gu-ledger-type:18px');
 });
 it('applies preview values through the same components without losing numeric constraints',()=>{
  const html=renderToStaticMarkup(<ComponentExample id="quantity" settings={{amount:9999.123,compact:false}}/>);
  expect(html).toContain('9,999.12');expect(html).not.toContain('9,999.123');
  const chart=renderToStaticMarkup(<HistoryChart height={260}/>);
  expect(chart).toContain('viewBox="0 0 520 260"');
 });
 it('does not invent ownership when the denominator is zero',()=>{
  const html=renderToStaticMarkup(<OwnershipStrip shares={{crown:0,manor:0,finance:0}} selected="crown" onSelect={()=>{}}/>);
  expect(html).not.toContain('NaN');expect(html).not.toContain('Infinity');
  expect(html).toContain('왕실 0%');
 });
 it('scales negative histories and single points without invalid coordinates',()=>{
  const points=chartPoints([-50,50]);expect(points[0].y).toBe(144);expect(points[1].y).toBe(16);
  expect(chartPoints([])).toEqual([]);expect(chartPoints([0])[0]).toEqual({x:48,y:144});
 });
 it('keeps a selected building and the confirmation or history label in the same context',()=>{
  const farm=renderToStaticMarkup(<GameUIProvider value="en"><ConstructionWorkspace initialType="farm"/></GameUIProvider>);
  const identity=farm.slice(farm.indexOf('gu-building-heading'),farm.indexOf('gu-building-heading')+600);
  expect(identity).toContain('Level 12');
  const confirm=renderToStaticMarkup(<ConfirmDemolition target="Farm" cost={25} onConfirm={()=>{}}/>);
  expect(confirm).toContain('<dd>Farm');expect(confirm).toContain('25');
  const chart=renderToStaticMarkup(<HistoryChart label="Price" entries={[2.1,2.48]}/>);
  expect(chart).toContain('aria-label="Price:');expect(chart).not.toContain('2.480000');
 });
 it('connects all 21 specimens into five levels and renders them in both languages',()=>{
  const ids=Object.keys(componentInfo) as ComponentId[];
  expect(groups).toHaveLength(5);expect(groups.flatMap(group=>[...group.items]).sort()).toEqual([...ids].sort());
  for(const id of ids){for(const dependency of dependencies[id])expect(ids).toContain(dependency);
   for(const lang of ['ko','en'] as const){const html=renderToStaticMarkup(<GameUIProvider value={lang}><ComponentExample id={id}/></GameUIProvider>);expect(html.length).toBeGreaterThan(100);expect(html).not.toContain('NaN');}
  }
 });
});
