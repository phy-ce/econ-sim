import {describe,it,expect} from 'vitest';
import {MAP_FRAME,zoomMapCamera} from '../src/mapCamera';
const fraction=(camera:{x:number;y:number;zoom:number},point:{x:number;y:number})=>({x:(point.x-MAP_FRAME.x-camera.x)*camera.zoom/MAP_FRAME.width,y:(point.y-MAP_FRAME.y-camera.y)*camera.zoom/MAP_FRAME.height});
describe('map zoom anchor',()=>{
 it('keeps the off-centre map point under the cursor through wheel zoom',()=>{
  const camera={x:0,y:0,zoom:1},point={x:300,y:250},before=fraction(camera,point),after=fraction(zoomMapCamera(camera,1,point),point);
  expect(after.x).toBeCloseTo(before.x);expect(after.y).toBeCloseTo(before.y);
 });
 it('keeps button zoom centred and respects zoom limits',()=>{
  const camera={x:0,y:0,zoom:1},centre={x:MAP_FRAME.x+MAP_FRAME.width/2,y:MAP_FRAME.y+MAP_FRAME.height/2};
  const after=fraction(zoomMapCamera(camera,1),centre);expect(after.x).toBeCloseTo(.5);expect(after.y).toBeCloseTo(.5);
  expect(zoomMapCamera(camera,-1)).toBe(camera);expect(zoomMapCamera(camera,10).zoom).toBe(3);
 });
});
