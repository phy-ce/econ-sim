import {createContext,useContext,useMemo,useCallback,useRef,useState,useEffect,type ReactNode,type Dispatch,type SetStateAction} from 'react';
type Snapshot=Record<string,unknown>;
type Registry={values:Snapshot;setters:Map<string,(value:unknown)=>void>;past:Snapshot[];future:Snapshot[];pending:Snapshot|null;timer:ReturnType<typeof setTimeout>|null;restoring:boolean};
type API={register:(key:string,value:unknown,set:(value:unknown)=>void)=>()=>void;read:(key:string,fallback:unknown)=>unknown;change:(key:string,value:unknown)=>void;back:()=>void;forward:()=>void;canBack:boolean;canForward:boolean};
const Context=createContext<API|null>(null);
export function NavigationProvider({children}:{children:ReactNode}){
 const state=useRef<Registry>({values:{},setters:new Map(),past:[],future:[],pending:null,timer:null,restoring:false});
 const [revision,render]=useState(0);
 const flush=()=>{const s=state.current;if(s.pending){if(JSON.stringify(s.pending)!==JSON.stringify(s.values)){s.past.push(s.pending);if(s.past.length>100)s.past.shift();s.future=[];}s.pending=null;}s.timer=null;render(n=>n+1);};
 const travel=(back:boolean)=>{const s=state.current;if(s.pending)flush();const source=back?s.past:s.future,target=source.pop();if(!target)return;(back?s.future:s.past).push({...s.values});s.restoring=true;s.values={...target};for(const [key,set] of s.setters)if(key in target)set(target[key]);render(n=>n+1);setTimeout(()=>{s.restoring=false;},0);};
 const api=useMemo<API>(()=>({
  read:(key,fallback)=>key in state.current.values?state.current.values[key]:fallback,
  register:(key,value,set)=>{const s=state.current;if(!(key in s.values))s.values[key]=value;s.setters.set(key,set);return()=>{if(s.setters.get(key)===set)s.setters.delete(key);};},
  change:(key,value)=>{const s=state.current;if(s.restoring||JSON.stringify(s.values[key])===JSON.stringify(value))return;if(!s.pending)s.pending={...s.values};s.values[key]=value;s.setters.get(key)?.(value);if(s.timer)clearTimeout(s.timer);s.timer=setTimeout(flush,50);},
  back:()=>travel(true),forward:()=>travel(false),canBack:state.current.past.length>0,canForward:state.current.future.length>0,
 }),[revision]);
 return <Context.Provider value={api}>{children}</Context.Provider>;
}
export function useNavigationState<T>(key:string,initial:T|(()=>T)):[T,Dispatch<SetStateAction<T>>]{
 const api=useContext(Context);if(!api)throw new Error('NavigationProvider missing');
 const [value,setValue]=useState<T>(()=>api.read(key,typeof initial==='function'?(initial as ()=>T)():initial) as T);
 const current=useRef(value);current.current=value;
 useEffect(()=>api.register(key,value,next=>{current.current=next as T;setValue(next as T);}),[key]);
 const apiRef=useRef(api);apiRef.current=api;
 const set:Dispatch<SetStateAction<T>>=useCallback(next=>apiRef.current.change(key,typeof next==='function'?(next as (old:T)=>T)(current.current):next),[key]);
 return [value,set];
}
export function NavigationButtons({ko}:{ko:boolean}){const api=useContext(Context);if(!api)return null;return <span className="window-navigation"><button aria-label={ko?'뒤로':'Back'} title={ko?'이전 화면':'Previous screen'} disabled={!api.canBack} onClick={e=>{e.stopPropagation();api.back();}}>←</button><button aria-label={ko?'앞으로':'Forward'} title={ko?'다음 화면':'Next screen'} disabled={!api.canForward} onClick={e=>{e.stopPropagation();api.forward();}}>→</button></span>;}
