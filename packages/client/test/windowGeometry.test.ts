import { describe, expect, it } from 'vitest';
import { slotRect,placeWindows } from '../src/windowGeometry';
const bounds={width:1920,height:998};
describe('fixed desktop slots',()=>{
 it('leaves the full central map visible at 1920×1080',()=>{
  const left=slotRect('left',bounds),right=slotRect('right',bounds);
  expect(left).toEqual({x:8,y:8,width:440,height:982});
  expect(right).toEqual({x:1472,y:8,width:440,height:982});
  expect(left.x+left.width).toBeLessThan(530);expect(right.x).toBeGreaterThan(1390);
 });
 const defaults={region:'left',market:'right',research:'left',finance:'right'} as const;
 it('uses the free side before replacing another window',()=>{
  expect(placeWindows(['region','research'],{},defaults)).toEqual({opened:['region','research'],sides:{region:'left',research:'right'}});
 });
 it('replaces only the preferred slot when both are occupied',()=>{
  const result=placeWindows(['region','market','finance'],{},defaults);
  expect(result.opened).toEqual(['region','finance']);
 });
 it('remembers a moved window side when reopened',()=>{
  expect(placeWindows(['region'],{region:'right'},defaults).sides.region).toBe('right');
 });
 it('never has more than two visible windows or duplicate slots',()=>{
  const result=placeWindows(['region','market','research','finance'],{},defaults);
  expect(result.opened).toHaveLength(2);
  expect(new Set(result.opened.map(id=>result.sides[id])).size).toBe(2);
 });
});
