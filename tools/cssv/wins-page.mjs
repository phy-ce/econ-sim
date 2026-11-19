// In-page cascade measure for verify.mjs (CSSV_WINS=1). For the game sheet (ui/index.css), lists every style rule in order
// and, for the current screen, which (rule, longhand) pairs win on some element or ::before/::after.
// Conservative: rules with dynamic pseudo-classes or other pseudo-elements do not take part; rules inside @container are treated
// as not applying; a second pass without @media/@supports rules credits the declarations those conditional rules beat.
export const WINS = `(()=>{
const sheet=[...document.styleSheets].find(s=>(s.ownerNode?.dataset?.viteDevId||'').replace(/\\\\/g,'/').endsWith('ui/index.css'));
if(!sheet)return {error:'no sheet'};
const splitTop=sel=>{const o=[];let d=0,c='',q='';for(const ch of sel){if(q){c+=ch;if(ch===q)q='';continue;}if(ch==='"'||ch==="'"){q=ch;c+=ch;continue;}if(ch==='('||ch==='[')d++;if(ch===')'||ch===']')d--;if(ch===','&&d===0){o.push(c);c='';}else c+=ch;}o.push(c);return o.map(x=>x.trim());};
const spec=s=>{let a=0,b=0,c=0,i=0;const id=()=>{while(i<s.length&&(/[\\w-]/.test(s[i])||s.charCodeAt(i)>127||s[i]==='\\\\')){if(s[i]==='\\\\')i++;i++;}};
 const paren=()=>{let d=0,st=i;for(;i<s.length;i++){if(s[i]==='(')d++;else if(s[i]===')'){d--;if(!d){i++;break;}}}return s.slice(st+1,i-1);};
 while(i<s.length){const ch=s[i];
  if(ch==='#'){a++;i++;id();}
  else if(ch==='.'){b++;i++;id();}
  else if(ch==='['){b++;let q='';for(;i<s.length;i++){if(q){if(s[i]===q)q='';continue;}if(s[i]==='"'||s[i]==="'")q=s[i];else if(s[i]===']'){i++;break;}}}
  else if(ch===':'){if(s[i+1]===':'){c++;i+=2;id();if(s[i]==='(')paren();}
   else{i++;const st=i;id();const n=s.slice(st,i).toLowerCase();
    if(s[i]==='('){const inner=paren();
     if(n==='where'){}else if(['is','not','has','matches','-webkit-any'].includes(n)){let m=[0,0,0];for(const p of splitTop(inner)){const t=spec(p);if(t[0]*1e6+t[1]*1e3+t[2]>m[0]*1e6+m[1]*1e3+m[2])m=t;}a+=m[0];b+=m[1];c+=m[2];}
     else b++;}
    else if(['before','after','first-line','first-letter'].includes(n))c++;else b++;}}
  else if(/[a-zA-Z]/.test(ch)){c++;id();}
  else i++;}
 return [a,b,c];};
const DYN=/:(hover|focus|focus-visible|focus-within|active|visited|target)\\b/i;
const rules=[];
const walk=(list,cond,unk)=>{for(const r of list){
 if(r instanceof CSSStyleRule){const parts=[];let keep=false;
  for(const p of splitTop(r.selectorText)){let pseudo='';let q=p;const m=q.match(/::?(before|after)$/i);
   if(m){pseudo=m[1].toLowerCase();q=q.slice(0,-m[0].length)||'*';}
   if(/::/.test(q)||/:(first-line|first-letter)\\b/i.test(q)){keep=true;continue;}
   if(DYN.test(q)){keep=true;continue;}
   const t=spec(p);parts.push({q,pseudo,sp:t[0]*1e6+t[1]*1e3+t[2]});}
  const lh=[];for(let i=0;i<r.style.length;i++)lh.push([r.style[i],r.style.getPropertyPriority(r.style[i])==='important'?1:0]);
  rules.push({sel:r.selectorText,parts,keep,cond,unk,lh});}
 else if(r instanceof CSSMediaRule)walk(r.cssRules,true,unk||!matchMedia(r.media.mediaText).matches);
 else if(r instanceof CSSSupportsRule)walk(r.cssRules,true,unk||!CSS.supports(r.conditionText));
 else if(r.cssRules&&!(r instanceof CSSKeyframesRule))walk(r.cssRules,true,true);
}};
walk(sheet.cssRules,false,false);
const T=new Map();
rules.forEach((r,idx)=>{if(r.unk)return;for(const p of r.parts){let els;try{els=document.querySelectorAll(p.q);}catch{continue;}
 for(const e of els){let t=T.get(e);if(!t){t={'':new Map(),before:new Map(),after:new Map()};T.set(e,t);}const m=t[p.pseudo];const o=m.get(idx);if(o===undefined||o<p.sp)m.set(idx,p.sp);}}});
const wins=new Set(),matched=new Set();
const decide=(entries)=>{entries.sort((x,y)=>x[1]-y[1]||x[0]-y[0]);const norm=new Map(),imp=new Map();
 for(const [idx] of entries)for(const [n,i] of rules[idx].lh)(i?imp:norm).set(n,idx);
 for(const [n,idx] of norm)if(!imp.has(n))wins.add(idx+'|'+n);for(const [n,idx] of imp)wins.add(idx+'|'+n);};
for(const t of T.values())for(const k of ['','before','after']){const m=t[k];if(!m.size)continue;const all=[...m];for(const [idx] of all)matched.add(idx);
 decide(all.slice());decide(all.filter(([idx])=>!rules[idx].cond));}
return {n:rules.length,meta:window.__csswMeta?null:rules.map(r=>[r.sel,r.keep?1:0,r.cond?1:0,r.unk?1:0,r.lh]),wins:[...wins],matched:[...matched]};
})()`;
