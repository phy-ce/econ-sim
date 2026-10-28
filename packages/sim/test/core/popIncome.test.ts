import {describe,it,expect} from 'vitest';
import {createWorld,step} from '../../src/index';
import {recordPopIncome} from '../../src/popIncome';
describe('pop income receipts',()=>{
 it('reconciles each day including weekly distributions and survives reload',()=>{
  const w=createWorld(42);let sawWages=false,sawDividend=false,sawRent=false;
  for(let day=0;day<28;day++){
   step(w);
   for(const p of w.pops){const l=p.incomeBreakdown??{};
    const net=Object.entries(l).reduce((s,[key,value])=>s+(key==='tax'?-value:value),0);
    expect(net).toBeCloseTo(p.lastIncome,6);
    sawWages ||= (l.wages??0)>0;sawDividend ||= (l.dividends??0)>0;sawRent ||= (l.rent??0)>0;
   }
  }
  expect(sawWages).toBe(true);expect(sawDividend).toBe(true);expect(sawRent).toBe(true);
  const copy=JSON.parse(JSON.stringify(w));step(w);step(copy);expect(copy).toEqual(w);
 });
 it('recording does not transfer money and reset drops old receipts',()=>{
  const w=createWorld(42),p=w.pops[0],cash=p.savings,income=p.lastIncome;
  recordPopIncome(p,'other',999999999);expect(p.savings).toBe(cash);expect(p.lastIncome).toBe(income);
  step(w);expect(p.incomeBreakdown?.other??0).toBeLessThan(999999999);
 });
});
