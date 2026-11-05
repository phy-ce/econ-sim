import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,wealthDrivers} from '@econ/sim';
import {wealthSummary} from '../src/wealthSummary';
import {WealthDrift} from '../src/views/WealthDrift';
import {setLang} from '../src/i18n';

describe('wealth movement summary',()=>{
 it('sums money and weights drift by population without mutating the world',()=>{
  const w=createWorld(42),p=w.pops.find(p=>p.prof==='unskilled')!;
  const rows=[{...p,size:10,incomeEma:1000,savings:100000},{...p,id:p.id+99999,size:90,incomeEma:0,savings:0}];
  const before=JSON.stringify(rows),a=wealthDrivers(w,rows[0]),b=wealthDrivers(w,rows[1]),summary=wealthSummary(w,rows);
  expect(summary.income).toBe(a.income+b.income);expect(summary.costNow).toBe(a.costNow+b.costNow);
  expect(summary.weeklyDrift).toBeCloseTo((a.drift*10+b.drift*90)/100*7);
  expect(summary.savingsWeeks).toBeCloseTo(100000/((a.costNow+b.costNow)*7));expect(JSON.stringify(rows)).toBe(before);
 });
 it('scales only money by headcount and excludes upper-class savings income',()=>{
  setLang('en');const w=createWorld(42),p={...w.pops.find(p=>p.prof==='aristocrat')!,size:10,incomeEma:123.4},data=wealthSummary(w,[p]);
  const perHead=renderToStaticMarkup(<WealthDrift data={data} perHead/>),total=renderToStaticMarkup(<WealthDrift data={data} perHead={false}/>);
  expect(perHead).toContain('ƒ12.34');expect(total).toContain('ƒ123');
  expect(perHead).toContain('From savings</th><td>—');expect(perHead).toContain(Math.abs(Math.round(data.weeklyDrift*100)/100).toFixed(2));
 });
});
