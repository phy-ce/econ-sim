import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function HelpText({text,children}:{text:string;children:ReactNode}) {
  return <span className="help-text" tabIndex={0} data-help={text}>{children}</span>;
}

/** One viewport-level tooltip: scroll containers never clip explanations. */
export function TooltipLayer() {
  const [anchor,setAnchor]=useState<HTMLElement|null>(null);
  const [position,setPosition]=useState({left:8,top:8});
  const tip=useRef<HTMLDivElement>(null);
  const current=useRef<HTMLElement|null>(null);
  const timer=useRef<ReturnType<typeof setTimeout>>();
  useEffect(()=>{
    const clear=()=>{clearTimeout(timer.current);};
    const hide=()=>{clear();current.current=null;setAnchor(null);};
    const enter=(event:Event)=>{
      const target=event.target instanceof Element?event.target:null;
      if(target?.closest('#game-help-tooltip')){clear();return;}
      const next=target?.closest<HTMLElement>('[data-help]')??null;
      if(!next||!next.dataset.help)return;
      clear();if(next===current.current){if(event.type==='focusin')setAnchor(next);else timer.current=setTimeout(()=>setAnchor(next),280);return;}
      current.current=next;setAnchor(null);
      if(event.type==='focusin')setAnchor(next);
      else timer.current=setTimeout(()=>setAnchor(next),280);
    };
    const leave=(event:Event)=>{
      const related=(event as FocusEvent).relatedTarget;
      if(related instanceof Node&&(current.current?.contains(related)||tip.current?.contains(related)))return;
      clear();timer.current=setTimeout(hide,140);
    };
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'&&current.current){hide();event.preventDefault();event.stopPropagation();}};
    document.addEventListener('pointerover',enter);
    document.addEventListener('pointerout',leave);
    document.addEventListener('focusin',enter);
    document.addEventListener('focusout',leave);
    document.addEventListener('keydown',key,true);
    document.addEventListener('pointerdown',hide);
    window.addEventListener('scroll',hide,true);
    window.addEventListener('resize',hide);
    return()=>{clear();document.removeEventListener('pointerover',enter);document.removeEventListener('pointerout',leave);document.removeEventListener('focusin',enter);document.removeEventListener('focusout',leave);document.removeEventListener('keydown',key,true);document.removeEventListener('pointerdown',hide);window.removeEventListener('scroll',hide,true);window.removeEventListener('resize',hide);};
  },[]);
  useLayoutEffect(()=>{
    if(!anchor||!tip.current)return;
    const rect=anchor.getBoundingClientRect(),box=tip.current.getBoundingClientRect();
    const left=Math.max(8,Math.min(rect.left,window.innerWidth-box.width-8));
    const top=rect.bottom+box.height+10<=window.innerHeight?rect.bottom+8:Math.max(8,rect.top-box.height-8);
    setPosition({left,top});
    const old=anchor.getAttribute('aria-describedby');
    anchor.setAttribute('aria-describedby',[old,'game-help-tooltip'].filter(Boolean).join(' '));
    return()=>{if(old)anchor.setAttribute('aria-describedby',old);else anchor.removeAttribute('aria-describedby');};
  },[anchor]);
  return anchor?createPortal(<div id="game-help-tooltip" ref={tip} role="tooltip" className="game-tooltip" style={position}>{anchor.dataset.help}</div>,document.body):null;
}
