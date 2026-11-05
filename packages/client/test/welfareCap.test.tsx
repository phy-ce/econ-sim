import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,TUNE,welfareCapDaily} from '@econ/sim';
import {WelfareCap} from '../src/views/WelfareCap';
import {setLang} from '../src/i18n';
describe('weekly welfare cap',()=>{
 it('scales with the selected step and hides an unlimited cap',()=>{
  setLang('en');const k=createWorld(42).kingdoms[0];k.lastBudget={...k.lastBudget!,revenue:10000};
  expect(welfareCapDaily(k,5)).toBeCloseTo(welfareCapDaily(k,1)*5);
  const html=renderToStaticMarkup(<WelfareCap kingdom={k} step={1} projectedStep={5}/>);
  expect(html).toContain('Cap');expect(html).toContain('→');
  const previous=TUNE.welfareCap;try{TUNE.welfareCap=0;expect(renderToStaticMarkup(<WelfareCap kingdom={k}/>)).toBe('');}finally{TUNE.welfareCap=previous;}
 });
});
