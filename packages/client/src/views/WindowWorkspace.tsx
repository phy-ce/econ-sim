import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { useLang } from '../i18n';
export type WindowId = 'map' | 'overview' | 'market' | 'industry' | 'finance' | 'research' | 'trends' | 'construction';
export interface WindowDefinition { id:WindowId; title:string; icon:ReactNode; content:ReactNode }
export function WindowWorkspace({windows,opened,onOpened}:{windows:WindowDefinition[];opened:WindowId[];onOpened:(ids:WindowId[])=>void;revealRequest?:number}) {
 const ko=useLang()==='ko';
 const active=opened.filter(id=>id!=='map').at(-1);
 const map=windows.find(w=>w.id==='map')!;
 useEffect(()=>{const close=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!e.defaultPrevented)onOpened(['map']);};document.addEventListener('keydown',close);return()=>document.removeEventListener('keydown',close);},[onOpened]);
 return <><main className="strategy-workspace">
  <div className="world-map" aria-label={map.title}>{map.content}</div>
  {windows.filter(w=>w.id!=='map').map(win=><section key={win.id} hidden={active!==win.id} className={`strategy-panel window-${win.id}`} aria-label={win.title}>
   <header className="window-titlebar"><span className="panel-title">{win.icon}<strong>{win.title}</strong></span><button className="panel-close" aria-label={ko?`${win.title} 창 닫기`:`Close ${win.title}`} onClick={()=>onOpened(['map'])}><X size={15}/></button></header>
   <div className="window-body">{win.content}</div>
  </section>)}
 </main><nav className="desktop-dock" aria-label={ko?'창 관리':'Window dock'}>{windows.map(win=><button key={win.id} aria-pressed={win.id==='map'?!active:active===win.id} onClick={()=>onOpened(active===win.id||win.id==='map'?['map']:['map',win.id])}>{win.icon}<span>{win.title}</span><i/></button>)}<span className="dock-hint">{ko?'지도 드래그 · 휠 확대 · Esc 닫기':'Drag map · Scroll to zoom · Esc to close'}</span></nav></>;
}
