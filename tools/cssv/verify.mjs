// usage (repo root): CSSV_URL=http://localhost:5199/ CSSV_OUT=.tmp/cssv/<label> node tools/cssv/cdp.mjs tools/cssv/verify.mjs
// Opens 74 screen states (ko light, en dark) on a fixed seed and records every rendered element's box and a hash of its full computed style (and ::before/::after).
import fs from 'node:fs'; import { WINS } from './wins-page.mjs';
const WMODE=!!process.env.CSSV_WINS; const W={meta:null,wins:new Set(),matched:new Set(),states:0};
const URL_=process.env.CSSV_URL||'http://localhost:5197/', OUT=process.env.CSSV_OUT||'.tmp/cssv/run', SHOTS=process.env.CSSV_SHOTS!=='0';
fs.mkdirSync(OUT,{recursive:true});
const result={url:URL_,started:new Date().toISOString(),states:{}};
const DUMP=`(()=>{
 const h=s=>{let x=2166136261>>>0;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)>>>0;}return x.toString(36);};
 const sty=(e,p)=>{const c=getComputedStyle(e,p);const ks=[];for(let i=0;i<c.length;i++)ks.push(c[i]);ks.sort();let s='';for(const k of ks)s+=k+':'+c.getPropertyValue(k).replace(/\\s+/g,' ').trim()+';';return s;};
 const path=e=>{const a=[];while(e&&e!==document.documentElement){const p=e.parentElement;a.push(e.tagName.toLowerCase()+(p?[...p.children].indexOf(e):0));e=p;}return a.reverse().join('/');};
 const out={};
 for(const e of [document.documentElement,...document.querySelectorAll('body *')]){
  if(e.closest('svg')&&e.tagName.toLowerCase()!=='svg')continue;
  if(!e.getClientRects().length)continue;
  const r=e.getBoundingClientRect();
  const b=getComputedStyle(e,'::before').content, a=getComputedStyle(e,'::after').content;
  const pseudo=(b&&b!=='none'?sty(e,'::before'):'')+'|'+(a&&a!=='none'?sty(e,'::after'):'');
  out[path(e)]=[Math.round(r.x*2)/2,Math.round(r.y*2)/2,Math.round(r.width*2)/2,Math.round(r.height*2)/2,h(sty(e)),h(pseudo),e.className&&typeof e.className==='string'?e.className.slice(0,80):''];
 }
 out.__root=(()=>{const c=getComputedStyle(document.documentElement);const o={};for(let i=0;i<c.length;i++)o[c[i]]=c.getPropertyValue(c[i]);return o;})();
 return out;})()`;
export default async api=>{
 await api.setViewport(1920,1028);
 await api.send('Page.addScriptToEvaluateOnNewDocument',{source:`(()=>{let s=12345;Math.random=()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648;};const W=window.Worker;window.Worker=function(u,o){const w=new W(u,o);window.__simWorker=w;return w;};window.Worker.prototype=W.prototype;})()`});
 const sleep=api.sleep;
 async function click(sel){const v=await api.click(sel);if(String(v).startsWith('NOTFOUND'))throw Error(v);await sleep(300);}
 async function closeDetails(){await api.eval("document.querySelectorAll('.detail-window .window-titlebar > button:last-child').forEach(b=>b.click())");await sleep(300);}
 async function openWindow(i){await closeDetails();await api.eval("document.querySelectorAll('.desktop-dock button[aria-pressed=true]').forEach(b=>b.click())");await click(`.desktop-dock button:nth-child(${i})`);}
 let prefix='';
 async function snap(name){await sleep(350);await api.send('Input.dispatchMouseEvent',{type:'mouseMoved',x:1915,y:1020});const key=`${prefix}-${name}`;if(WMODE){const r=await api.eval(WINS);if(r.error)throw Error(r.error);if(!W.meta)W.meta=r.meta;r.wins.forEach(x=>W.wins.add(x));r.matched.forEach(x=>W.matched.add(x));W.states++;return;}result.states[key]=await api.eval(DUMP);if(SHOTS)await api.shot(`${OUT}/${key}`);}
 async function tabs(sel,name){const n=await api.eval(`document.querySelectorAll(${JSON.stringify(sel)}).length`);for(let i=0;i<n;i++){await click(`${sel}:nth-child(${i+1})`);await snap(`${name}-${i+1}`);}}
 for(const [lang,theme] of [['ko','light'],['en','dark']]){
  prefix=`${lang}-${theme}`;
  await api.goto(URL_);await api.eval(`localStorage.clear();localStorage.setItem('estera-lang','${lang}');localStorage.setItem('estera-theme','${theme}');`);await api.goto(URL_);
  for(let i=0;i<60;i++){if(await api.eval("document.querySelectorAll('.desktop-dock button').length===6"))break;await sleep(200);}
  await api.eval("window.__simWorker.postMessage({type:'new',seed:4242})");await sleep(2500);
  await snap('map');
  if(process.env.CSSV_QUICK){fs.writeFileSync(`${OUT}/dump.json`,JSON.stringify(result));return;}
  const names=['region','market','state','research','construction','trends'];
  for(let i=0;i<names.length;i++){await openWindow(i+1);await snap(names[i]);}
  await openWindow(1);
  await click('.window-region .detail-launch:nth-of-type(3)');await snap('detail1');await closeDetails();
  await click('.window-region .detail-launch:nth-of-type(1)');await snap('detail2');await closeDetails();
  await click('.window-region .system-tabs button:nth-child(3)');await click('.window-region .industry-group-head');await snap('detail3');await closeDetails();
  await openWindow(4);await click('.window-research .detail-launch');await snap('detail4');await closeDetails();
  await openWindow(1);await tabs('.window-region .system-tabs > button','region-tab');
  await openWindow(2);await tabs('.window-market .explorer-rail > button','market-section');
  await openWindow(3);await tabs('.window-state > .window-body .system-tabs > button','state-tab');
  await openWindow(5);await tabs('.window-construction .system-tabs > button','construction-tab');
  await openWindow(5);await api.eval("[...document.querySelectorAll('.window-construction [data-type-id]')].find(b=>!/\\(0\\+0\\)/.test(b.textContent))?.click()");await sleep(400);
  const ct=await api.eval("document.querySelectorAll('.construction-task-tabs button').length");for(let i=0;i<ct;i++){await click(`.construction-task-tabs button:nth-child(${i+1})`);await snap(`construction-detail-${i+1}`);}await closeDetails();
  await openWindow(6);await tabs('.window-trends .explorer-rail > button','trends-section');
  await openWindow(2);await api.eval("(()=>{const e=[...document.querySelectorAll('.window-market [data-help][tabindex]')].find(e=>e.getClientRects().length&&!e.closest('[hidden]'));e&&e.focus();})()");await sleep(500);
  if(WMODE){await snap('tooltip');continue;}
  const key=`${prefix}-tooltip`;result.states[key]=await api.eval(DUMP);if(SHOTS)await api.shot(`${OUT}/${key}`);
 }
 if(WMODE){fs.writeFileSync(`${OUT}/wins.json`,JSON.stringify({meta:W.meta,wins:[...W.wins],matched:[...W.matched],states:W.states}));console.log('WINS',W.states,'states',W.wins.size,'wins');return;}
 result.finished=new Date().toISOString();
 fs.writeFileSync(`${OUT}/dump.json`,JSON.stringify(result));console.log('DONE',Object.keys(result.states).length,'states');
};
