import {afterEach,describe,it,expect,vi} from 'vitest';
import {withViewTransition} from '../src/ui/viewTransition';
afterEach(()=>vi.unstubAllGlobals());
const mockDocument=(start?:unknown)=>({startViewTransition:start,querySelectorAll:()=>[],documentElement:{classList:{add:vi.fn(),remove:vi.fn()}}});
describe('explicit UI transitions',()=>{
 it('updates immediately without a DOM or API',()=>{const update=vi.fn();vi.stubGlobal('document',undefined);withViewTransition(update,'.test');vi.stubGlobal('document',mockDocument());withViewTransition(update,'.test');expect(update).toHaveBeenCalledTimes(2);});
 it('honours reduced motion without starting a transition',()=>{const start=vi.fn(),update=vi.fn();vi.stubGlobal('document',mockDocument(start));vi.stubGlobal('matchMedia',()=>({matches:true}));withViewTransition(update,'.test');expect(update).toHaveBeenCalledOnce();expect(start).not.toHaveBeenCalled();});
 it('commits inside the browser callback and preserves rapid action order',async()=>{
  let callback!:()=>void,finish!:()=>void;const skip=vi.fn(),order:number[]=[];
  const finished=new Promise<void>(resolve=>{finish=resolve;});
  vi.stubGlobal('document',mockDocument((cb:()=>void)=>{callback=cb;return {ready:Promise.resolve(),finished,skipTransition:skip};}));
  withViewTransition(()=>order.push(1),'.test');expect(order).toEqual([]);
  withViewTransition(()=>order.push(2),'.test');callback();finish();await finished;expect(order).toEqual([1,2]);expect(skip).toHaveBeenCalledOnce();
 });
 it('falls back if the API throws before invoking the callback',()=>{const update=vi.fn();vi.stubGlobal('document',mockDocument(()=>{throw Error('unsupported');}));withViewTransition(update,'.test');expect(update).toHaveBeenCalledOnce();});
});
