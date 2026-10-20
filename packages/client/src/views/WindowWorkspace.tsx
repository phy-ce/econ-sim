import { useEffect, useRef, useState } from 'react';
import type { PointerEvent, ReactNode } from 'react';
import { X, Minus, Square, Copy } from 'lucide-react';
import { useT } from '../i18n';
import { fitWindow, resizeWindow } from '../windowGeometry';
import type { WindowRect } from '../windowGeometry';
export type WindowId = 'map' | 'overview' | 'market' | 'industry' | 'finance' | 'research' | 'trends' | 'construction';
export interface WindowDefinition { id:WindowId; title:string; icon:ReactNode; content:ReactNode }
export function WindowWorkspace({windows,opened,onOpened,revealRequest}:{windows:WindowDefinition[];opened:WindowId[];onOpened:(ids:WindowId[])=>void;revealRequest?:number}) {
 const T=useT(),area=useRef<HTMLElement>(null);
 const [bounds,setBounds]=useState({width:1920,height:998});
 const [rects,setRects]=useState<Partial<Record<WindowId,WindowRect>>>({});
 const [minimized,setMinimized]=useState<Partial<Record<WindowId,boolean>>>({});
 const [maximized,setMaximized]=useState<Partial<Record<WindowId,boolean>>>({});
 const drag=useRef<{id:WindowId;edge:string;px:number;py:number;wasMax:boolean;rect:WindowRect}|null>(null);
 const visible=opened.filter(id=>id!=='map'&&!minimized[id]);
 const active=visible.at(-1);
 const map=windows.find(w=>w.id==='map')!;
 const base=(id:WindowId):WindowRect=>({x:12+Math.max(0,windows.findIndex(w=>w.id===id)-1)*32,y:12+Math.max(0,windows.findIndex(w=>w.id===id)-1)*28,width:id==='trends'?600:id==='finance'?520:460,height:560});
 const rect=(id:WindowId)=>fitWindow(rects[id]??base(id),bounds);
 const focus=(id:WindowId)=>{setMinimized(m=>({...m,[id]:false}));if(opened.at(-1)!==id)onOpened([...opened.filter(w=>w!==id),id]);};
 const close=(id:WindowId)=>{onOpened(opened.filter(w=>w!==id));setMinimized(m=>({...m,[id]:false}));};
 const toggleMax=(id:WindowId)=>{focus(id);setMaximized(m=>({...m,[id]:!m[id]}));};
 useEffect(()=>{const observer=new ResizeObserver(([entry])=>setBounds({width:entry.contentRect.width,height:entry.contentRect.height}));if(area.current)observer.observe(area.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{const id=opened.at(-1);if(id&&id!=='map')setMinimized(m=>({...m,[id]:false}));},[revealRequest]);
 useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!e.defaultPrevented&&active&&!document.querySelector('.popover-panel'))close(active);};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[active,opened]);
 const begin=(e:PointerEvent<HTMLElement>,id:WindowId,edge:string)=>{
  if(e.button!==0||(e.target as HTMLElement).closest('button'))return;
  e.preventDefault();focus(id);
  if(maximized[id]&&edge!=='move')return;
  drag.current={id,edge,px:e.clientX,py:e.clientY,wasMax:!!maximized[id],rect:rect(id)};e.currentTarget.setPointerCapture(e.pointerId);
 };
 const move=(e:PointerEvent<HTMLElement>)=>{
  const d=drag.current;if(!d)return;
  if(d.wasMax){
   if(Math.hypot(e.clientX-d.px,e.clientY-d.py)<4)return;
   const areaRect=area.current!.getBoundingClientRect();
   d.rect=fitWindow({...d.rect,x:e.clientX-areaRect.left-d.rect.width/2,y:e.clientY-areaRect.top-15},bounds);
   d.px=e.clientX;d.py=e.clientY;d.wasMax=false;setMaximized(m=>({...m,[d.id]:false}));
  }
  const dx=e.clientX-d.px,dy=e.clientY-d.py;
  const next=d.edge==='move'?fitWindow({...d.rect,x:d.rect.x+dx,y:d.rect.y+dy},bounds):resizeWindow(d.rect,d.edge,dx,dy,bounds,d.id==='trends'?560:d.id==='finance'?480:400);
  setRects(r=>({...r,[d.id]:next}));
 };
 const end=()=>{drag.current=null;};
 return <><main ref={area} className="strategy-workspace floating-workspace">
  <div className="world-map" aria-label={map.title}>{map.content}</div>
  {windows.filter(w=>w.id!=='map').map(win=>{
   const r=maximized[win.id]?{x:0,y:0,width:bounds.width,height:bounds.height}:rect(win.id);
   return <section key={win.id} hidden={!visible.includes(win.id)} className={`strategy-panel window-${win.id}${active===win.id?' is-front':''}${maximized[win.id]?' is-maximized':''}`} aria-label={win.title} style={{left:r.x,top:r.y,width:r.width,height:r.height,zIndex:5+Math.max(0,opened.indexOf(win.id))}} onPointerDownCapture={()=>focus(win.id)} onFocusCapture={()=>focus(win.id)}>
    <header className="window-titlebar" tabIndex={0} aria-label={`${win.title} · ${T.windowMove}`} data-help={T.windowDragHelp} onPointerDown={e=>begin(e,win.id,'move')} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onDoubleClick={e=>{if(!(e.target as HTMLElement).closest('button'))toggleMax(win.id);}} onKeyDown={e=>{
      if(e.target!==e.currentTarget)return;
      if(e.key==='Enter'){e.preventDefault();toggleMax(win.id);return;}
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)||maximized[win.id])return;
      e.preventDefault();const dx=e.key==='ArrowLeft'?-16:e.key==='ArrowRight'?16:0,dy=e.key==='ArrowUp'?-16:e.key==='ArrowDown'?16:0;
      setRects(all=>({...all,[win.id]:e.shiftKey?resizeWindow(rect(win.id),'se',dx,dy,bounds,win.id==='trends'?560:win.id==='finance'?480:400):fitWindow({...rect(win.id),x:r.x+dx,y:r.y+dy},bounds)}));
    }}>
     <span className="panel-title">{win.icon}<strong>{win.title}</strong></span>
     <button className="window-action" aria-label={`${win.title} ${T.windowMinimize}`} data-help={T.windowMinimizeHelp} onClick={()=>setMinimized(m=>({...m,[win.id]:true}))}><Minus size={14}/></button>
     <button className="window-action" aria-label={`${win.title} ${maximized[win.id]?T.windowRestore:T.windowMaximize}`} data-help={maximized[win.id]?T.windowRestore:T.windowMaximize} onClick={()=>toggleMax(win.id)}>{maximized[win.id]?<Copy size={12}/>:<Square size={12}/>}</button>
     <button className="panel-close" aria-label={`${win.title} ${T.windowClose}`} data-help={T.windowClose} onClick={()=>close(win.id)}><X size={15}/></button>
    </header>
    <div className="window-body">{win.content}</div>
    {!maximized[win.id]&&['n','ne','e','se','s','sw','w','nw'].map(edge=><div key={edge} aria-hidden="true" className={`window-edge edge-${edge}`} onPointerDown={e=>begin(e,win.id,edge)} onPointerMove={move} onPointerUp={end} onPointerCancel={end}/>)}
   </section>;
  })}
 </main><nav className="desktop-dock" aria-label={T.windowDock}>{windows.map(win=><button key={win.id} className={opened.includes(win.id)&&win.id!=='map'?'is-open':''} aria-pressed={win.id==='map'?!active:active===win.id} data-help={win.id==='map'?T.windowDesktopHelp:T.windowTaskHelp} onClick={()=>{
  if(win.id==='map'){const hide=visible.length>0;setMinimized(Object.fromEntries(opened.filter(id=>id!=='map').map(id=>[id,hide])));}
  else if(active===win.id)setMinimized(m=>({...m,[win.id]:true}));else focus(win.id);
 }}>{win.icon}<span>{win.title}</span><i/></button>)}<span className="dock-hint">{T.windowDockHint}</span></nav></>;
}
