import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {DSCopyProvider,DSMeter,DSQuantity} from '../src/design-system/components';
import {ComponentCatalogue} from '../src/design-system/catalogue';
describe('design system proposal',()=>{
 it('keeps missing figures distinct from zero and limits money to two decimal places',()=>{
  const render=(value:number|null)=>renderToStaticMarkup(<DSQuantity value={value} currency decimals={8}/>);
  expect(render(null)).toContain('—');expect(render(Infinity)).toContain('—');
  expect(render(0)).toContain('ƒ0.00');expect(render(-10.125)).toContain('−ƒ10.13');
  expect(renderToStaticMarkup(<DSQuantity value={999999.123} currency compact/>)).toContain('ƒ999,999.12');
 });
 it('caps meter fill while preserving an output rate above 100 percent',()=>{
  const html=renderToStaticMarkup(<DSMeter label="Output" value={1.18}/>);
  expect(html).toContain('118.00%');expect(html).toContain('width:100%');
  expect(renderToStaticMarkup(<DSMeter label="Output" value={null}/>)).toContain('—');
 });
 it('renders the component inventory in both languages',()=>{
  for(const lang of ['ko','en'] as const){const html=renderToStaticMarkup(<DSCopyProvider value={lang}><ComponentCatalogue/></DSCopyProvider>);
   expect(html).toContain(lang==='ko'?'실제 가동':'Actual output rate');
   expect(html).toContain('aria-pressed="true"');expect(html).toContain('aria-selected="true"');
  }
 });
});
