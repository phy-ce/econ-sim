import {createContext,useContext,type ButtonHTMLAttributes,type ReactNode} from 'react';
import {ArrowLeft,ArrowRight,X} from 'lucide-react';
import {KO,EN} from '../strings';
import {BUILDING_BY_ID,GOODS} from '@econ/sim';
import type {GoodId} from '@econ/sim';

export type DSLocale='ko'|'en';
export type DSTone='neutral'|'positive'|'negative'|'brass'|'info';
const numberFormats=new Map<string,Intl.NumberFormat>();
function numberFormat(locale:string,options:Intl.NumberFormatOptions){const key=locale+JSON.stringify(options);let format=numberFormats.get(key);if(!format){format=new Intl.NumberFormat(locale,options);numberFormats.set(key,format);}return format;}
const CopyContext=createContext<DSLocale>('ko');
export const DSCopyProvider=CopyContext.Provider;
export function useDS(){const lang=useContext(CopyContext);return {lang,D:(lang==='ko'?KO:EN).designSystem,good:(g:GoodId)=>lang==='ko'?GOODS[g].name:GOODS[g].nameEn??GOODS[g].name,building:(id:string)=>lang==='ko'?BUILDING_BY_ID[id].name:BUILDING_BY_ID[id].nameEn??BUILDING_BY_ID[id].name};}
export function DSButton({variant='secondary',size='normal',children,className='',...props}:ButtonHTMLAttributes<HTMLButtonElement>&{variant?:'primary'|'secondary'|'quiet'|'danger';size?:'normal'|'small';children:ReactNode}){
 return <button type="button" {...props} className={`ds-button ds-button-${variant} ds-button-${size} ${className}`}>{children}</button>;
}
export function DSIconButton({label,children,...props}:ButtonHTMLAttributes<HTMLButtonElement>&{label:string;children:ReactNode}){return <DSButton {...props} className={`ds-icon-button ${props.className??''}`} aria-label={label} data-help={label}>{children}</DSButton>;}
export function DSBadge({tone='neutral',children}:{tone?:DSTone;children:ReactNode}){return <span className={`ds-badge ds-tone-${tone}`}>{children}</span>;}
export function DSQuantity({value,currency=false,signed=false,compact=false,decimals=2}:{value:number|null;currency?:boolean;signed?:boolean;compact?:boolean;decimals?:number}){
 const {lang}=useDS();if(value===null||!Number.isFinite(value))return <span className="ds-number ds-missing">—</span>;
 const locale=lang==='ko'?'ko-KR':'en-US',digits=Math.max(0,Math.min(2,decimals));
 const exact=numberFormat(locale,{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(Math.abs(value));
 const displayed=compact?numberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(Math.abs(value)):exact;
 const prefix=(value<0?'−':signed?'+':'')+(currency?'ƒ':'');
 return <span className="ds-number" tabIndex={compact?0:undefined} data-help={compact?prefix+exact:undefined} aria-label={prefix+exact}>{prefix}{displayed}</span>;
}
export function DSMeter({label,value,tone='info',figure,help}:{label:string;value:number|null;tone?:DSTone;figure?:ReactNode;help?:string}){
 const percent=value===null?'—':`${(value*100).toFixed(2)}%`;
 return <div className={`ds-meter ds-tone-${tone}`} tabIndex={help?0:undefined} data-help={help}><div className="ds-meter-head"><span>{label}</span><b>{figure??<span className="ds-number">{percent}</span>}</b></div><div className="ds-meter-track" role="img" aria-label={`${label}: ${percent}`}><i style={{width:`${Math.max(0,Math.min(1,value??0))*100}%`}}/></div></div>;
}
export function DSChoice({label,value,onChange,options}:{label:string;value:string;onChange:(value:string)=>void;options:{value:string;label:string}[]}){
 return <div className="ds-choice" role="group" aria-label={label}>{options.map((o,i)=><button type="button" key={o.value} aria-pressed={value===o.value} onClick={()=>onChange(o.value)} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const n=e.key==='Home'?0:e.key==='End'?options.length-1:(i+(e.key==='ArrowRight'?1:-1)+options.length)%options.length;onChange(options[n].value);e.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('button')[n].focus();}}>{o.label}</button>)}</div>;
}
export function DSSection({number,title,children,className=''}:{number:string;title:string;children:ReactNode;className?:string}){return <section className={`ds-specimen ${className}`}><header className="ds-specimen-heading"><span className="ds-index">{number}</span><h2>{title}</h2></header><div className="ds-specimen-body">{children}</div></section>;}
export function DSWindow({title,detail=false,children,onClose}:{title:string;detail?:boolean;children:ReactNode;onClose?:()=>void}){
 const {D}=useDS();return <section className={`ds-window ${detail?'ds-window-detail':''}`} aria-label={title}><header className="ds-window-heading"><span className="ds-window-mark"/><h2>{title}</h2><div><DSIconButton label={D.back} disabled><ArrowLeft size={16}/></DSIconButton><DSIconButton label={D.forward} disabled><ArrowRight size={16}/></DSIconButton><DSIconButton label={D.close} onClick={onClose} disabled={!onClose}><X size={16}/></DSIconButton></div></header><div className="ds-window-body">{children}</div></section>;
}
