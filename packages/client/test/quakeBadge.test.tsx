import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,TUNE,quakeAt,quakeLabel} from '@econ/sim';
import {QuakeBadge} from '../src/views/QuakeBadge';
import {setLang} from '../src/i18n';
describe('tenant disaster chip',()=>{
 it('matches the active simulation disaster in both languages and hides when disabled',()=>{
  const previous=TUNE.quakeChance;try{
   const w=createWorld(42);w.tick=719;TUNE.quakeChance=1;const r=w.regions[0],q=quakeAt(w,r.id)!;expect(q).toBeTruthy();
   for(const lang of ['ko','en'] as const){setLang(lang);const html=renderToStaticMarkup(<QuakeBadge world={w} regionId={r.id}/>);expect(html).toContain(quakeLabel(w,r.id,lang==='en'));expect(html).toContain(String(q.end-w.tick));}
   TUNE.quakeChance=0;expect(renderToStaticMarkup(<QuakeBadge world={w} regionId={r.id}/>)).toBe('');
  }finally{TUNE.quakeChance=previous;}
 });
});
