import type {ReactNode} from 'react';
import {ActionButton} from '../ui/primitives';

export function BuildingChoice({name,icon,levels,status,metrics,onSelect,typeId,expanded,help,className=''}:{name:string;icon:ReactNode;levels:ReactNode;status?:ReactNode;metrics:ReactNode;onSelect:()=>void;typeId:string;expanded:boolean;help?:string;className?:string}){
 return <ActionButton className={`es-building-choice ${className}`} onClick={onSelect} aria-haspopup="dialog" aria-expanded={expanded} data-type-id={typeId} data-help={help}>
  <span className="es-building-art">{icon}</span><span className="es-building-identity"><strong>{name}</strong><span>{levels}{status}</span></span><span className="es-building-metrics">{metrics}</span>
 </ActionButton>;
}

export function SectionHeading({children,trailing,className=''}:{children:ReactNode;trailing?:ReactNode;className?:string}){
 return <h3 className={`es-section-heading ${className}`}><span>{children}</span>{trailing&&<span>{trailing}</span>}</h3>;
}
export function MetricRow({label,value,icon,track,help,onSelect,className=''}:{label:ReactNode;value:ReactNode;icon?:ReactNode;track?:ReactNode;help?:string;onSelect?:()=>void;className?:string}){
 const content=<><span className="es-metric-label">{icon}{label}</span><span className="es-metric-value">{value}</span>{track&&<span className="es-metric-track">{track}</span>}</>;
 const props={className:`es-metric-row ${className}`,'data-help':help};
 return onSelect?<ActionButton {...props} onClick={onSelect}>{content}</ActionButton>:<div {...props} tabIndex={help?0:undefined}>{content}</div>;
}

/** Shared by the specimen page and real game; callers own data and commands. */
export function ResourceRow({name,icon,quantity,amount,coverage,onSelect,help,className=''}:{name:string;icon:ReactNode;quantity:ReactNode;amount:ReactNode;coverage?:ReactNode;onSelect?:()=>void;help?:string;className?:string}){
 const content=<><span className="es-resource-name">{icon}<span>{name}</span></span><span className="es-resource-quantity">{quantity}</span><span className="es-resource-amount">{amount}</span><span className="es-resource-coverage">{coverage??'—'}</span></>;
 const props={className:`es-resource-row ${className}`,'data-help':help};
 return onSelect?<ActionButton {...props} onClick={onSelect} aria-label={name}>{content}</ActionButton>:<div {...props} tabIndex={help?0:undefined}>{content}</div>;
}
export function ResourceSection({title,period,columns,children}:{title:string;period?:string;columns:[string,string,string,string];children:ReactNode}){
 return <section className="es-resource-section"><header><strong>{title}</strong>{period&&<small>{period}</small>}</header><div className="es-resource-columns">{columns.map((s,i)=><span key={i}>{s}</span>)}</div>{children}</section>;
}
