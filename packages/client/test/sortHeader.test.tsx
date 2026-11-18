import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {SortHeader} from '../src/views/SortHeader';
describe('sort header state geometry',()=>{
 it('keeps the direction slot present in inactive and both active states',()=>{
  for(const [active,direction,aria] of [[false,1,'none'],[true,1,'ascending'],[true,-1,'descending']] as const){
   const html=renderToStaticMarkup(<table><thead><tr><SortHeader label="Trade value" active={active} direction={direction} onClick={()=>{}}/></tr></thead></table>);
   expect(html).toContain(`aria-sort="${aria}"`);expect(html).toContain('class="sort-indicator"');
   expect(html).toContain(`visibility:${active?'visible':'hidden'}`);
   expect(html).toContain('class="sort-label">Trade value');
  }
 });
});
