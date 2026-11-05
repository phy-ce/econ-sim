import {describe,it,expect} from 'vitest';
import {wageDirection} from '../src/wageDirection';
describe('regional wage movement',()=>{
 it('uses a neutral half-percent deadband in both directions',()=>{
  expect(wageDirection(100,100.6)).toBe('up');expect(wageDirection(100,99.4)).toBe('down');
  expect(wageDirection(100,100.4)).toBeNull();expect(wageDirection(100,99.6)).toBeNull();expect(wageDirection(100,100)).toBeNull();
 });
});
