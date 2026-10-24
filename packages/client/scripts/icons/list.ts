import { readFileSync } from 'node:fs';
import { GOOD_IDS, BUILDING_TYPES, POP_CLASSES, REGIONS, HARVEST_KINDS } from '@econ/sim';
import { spriteAsset } from '../../src/spriteAtlas';
const list=JSON.parse(readFileSync(new URL('../../assets-src/icons.json',import.meta.url),'utf8')) as {id:string;family:'goods'|'building'|'general';sheet:string;slot:number;subject_en:string}[];
const symbols=['royal-crown','private-purse','crest','coin','demolish','bell','ev-famine','ev-migrate','ev-build','ev-price','ev-seize','ev-research','sun','m-ship','m-tree'];
const required={goods:GOOD_IDS,building:BUILDING_TYPES.map(b=>b.id),general:[...POP_CLASSES,...REGIONS.map(r=>`region-${r.id}`),...HARVEST_KINDS.map(h=>h.id),...symbols]};
let errors=0;
for(const family of ['goods','building','general'] as const){
 const used=new Set<string>();
 for(const id of required[family]){
  const a=spriteAsset(id,family),entry=list.find(e=>e.id===id&&e.family===family);
  if(!a||!entry){console.error('MISSING',family,id);errors++;continue;}
  const key=`${a.file}:${a.index}`;
  if(used.has(key)){console.error('ALIASED',family,id,key);errors++;}used.add(key);
 }
 for(const e of list.filter(e=>e.family===family))if(!(required[family] as string[]).includes(e.id)){console.error('EXTRA',family,e.id);errors++;}
}
if(errors)process.exitCode=1;else console.log(`Icon coverage OK: ${list.length} distinct sprites; all simulation IDs mapped without aliases.`);
