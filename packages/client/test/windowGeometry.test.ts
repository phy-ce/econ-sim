import { describe, expect, it } from 'vitest';
import { fitWindow, resizeWindow } from '../src/windowGeometry';
const bounds={width:1920,height:998}; // 1920×1080 minus topbar and dock
const rect={x:110,y:90,width:460,height:560};
describe('desktop window boundaries',()=>{
 it('keeps a moved title and all edges inside the workspace',()=>{
  expect(fitWindow({...rect,x:3000,y:-100},bounds)).toEqual({...rect,x:1460,y:0});
 });
 it('shrinks oversized restored windows to a smaller workspace',()=>{
  expect(fitWindow({x:400,y:200,width:1920,height:998},{width:1280,height:720})).toEqual({x:0,y:0,width:1280,height:720});
 });
 it('preserves opposite edges and minimum size when resizing from top left',()=>{
  const next=resizeWindow(rect,'nw',2000,2000,bounds,400);
  expect(next.x+next.width).toBe(rect.x+rect.width);
  expect(next.y+next.height).toBe(rect.y+rect.height);
  expect(next.width).toBe(400);expect(next.height).toBe(280);
 });
 it('does not let any resizing edge move outside the usable desktop',()=>{
  for(const edge of ['n','ne','e','se','s','sw','w','nw']){
   for(const dx of [-4000,0,4000])for(const dy of [-4000,0,4000]){
    const next=resizeWindow(rect,edge,dx,dy,bounds,400);
    expect(next.x).toBeGreaterThanOrEqual(0);expect(next.y).toBeGreaterThanOrEqual(0);
    expect(next.x+next.width).toBeLessThanOrEqual(bounds.width);
    expect(next.y+next.height).toBeLessThanOrEqual(bounds.height);
    expect(next.width).toBeGreaterThanOrEqual(400);expect(next.height).toBeGreaterThanOrEqual(280);
   }
  }
 });
 it('resizing one window does not alter the other window geometry',()=>{
  const other={x:900,y:60,width:520,height:560};
  resizeWindow(rect,'se',300,200,bounds,400);
  expect(other).toEqual({x:900,y:60,width:520,height:560});
  expect(rect).toEqual({x:110,y:90,width:460,height:560});
 });
});
