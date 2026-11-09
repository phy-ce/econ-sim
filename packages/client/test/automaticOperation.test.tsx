import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {GameUIProvider,OperationBreakdown} from '../src/foundations/game-ui';

describe('automatic operation controls',()=>{
 it.each(['ko','en'] as const)('retains stop and resume without a utilization slider (%s)',lang=>{
  for(const stopped of [false,true]){
   const html=renderToStaticMarkup(<GameUIProvider value={lang}><OperationBreakdown utilization={.65} stopped={stopped} onStop={()=>{}}/></GameUIProvider>);
   expect(html).toContain('65');expect(html).not.toContain('type="range"');
   expect(html).toContain(`aria-pressed="${stopped}"`);
   expect(html).toContain('<button');
  }
  expect(renderToStaticMarkup(<OperationBreakdown/>)).not.toContain('<button');
 });
});
