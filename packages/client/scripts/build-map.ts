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
const data={viewBox:[0,0,1536,1024],image:{light:'assets/map/map-base.webp'},regions,borders,unclaimed,rivers:[
 'M982,330 C956,356 966,378 934,395 S899,409 882,434 S852,450 837,471 S792,482 767,495 S727,499 703,515 S662,519 635,535 S593,542 563,556 S518,552 489,561 S434,552 403,542 L365,538',
 'M811,350 C833,378 815,399 836,421 S853,452 837,471',
 'M671,433 C692,457 673,473 689,490 S709,505 703,515',
 'M1420,310 C1396,347 1417,372 1388,405 S1399,445 1377,473 S1381,509 1362,541 S1369,585 1348,617 S1361,658 1345,692 S1366,736 1351,767 S1374,813 1369,849 S1406,899 1400,940 S1435,996 1444,1048 L1465,1130',
 'M1236,543 C1269,555 1261,581 1298,590 S1331,595 1348,617',
 'M1483,568 C1460,589 1468,616 1431,632 S1374,656 1345,692'
 ],routes:[
 {a:1,b:2,d:'M590,250 C565,304 600,348 572,400 S535,495 560,565'},
 {a:1,b:3,d:'M590,250 C676,223 705,269 760,281 S854,311 915,380'},
 {a:2,b:3,d:'M560,565 C618,533 652,548 696,511 S759,460 804,439 S868,417 915,380'},
 {a:2,b:4,d:'M560,565 C594,607 610,636 611,691 S638,809 690,870'},
 {a:3,b:5,d:'M915,380 C945,432 925,465 966,497 S1012,562 1002,614 S1026,750 1070,820'},
 {a:3,b:6,d:'M915,380 C950,332 1014,337 1051,302 S1117,258 1174,280 S1269,292 1320,270'},
 {a:4,b:5,d:'M690,870 C761,849 815,881 866,863 S991,851 1070,820'},
 {a:5,b:7,d:'M1070,820 C1142,795 1151,734 1211,717 S1283,681 1360,650'},
 {a:6,b:7,d:'M1320,270 C1297,333 1334,376 1317,430 S1341,493 1330,544 S1339,613 1360,650'}
 ]};
const output=JSON.stringify(data);
if(output.length>200000)throw Error('Map JSON exceeds 200KB');
writeFileSync(new URL('../src/map/regions.json',import.meta.url),output+'\n');
console.log(`Map OK: ${regions.length} regions, ${actual.length} neighbor pairs, ${output.length} bytes (${fileURLToPath(source)})`);
