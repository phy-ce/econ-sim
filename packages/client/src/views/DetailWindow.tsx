import {t as uiCopy} from '../i18n';
import {trace} from '../trace';
import {NavigationProvider,NavigationButtons} from '../NavigationHistory';
import {useRef,useState,useLayoutEffect,useEffect,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {useLang} from '../i18n';

let front=200;
/** Non-modal, movable supporting information; the source ledger stays visible. */
export function DetailWindow({title,summary,help,children,triggerContent,open:controlledOpen,onOpenChange,hideTrigger=false}:{open?:boolean;onOpenChange?:(open:boolean)=>void;hideTrigger?:boolean;title:string;summary?:ReactNode;help:string;children:ReactNode;triggerContent?:ReactNode}){
 const ko=useLang()==='ko',[localOpen,setLocalOpen]=useState(false),[position,setPosition]=useState({x:480,y:100}),[layer,setLayer]=useState(200);
 const open=controlledOpen??localOpen;
 useEffect(()=>{if(open)trace('window',{id:title,action:'open',detail:true});return()=>{if(open)trace('window',{id:title,action:'close',detail:true});};},[open,title]);
 const setOpen=(value:boolean)=>{setLocalOpen(value);onOpenChange?.(value);};
 const trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLElement>(null);
 const drag=useRef<{x:number;y:number;left:number;top:number}|null>(null);
 const fit=(x:number,y:number)=>{const bounds=document.querySelector('.strategy-workspace')?.getBoundingClientRect();const box=panel.current?.getBoundingClientRect();const left=(bounds?.left??0)+8,top=(bounds?.top??0)+8;return {x:Math.max(left,Math.min((bounds?.right??innerWidth)-(box?.width??420)-8,x)),y:Math.max(top,Math.min((bounds?.bottom??innerHeight)-(box?.height??350)-8,y))};};
 useLayoutEffect(()=>{if(!open||!panel.current)return;const node=panel.current,workspace=document.querySelector('.strategy-workspace');const update=()=>{const b=workspace?.getBoundingClientRect();node.style.maxWidth=`${Math.max(1,(b?.width??innerWidth)-16)}px`;node.style.maxHeight=`${Math.max(1,(b?.height??innerHeight)-16)}px`;setPosition(p=>{const next=fit(p.x,p.y);return next.x===p.x&&next.y===p.y?p:next;});};update();const observer=new ResizeObserver(update);observer.observe(node);if(workspace)observer.observe(workspace);window.addEventListener('resize',update);return()=>{observer.disconnect();window.removeEventListener('resize',update);};},[open]);
 const close=()=>{setOpen(false);trigger.current?.focus();};
 return <>{!hideTrigger&&<button ref={trigger} className={`detail-launch${triggerContent?' ownership-launch':''}`} aria-label={triggerContent?title:undefined} aria-haspopup="dialog" aria-expanded={open} data-help={help} onClick={()=>{const b=trigger.current!.getBoundingClientRect();setPosition(fit(b.right+14,b.top));setLayer(++front);setOpen(true);requestAnimationFrame(()=>panel.current?.focus());}}>{triggerContent??<><span>{title}</span><strong>{summary}</strong><span aria-hidden="true">↗</span></>}</button>}
 {open&&createPortal(<NavigationProvider><section ref={panel} role="dialog" aria-modal="false" aria-label={title} tabIndex={-1} className="strategy-panel detail-window" style={{left:position.x,top:position.y,zIndex:layer}} onPointerDown={()=>setLayer(++front)} onKeyDown={e=>{if(e.key==='Escape'){e.stopPropagation();close();}}}>
 <header className="window-titlebar" tabIndex={0} aria-label={`${title} · ${uiCopy().screenText['moveWindow']}`} data-help={uiCopy().screenText['dragToMoveEscapeToCloseThe']} onPointerDown={e=>{if(e.button!==0||(e.target as Element).closest('button'))return;e.preventDefault();drag.current={x:e.clientX,y:e.clientY,left:position.x,top:position.y};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{const d=drag.current;if(!d)return;const box=panel.current!.getBoundingClientRect();setPosition(fit(d.left+e.clientX-d.x,d.top+e.clientY-d.y));}} onPointerCancel={()=>{drag.current=null;}} onPointerUp={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}><strong>{title}</strong><NavigationButtons ko={ko}/><small>{uiCopy().screenText['detail']}</small><button aria-label={`${title} ${uiCopy().screenText['close']}`} onClick={close}>×</button></header>
 <div className="window-body">{children}</div></section></NavigationProvider>,document.body)}</>;
}
