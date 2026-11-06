import {Fragment,type ReactNode} from 'react';
import {hasStatus,sourceLink,statusLabels,type Block,type Status} from './document';
import {copy,type Locale} from './strings';
export function Inline({text,lang}:{text:string;lang:Locale}){
 const pattern=/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\)|\[(?:확정|제안|사용자 결정 필요)\])/g;
 const parts:ReactNode[]=[];let start=0;for(const match of text.matchAll(pattern)){
  const value=match[0],index=match.index!;parts.push(text.slice(start,index));
  const status=(Object.keys(statusLabels) as Status[]).find(key=>value===`[${statusLabels[key]}]`);
  if(status)parts.push(<span key={index} className={`fd-status ${status}`} lang={lang}>{copy[lang][status]}</span>);
  else if(value.startsWith('**'))parts.push(<strong key={index}><Inline text={value.slice(2,-2)} lang={lang}/></strong>);
  else if(value.startsWith('`'))parts.push(<code key={index}>{value.slice(1,-1)}</code>);
  else{const link=/^\[([^\]]+)\]\(([^)]+)\)$/.exec(value)!,href=sourceLink(link[2]);parts.push(href?<a key={index} href={href} target="_blank" rel="noreferrer">{link[1]}</a>:<Fragment key={index}>{link[1]}</Fragment>);}
  start=index+value.length;
 }
 parts.push(text.slice(start));return <>{parts}</>;
}
export function MarkdownBlock({block,index,lang,filter}:{block:Block;index:number;lang:Locale;filter:Status|'all'}){
 const visible=(text:string)=>filter==='all'||hasStatus(text,filter),inline=(text:string)=><Inline text={text} lang={lang}/>;
 if(block.kind==='heading'){const Heading=block.level<=3?'h2':'h3';return <Heading id={block.id} data-block={index}>{inline(block.text)}</Heading>;}
 if(block.kind==='paragraph')return visible(block.text)?<p data-block={index}>{inline(block.text)}</p>:null;
 if(block.kind==='list'){const List=block.ordered?'ol':'ul',items=block.items.filter(visible);return items.length?<List data-block={index}>{items.map((text,i)=><li key={i}>{inline(text)}</li>)}</List>:null;}
 const rows=block.rows.slice(1).filter(row=>visible(row.join(' ')));if(!rows.length)return null;
 return <div className="fd-table-wrap" data-block={index} role="region" aria-label={block.rows[0].join(' · ')} tabIndex={0}><table><thead><tr>{block.rows[0].map((text,i)=><th key={i} scope="col">{inline(text)}</th>)}</tr></thead><tbody>{rows.map((row,i)=><tr key={i}>{row.map((text,j)=><td key={j}>{inline(text)}</td>)}</tr>)}</tbody></table></div>;
}
