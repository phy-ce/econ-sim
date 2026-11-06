export type Block={kind:'heading';level:number;text:string;id:string}|{kind:'paragraph';text:string}|{kind:'list';items:string[];ordered:boolean}|{kind:'table';rows:string[][]};
export type Section={id:string;title:string;blocks:Block[]};
export type Status='confirmed'|'proposed'|'pending';
export const statusLabels:Record<Status,string>={confirmed:'확정',proposed:'제안',pending:'사용자 결정 필요'};
const cells=(line:string)=>line.trim().replace(/^\||\|$/g,'').split('|').map(c=>c.trim());
export function parseBlocks(text:string,prefix:string):Block[]{
 const lines=text.split(/\r?\n/),blocks:Block[]=[];let i=0;
 while(i<lines.length){
  const line=lines[i].trim();if(!line){i++;continue;}
  const heading=/^(#{1,6})\s+(.+)$/.exec(line);
  if(heading){blocks.push({kind:'heading',level:heading[1].length,text:heading[2],id:`${prefix}-${blocks.length}`});i++;continue;}
  if(line.startsWith('|')&&/^\|[\s:|\-]+\|$/.test(lines[i+1]?.trim()??'')){
   const rows=[cells(line)];i+=2;while(i<lines.length&&lines[i].trim().startsWith('|'))rows.push(cells(lines[i++]));blocks.push({kind:'table',rows});continue;
  }
  const list=/^(?:([-*])|(\d+)\.)\s+(.+)$/.exec(line);
  if(list){const items:string[]=[],ordered=!!list[2];while(i<lines.length){const item=/^(?:([-*])|(\d+)\.)\s+(.+)$/.exec(lines[i].trim());if(!item||!!item[2]!==ordered)break;items.push(item[3]);i++;}blocks.push({kind:'list',items,ordered});continue;}
  const parts=[line];i++;while(i<lines.length&&lines[i].trim()&&!/^(#{1,6}\s|\||[-*]\s|\d+\.\s)/.test(lines[i].trim()))parts.push(lines[i++].trim());blocks.push({kind:'paragraph',text:parts.join(' ')});
 }
 return blocks;
}
export function parseDocument(source:string):Section[]{
 const parts=source.split(/^## /m).slice(1);
 return parts.map((part,index)=>{const end=part.indexOf('\n'),title=part.slice(0,end).trim(),chapter=/^([A-L])\./.exec(title);const id=chapter?chapter[1].toLowerCase():index===0?'decisions':title.startsWith('문서의')?'status':'resources';return {id,title,blocks:parseBlocks(part.slice(end+1),id)};});
}
export function blockText(block:Block):string{return block.kind==='table'?block.rows.flat().join(' '):block.kind==='list'?block.items.join(' '):block.text;}
export function plainText(value:string):string{return value.replace(/\[([^\]]+)\]\([^)]+\)/g,'$1').replace(/[*`]/g,'').replace(/\[(확정|제안|사용자 결정 필요)\]/g,'').trim();}
export function hasStatus(text:string,status:Status):boolean{return text.includes(`[${statusLabels[status]}]`);}
export function isBlockVisible(blocks:Block[],index:number,filter:Status|'all'):boolean{
 if(filter==='all')return true;
 const block=blocks[index];if(block.kind!=='heading')return hasStatus(blockText(block),filter);
 for(let next=index+1;next<blocks.length;next++){const candidate=blocks[next];if(candidate.kind==='heading'){if(candidate.level<=block.level)break;}else if(hasStatus(blockText(candidate),filter))return true;}
 return false;
}
export function sourceLink(href:string):string|undefined{
 const target=href.trim();
 if(/^https?:\/\//i.test(target))return target;
 if(/^[a-z][a-z\d+.-]*:/i.test(target)||target.startsWith('//'))return undefined;
 const url=new URL(target,'https://github.com/phy-ce/econ-sim/blob/main/docs/');
 return /^https?:$/.test(url.protocol)?url.href:undefined;
}
export function sectionPath(id:string){return /^[a-l]$/.test(id)?`#/foundations/${id}`:`#/${id}`;}
export function searchDocument(sections:Section[],query:string){
 const term=query.trim().toLocaleLowerCase();if(!term)return [];
 return sections.flatMap(section=>section.blocks.flatMap((block,index)=>{const text=plainText(blockText(block)),position=text.toLocaleLowerCase().indexOf(term);if(position<0)return [];return [{section,index,excerpt:`${position>55?'…':''}${text.slice(Math.max(0,position-55),position+150)}${position+150<text.length?'…':''}`}];})).slice(0,24);
}
