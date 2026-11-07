import {forwardRef,type ButtonHTMLAttributes,type CSSProperties,type HTMLAttributes,type ReactNode,type TableHTMLAttributes} from 'react';
import {ArrowUpRight} from 'lucide-react';

export const ActionButton=forwardRef<HTMLButtonElement,ButtonHTMLAttributes<HTMLButtonElement>&{kind?:'primary'|'secondary'|'navigation'|'danger'|'quiet'}>(function ActionButton({kind='secondary',children,className='',...props},ref){return <button type="button" ref={ref} {...props} className={`gu-button gu-button-${kind} ${className}`}>{children}{kind==='navigation'&&<ArrowUpRight size={16}/>}</button>;});
export function FormattedValue({children,exact,help,focusable=false,className=''}:{children:ReactNode;exact:string;help?:string;focusable?:boolean;className?:string}){return <span className={`gu-figure ${className}`} data-help={help} aria-label={exact} tabIndex={focusable?0:undefined}>{children}</span>;}
export const WindowSurface=forwardRef<HTMLElement,HTMLAttributes<HTMLElement>&{detail?:boolean}>(function WindowSurface({className='',detail=false,...props},ref){return <section {...props} ref={ref} className={`gu-window-surface ${detail?'gu-window-detail':''} ${className}`}/>;});
export const WindowHeader=forwardRef<HTMLElement,HTMLAttributes<HTMLElement>>(function WindowHeader({className='',...props},ref){return <header {...props} ref={ref} className={`gu-window-header ${className}`}/>;});
export function ProgressTrack({value,color='var(--gu-action)',label,className='',style,none=false,children,as:Tag='span',...props}:{value:number;color?:string;label?:string;className?:string;style?:CSSProperties;none?:boolean;children?:ReactNode;as?:'span'|'div'}&HTMLAttributes<HTMLElement>){
 const fraction=Math.max(0,Math.min(1,Number.isFinite(value)?value:0));
 return <Tag {...props} className={`gu-progress ${className}`} style={style} role={label?'meter':undefined} aria-label={label} aria-hidden={label?undefined:true} aria-valuemin={label?0:undefined} aria-valuemax={label?100:undefined} aria-valuenow={label?Math.round(fraction*100):undefined}>{!none&&<i style={{width:`${fraction*100}%`,background:color}}/>}{children}</Tag>;
}
export type ShareSegment={id:string;weight:number;content:ReactNode;label?:string;color?:string;className?:string};
export function ShareTrack({segments,total:denominator,selected,onSelect,label,className='',fallback}:{segments:ShareSegment[];total?:number;selected?:string;onSelect?:(id:string)=>void;label?:string;className?:string;fallback?:ReactNode}){
 const total=denominator??segments.reduce((sum,segment)=>sum+Math.max(0,segment.weight),0);
 return <span className={`gu-share-track ${className}`} role={onSelect?'group':'img'} aria-label={label}>{!total&&fallback?fallback:segments.map(segment=>{const style={width:`${total?Math.max(0,segment.weight)/total*100:0}%`,background:segment.color} as CSSProperties;return onSelect?<ActionButton key={segment.id} className={`gu-share-segment ${segment.className??''}`} style={style} aria-pressed={segment.id===selected} aria-label={segment.label} onClick={()=>onSelect(segment.id)} data-help={segment.label}>{segment.content}</ActionButton>:<span key={segment.id} className={`gu-share-segment ${segment.className??''}`} style={style}>{segment.content}</span>;})}</span>;
}
export function ProductionLayout({className='',compact=false,...props}:HTMLAttributes<HTMLDivElement>&{compact?:boolean}){return <div {...props} className={`gu-production-layout ${compact?'gu-production-compact':''} ${className}`}/>;}
export function LedgerTable({className='',...props}:TableHTMLAttributes<HTMLTableElement>){return <table {...props} className={`gu-table ${className}`}/>;}

export function ProductionDiagram({inputLabel,outputLabel,period,inputs,outputs,building,footer,className='',...props}:{inputLabel:string;outputLabel:string;period:string;inputs:ReactNode;outputs:ReactNode;building:ReactNode;footer?:ReactNode}&HTMLAttributes<HTMLElement>){
 return <section {...props} className={`gu-production-diagram ${className}`}>
  <header><span>{inputLabel}</span><small className="gu-production-period" aria-label={period}>{period.includes('일')?'하루 기준':'Daily'}</small><span>{outputLabel}</span></header>
  <div className="gu-production-body"><div className="gu-production-side">{inputs}</div><div className="gu-production-node"><svg className="gu-production-connector" viewBox="0 0 32 12" aria-hidden="true"><path d="M1 6H29M25 2L29 6L25 10"/></svg><div>{building}</div><svg className="gu-production-connector" viewBox="0 0 32 12" aria-hidden="true"><path d="M1 6H29M25 2L29 6L25 10"/></svg></div><div className="gu-production-side">{outputs}</div></div>
  {footer&&<footer>{footer}</footer>}
 </section>;
}
export function ProductionItem({icon,name,quantity,detail,meter,onSelect,help,className=''}:{icon:ReactNode;name:string;quantity:ReactNode;detail?:ReactNode;meter?:ReactNode;onSelect?:()=>void;help?:string;className?:string}){
 const content=<><span className="gu-production-art">{icon}</span><span className="gu-production-content"><span className="gu-production-name">{name}</span><strong className="gu-production-quantity">{quantity}</strong>{detail&&<small>{detail}</small>}</span>{meter&&<span className="gu-production-meter">{meter}</span>}</>;
 return onSelect?<ActionButton className={`gu-production-item ${className}`} onClick={onSelect} data-help={help} aria-label={name}>{content}</ActionButton>:<div className={`gu-production-item ${className}`} data-help={help} tabIndex={help?0:undefined}>{content}</div>;
}
