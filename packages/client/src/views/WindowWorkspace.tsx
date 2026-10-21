import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { X } from 'lucide-react';
import { useT, useLang } from '../i18n';
import { slotRect, placeWindows } from '../windowGeometry';
import type { WindowSide } from '../windowGeometry';
export type WindowId = 'map' | 'overview' | 'market' | 'industry' | 'finance' | 'research' | 'trends' | 'construction';
export interface WindowDefinition { id:WindowId; title:string; icon:ReactNode; content:ReactNode }
const DEFAULT_SIDE:Record<WindowId,WindowSide>={map:'left',overview:'left',industry:'left',research:'left',construction:'left',market:'right',finance:'right',trends:'right'};
export function WindowWorkspace({windows,opened,onOpened,revealRequest}:{windows:WindowDefinition[];opened:WindowId[];onOpened:(ids:WindowId[])=>void;revealRequest?:number}) {
 const T=useT(),ko=useLang()==='ko',area=useRef<HTMLElement>(null);
 const [bounds,setBounds]=useState({width:1920,height:998});
 const [sides,setSides]=useState<Partial<Record<WindowId,WindowSide>>>(()=>{
  try {const saved=JSON.parse(localStorage.getItem('estera.windowSides')??'{}');return Object.fromEntries(Object.entries(saved).filter(([id,value])=>id in DEFAULT_SIDE&&(value==='left'||value==='right')));}catch{return {};}
 });
 const drag=useRef<{id:WindowId;x:number}|null>(null);
 const placement=placeWindows<WindowId>(opened.filter(id=>id!=='map'),sides,DEFAULT_SIDE);
 const visible=placement.opened,active=visible.at(-1);
 const map=windows.find(w=>w.id==='map')!;
 useLayoutEffect(()=>{
  if(JSON.stringify(placement.sides)!==JSON.stringify(sides))setSides(placement.sides);
  if(opened.join()!==visible.join())onOpened(visible);
 },[opened,sides]);
 useEffect(()=>{try{localStorage.setItem('estera.windowSides',JSON.stringify(sides));}catch{}},[sides]);
 useEffect(()=>{const observer=new ResizeObserver(([entry])=>setBounds({width:entry.contentRect.width,height:entry.contentRect.height}));if(area.current)observer.observe(area.current);return()=>observer.disconnect();},[]);
 const focus=(id:WindowId)=>{if(active!==id)onOpened([...visible.filter(w=>w!==id),id]);};
 const close=(id:WindowId)=>onOpened(visible.filter(w=>w!==id));
 const switchSide=(id:WindowId,side:WindowSide)=>{
  const previous=placement.sides[id]??DEFAULT_SIDE[id];
  const occupant=visible.find(w=>w!==id&&placement.sides[w]===side);
  setSides({...placement.sides,[id]:side,...(occupant?{[occupant]:previous}:{})});
 };
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!e.defaultPrevented&&active&&!document.querySelector('.popover-panel'))close(active);};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[active,opened]);
 const begin=(e:PointerEvent<HTMLElement>,id:WindowId)=>{
  if(e.button!==0||(e.target as HTMLElement).closest('button'))return;
  e.preventDefault();focus(id);drag.current={id,x:e.clientX};e.currentTarget.setPointerCapture(e.pointerId);
 };
 const end=(e:PointerEvent<HTMLElement>)=>{
  const d=drag.current;drag.current=null;
  if(!d||Math.abs(e.clientX-d.x)<4)return;
  switchSide(d.id,e.clientX-(area.current?.getBoundingClientRect().left??0)<bounds.width/2?'left':'right');
 };
 return <><main ref={area} className="strategy-workspace fixed-workspace">
  <div className="world-map" aria-label={map.title}>{map.content}</div>
  {windows.filter(w=>w.id!=='map').map(win=>{
   const r=slotRect(placement.sides[win.id]??DEFAULT_SIDE[win.id],bounds);
   return <section key={win.id} hidden={!visible.includes(win.id)} className={`strategy-panel window-${win.id}${active===win.id?' is-front':''}`} aria-label={win.title} style={{left:r.x,top:r.y,width:r.width,height:r.height,zIndex:5+Math.max(0,visible.indexOf(win.id))}} onPointerDownCapture={()=>focus(win.id)} onFocusCapture={()=>focus(win.id)}>
    <header className="window-titlebar" tabIndex={0} aria-label={`${win.title} · ${T.windowMove}`} data-help={T.windowDragHelp} onPointerDown={e=>begin(e,win.id)} onPointerUp={end} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}} onKeyDown={e=>{
     if(e.target!==e.currentTarget||!['ArrowLeft','ArrowRight'].includes(e.key))return;
     e.preventDefault();switchSide(win.id,e.key==='ArrowLeft'?'left':'right');
    }}>
     <span className="panel-title">{win.icon}<strong>{win.title}</strong></span>
     <button className="panel-close" aria-label={`${win.title} ${T.windowClose}`} data-help={T.windowClose} onClick={()=>close(win.id)}><X size={15}/></button>
    </header><div className="window-body">{win.content}</div>
   </section>;
  })}
 </main><nav className="desktop-dock" aria-label={T.windowDock}>{windows.filter(w=>w.id!=='map').map(win=><button key={win.id} className={visible.includes(win.id)?'is-open':''} aria-pressed={visible.includes(win.id)} data-help={T.windowTaskHelp} onClick={()=>visible.includes(win.id)?close(win.id):onOpened([...visible,win.id])}>{win.icon}<span>{win.title}</span><i/></button>)}</nav></>;
}

