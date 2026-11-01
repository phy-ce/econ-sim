import {afterEach,describe,expect,it,vi} from 'vitest';
afterEach(()=>{vi.unstubAllGlobals();vi.resetModules();});
describe('first language choice',()=>{
 it('persists Korean even when Korean was already the default',async()=>{
  const values=new Map<string,string>();vi.stubGlobal('localStorage',{getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v)});
  const lang=await import('../src/lang');expect(lang.hasStoredLang()).toBe(false);lang.chooseLang('ko');expect(values.get('estera-lang')).toBe('ko');expect(lang.hasStoredLang()).toBe(true);
 });
 it('accepts a session choice when storage is unavailable',async()=>{
  vi.stubGlobal('localStorage',{getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}});
  const lang=await import('../src/lang');expect(lang.hasStoredLang()).toBe(false);lang.chooseLang('en');expect(lang.getLang()).toBe('en');expect(lang.hasStoredLang()).toBe(false);
 });
});
