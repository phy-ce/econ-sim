import {describe,it,expect} from 'vitest';
import {marginText} from '../src/format';
describe('profit margin presentation',()=>{
 it('caps tiny-revenue losses before rounding',()=>{
  expect(marginText(-1_000_000/.0001)).toBe('< −100%');
  expect(marginText(-1.000001)).toBe('< −100%');
  expect(marginText(-1)).toBe('−100%');
  expect(marginText(-.9999)).toBe('−100%');
 });
 it('preserves normal formats and missing values',()=>{
  expect(marginText(null)).toBe('—');expect(marginText(undefined)).toBe('—');
  expect(marginText(NaN)).toBe('—');expect(marginText(-Infinity)).toBe('< −100%');
  expect(marginText(.2,{signed:true})).toBe('+20%');
  expect(marginText(.123456,{decimals:2})).toBe('12.35%');
  expect(marginText(0)).toBe('0%');
 });
 it('keeps tooltips bounded for extreme losses',()=>{
  expect(marginText(-1e10,{detail:true})).toBe('−1T%');
  expect(marginText(-1e100,{detail:true}).length).toBeLessThan(20);
 });
});
