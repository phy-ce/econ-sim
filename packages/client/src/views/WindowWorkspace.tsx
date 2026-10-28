import {clampWindow,createWindowDrag} from '../windowDrag';
import {NavigationButtons,NavigationProvider} from '../NavigationHistory';
import {useEffect,useRef,useState} from 'react';
import type {PointerEvent,ReactNode} from 'react';
import {X} from 'lucide-react';
import {useT,useLang} from '../i18n';
export type WindowId='region'|'policies'|'map'|'overview'|'market'|'industry'|'finance'|'research'|'trends'|'construction';
export interface WindowDefinition{id:WindowId;title:string;icon:ReactNode;content:ReactNode}
type Point={x:number;y:number};
export function WindowWorkspace({windows,opened,onOpened}:{windows:WindowDefinition[];opened:WindowId[];onOpened:(ids:WindowId[])=>void;revealRequest?:number}){
 const T=useT(),ko=useLang()==='ko',area=useRef<HTMLElement>(null);
 const [bounds,setBounds]=useState({width:1920,height:998});
 const [positions,setPositions]=useState<Partial<Record<WindowId,Point>>>({});
 const drag=useRef<{id:WindowId;pointerId:number;controller:ReturnType<typeof createWindowDrag>;element:HTMLElement}|null>(null);
 const visible:WindowId[]=opened.filter(id=>id!=='map');const active=visible.at(-1),map=windows.find(w=>w.id==='map')!;
 const width=Math.min(420,bounds.width-16),height=Math.min(560,bounds.height-16);
 const clamp=(p:Point)=>clampWindow(p,bounds.width,bounds.height,width,height);
 const clampRef=useRef(clamp);clampRef.current=clamp;
 const position=(id:WindowId,index:number)=>clamp(positions[id]??{x:24+index*76,y:16+index*36});
 useEffect(()=>{const observer=new ResizeObserver(([e])=>setBounds({width:e.contentRect.width,height:e.contentRect.height}));if(area.current)observer.observe(area.current);return()=>observer.disconnect();},[]);
 const focus=(id:WindowId)=>{if(active!==id)onOpened([...visible.filter(w=>w!==id),id]);};
 const close=(id:WindowId)=>onOpened(visible.filter(w=>w!==id));
 const finish=()=>{const d=drag.current;if(!d)return;drag.current=null;d.controller.finish();d.element.style.willChange='';};
 useEffect(()=>()=>{const d=drag.current;d?.controller.dispose();if(d)d.element.style.willChange='';drag.current=null;},[]);
 useEffect(()=>{if(drag.current&&!opened.includes(drag.current.id))finish();},[opened]);
 const begin=(e:PointerEvent<HTMLElement>,id:WindowId,p:Point)=>{
  if(e.button!==0||drag.current||(e.target as HTMLElement).closest('button'))return;
  e.preventDefault();focus(id);const element=e.currentTarget.parentElement!;element.style.willChange='transform';
  const controller=createWindowDrag({origin:p,start:{x:e.clientX,y:e.clientY},clamp:p=>clampRef.current(p),paint:p=>{element.style.transform=`translate(${p.x}px, ${p.y}px)`;},commit:p=>setPositions(old=>({...old,[id]:p}))});
  drag.current={id,pointerId:e.pointerId,controller,element};e.currentTarget.setPointerCapture(e.pointerId);
 };
 const move=(e:PointerEvent<HTMLElement>)=>{const d=drag.current;if(d?.pointerId===e.pointerId)d.controller.move({x:e.clientX,y:e.clientY});};
 const end=(e:PointerEvent<HTMLElement>)=>{if(drag.current?.pointerId!==e.pointerId)return;if(e.type==='pointerup')move(e);finish();};
 return <><main ref={area} className="strategy-workspace floating-workspace"><div className="world-map" aria-label={map.title}>{map.content}</div>{windows.filter(w=>w.id!=='map').map((win,index)=>{const p=position(win.id,index);return <NavigationProvider key={win.id}><section hidden={!visible.includes(win.id)} className={`strategy-panel window-${win.id}${active===win.id?' is-front':''}`} aria-label={win.title} style={{left:0,top:0,transform:`translate(${p.x}px, ${p.y}px)`,width,height,zIndex:5+Math.max(0,visible.indexOf(win.id))}} onPointerDownCapture={()=>focus(win.id)}>
 <header className="window-titlebar" tabIndex={0} aria-label={`${win.title} · ${T.windowMove}`} data-help={ko?'제목을 드래그하여 이동 · 방향키로 미세 이동':'Drag title to move · arrow keys to nudge'} onPointerDown={e=>begin(e,win.id,p)} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onKeyDown={e=>{if(drag.current||e.target!==e.currentTarget||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();setPositions(old=>({...old,[win.id]:clamp({x:p.x+(e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0),y:p.y+(e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0)})}));}}><span className="panel-title">{win.icon}<strong>{win.title}</strong></span><NavigationButtons ko={ko}/><button className="panel-close" aria-label={`${win.title} ${T.windowClose}`} onClick={()=>close(win.id)}><X size={15}/></button></header><div className="window-body">{win.content}</div></section></NavigationProvider>;})}</main><nav className="desktop-dock" aria-label={T.windowDock}>{windows.filter(w=>w.id!=='map').map(win=><button key={win.id} aria-pressed={visible.includes(win.id)} onClick={()=>visible.includes(win.id)?close(win.id):onOpened([...visible,win.id])}>{win.icon}<span>{win.title}</span></button>)}</nav></>;
}
