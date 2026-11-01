import {lazy,Suspense} from 'react';
const enabled=import.meta.env.DEV&&typeof location!=='undefined'&&new URLSearchParams(location.search).get('trace')==='1';
const module=enabled?import('./trace.dev'):null;
export function trace(kind:string,data:Record<string,unknown>={}){if(import.meta.env.DEV)void module?.then(m=>m.record(kind,data));}
export function traceTick(tick:number){if(import.meta.env.DEV)void module?.then(m=>m.setTick(tick));}
const Tools=import.meta.env.DEV?lazy(()=>import('./trace.dev').then(m=>({default:m.TraceExport}))):null;
export function TraceTools(){return enabled&&Tools?<Suspense fallback={null}><Tools/></Suspense>:null;}
