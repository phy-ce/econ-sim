import {Button as UIButton} from './ui/controls';
import {useEffect,useState} from 'react';
import {useT} from './i18n';
const key='estera-trace-v1',startedAt=new Date().toISOString(),start=performance.now();
type Event={t:number;tick:number;kind:string;[key:string]:unknown};
let events:Event[]=[],tick=0;
export function setTick(value:number){tick=value;}
export function record(kind:string,data:Record<string,unknown>={}){
 events.push({...data,t:Math.round(performance.now()-start),tick,kind});
 if(events.length>20000)events.splice(0,events.length-20000);
 try{localStorage.setItem(key,JSON.stringify({version:1,startedAt,events}));}catch{/* optional local persistence */}
}
record('session',{startedAt,lang:document.documentElement.lang,theme:document.documentElement.dataset.theme,width:innerWidth,height:innerHeight,devicePixelRatio});
document.addEventListener('pointerdown',event=>{
 const el=event.target instanceof Element?event.target.closest('button,a,input,select,[data-help]'):null;if(!el)return;
 const panel=el.closest('section.strategy-panel');
 record('click',{window:panel?.getAttribute('aria-label')??panel?.className??null,label:(el.getAttribute('aria-label')??el.getAttribute('data-help')?.split('\n')[0]??el.textContent??'').trim().slice(0,40)});
},true);
export function TraceExport(){const T=useT(),[count,setCount]=useState(events.length);useEffect(()=>{const timer=setInterval(()=>setCount(events.length),1000);return()=>clearInterval(timer);},[]);
 return <UIButton onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify({version:1,startedAt,events},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`estera-trace-${new Date().toISOString().replace(/[-:]/g,'').slice(0,13)}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>{T.exportTrace} · {count}</UIButton>;
}
