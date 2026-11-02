import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {WageDrillJob} from '@econ/sim';
import {BudgetJobs} from '../src/views/BudgetJobs';
import {setLang} from '../src/i18n';

describe('government wage calculation labels',()=>{
 const base:WageDrillJob={skill:'expert',employed:10,jobs:20,baseWage:40,wageIndex:3,stepMult:1.2,perHead:18,weekly:-1260};
 it('shows the regional market wage and AI premium instead of a global index',()=>{
  setLang('en');const html=renderToStaticMarkup(<BudgetJobs rows={[{...base,marketWage:12,premium:.25}]}/>);
  expect(html).toContain('Market wage 12 × (1 + Premium 0.25) × Stage 1.2');
  expect(html).not.toContain('Wage index');
  expect(html).toContain('ƒ18.00');
 });
 it('retains the legacy calculation when regional wages are absent',()=>{
  setLang('ko');const html=renderToStaticMarkup(<BudgetJobs rows={[base]}/>);
  expect(html).toContain('임금 지수: 3');expect(html).toContain('40 × 3 × 1.2');
 });
});
