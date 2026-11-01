import {describe,it,expect} from 'vitest';
import {clampWindow} from '../src/windowDrag';
describe('free window bounds',()=>{
 it('keeps an oversized panel origin nonnegative',()=>{expect(clampWindow({x:99,y:99},200,100,420,560)).toEqual({x:0,y:0});});
 it('allows the full map width between independently positioned windows',()=>{expect(clampWindow({x:1500,y:438},1920,998,420,560)).toEqual({x:1500,y:438});});
});