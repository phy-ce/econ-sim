import {describe,it,expect,vi} from 'vitest';
import {createWindowDrag,clampWindow} from '../src/windowDrag';
function setup(){
 const pending=new Map<number,FrameRequestCallback>();let seq=0;
 const paint=vi.fn(),commit=vi.fn();
 const request=vi.fn((f:FrameRequestCallback)=>{pending.set(++seq,f);return seq;});
 const cancel=vi.fn((id:number)=>{pending.delete(id);});
 const drag=createWindowDrag({origin:{x:24,y:16},start:{x:100,y:100},clamp:p=>clampWindow(p,800,600,420,560),paint,commit,request,cancel});
 const frame=()=>{const work=[...pending.values()];pending.clear();work.forEach(f=>f(0));};
 return {drag,paint,commit,request,pending,frame};
}
describe('window drag scheduling',()=>{
 it('coalesces 100 pointer samples into one paint without React commits',()=>{const s=setup();for(let i=0;i<100;i++)s.drag.move({x:100+i,y:110});expect(s.request).toHaveBeenCalledTimes(1);expect(s.paint).not.toHaveBeenCalled();expect(s.commit).not.toHaveBeenCalled();s.frame();expect(s.paint).toHaveBeenLastCalledWith({x:123,y:26});expect(s.paint).toHaveBeenCalledTimes(1);s.drag.finish();s.drag.finish();expect(s.commit).toHaveBeenCalledTimes(1);});
 it('flushes release coordinates before a pending frame and clamps',()=>{const s=setup();s.drag.move({x:9999,y:9999});s.drag.finish();expect(s.pending.size).toBe(0);expect(s.commit).toHaveBeenLastCalledWith({x:380,y:40});s.frame();expect(s.paint).toHaveBeenCalledTimes(1);});
 it('unmount cleanup cancels painting and commits',()=>{const s=setup();s.drag.move({x:150,y:100});s.drag.dispose();s.frame();s.drag.finish();expect(s.commit).not.toHaveBeenCalled();expect(s.paint).not.toHaveBeenCalled();});
 it('preserves negative edge clamp and 20px keyboard nudges',()=>{expect(clampWindow({x:-20,y:-20},800,600,420,560)).toEqual({x:0,y:0});expect(clampWindow({x:24+20,y:16},800,600,420,560)).toEqual({x:44,y:16});expect(clampWindow({x:900,y:800},320,200,304,184)).toEqual({x:16,y:16});});
});
