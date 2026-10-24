import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { REGIONS } from '@econ/sim';

const source = new URL('../src/map/regions.svg', import.meta.url);
const svg = readFileSync(source, 'utf8');
const tags = [...svg.matchAll(/<path\b[^>]*>/g)].map(m => Object.fromEntries([...m[0].matchAll(/([\w-]+)="([^"]*)"/g)].map(a => [a[1], a[2]])));
const coords = (d: string) => [...d.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map(m => [Number(m[1]), Number(m[2])]);
const segments = (d: string) => d.split('M').flatMap(r => {
 const points=coords(r); return points.slice(1).map((p,i) => ({ key: [p.join(','),points[i].join(',')].sort().join('|'), length:Math.hypot(p[0]-points[i][0],p[1]-points[i][1]) }));
});
const regions = tags.filter(t=>t.id.startsWith('region-')).map(t=> {
 const pts=coords(t.d),xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
 const label=t['data-label'].split(',').map(Number),icon=t['data-icon'].split(',').map(Number);
 return {id:Number(t.id.slice(7)),d:t.d,bbox:[Math.min(...xs),Math.min(...ys),Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys)],centroid:label,label,icon,anchors:{rail:[label[0],label[1]+30]}};
});
const borders=tags.filter(t=>t.id.startsWith('border-')).map(t=>({a:Number(t.id.split('-')[1]),b:Number(t.id.split('-')[2]),d:t.d}));
const expected=REGIONS.flatMap(r=>r.neighbors.filter(n=>n>r.id).map(n=>`${r.id}-${n}`)).sort();
const actual:string[]=[];
for(const a of regions) for(const b of regions) if(a.id<b.id){
 const bSegments=new Set(segments(b.d).map(s=>s.key));
 const length=segments(a.d).filter(s=>bSegments.has(s.key)).reduce((n,s)=>n+s.length,0);
 if(length>20)actual.push(`${a.id}-${b.id}`);
 if(!expected.includes(`${a.id}-${b.id}`)){
  const points=new Set(coords(a.d).map(p=>p.join(',')));
  if(coords(b.d).some(p=>points.has(p.join(','))))throw Error(`Non-neighbors touch: ${a.id}-${b.id}`);
 }
}
if(JSON.stringify(actual.sort())!==JSON.stringify(expected))throw Error(`Map neighbors differ: ${actual} / ${expected}`);
if(JSON.stringify(borders.map(b=>`${b.a}-${b.b}`).sort())!==JSON.stringify(expected))throw Error('Border list differs from simulation');
if(REGIONS.some(r=>!regions.some(p=>p.id===r.id)))throw Error('Missing region geometry: update source SVG');
const unclaimed=tags.filter(t=>['lake','massif'].includes(t.id)).map(t=>({id:t.id,d:t.d}));
const data={viewBox:[0,0,1536,1024],image:{light:'assets/map/map-base.webp'},regions,borders,unclaimed,rivers:['M930,370Q870,390 800,450T650,500Q590,520 530,550T380,535','M1420,500Q1370,580 1400,690T1450,850']};
const output=JSON.stringify(data);
if(output.length>100000)throw Error('Map JSON exceeds 100KB');
writeFileSync(new URL('../src/map/regions.json',import.meta.url),output+'\n');
console.log(`Map OK: ${regions.length} regions, ${actual.length} neighbor pairs, ${output.length} bytes (${fileURLToPath(source)})`);
