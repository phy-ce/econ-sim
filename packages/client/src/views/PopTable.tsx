import { useEffect, useMemo, useState } from 'react';
import { GOOD_IDS, POP_CLASSES, wealthOf, literacyOf } from '@econ/sim';
import type { PopClass, World } from '@econ/sim';
import { buildingName, className, goodName, regionName, useT, useLang } from '../i18n';
import { exactNumber, pct } from '../format';
import { NumericValue } from '../NumericValue';
import { ClassSprite } from '../sprites';
import { SortHeader } from './SortHeader';
export interface PopRequest { regionId:number; prof:PopClass; sequence:number }
type Column='region'|'prof'|'size'|'wealth'|'sol'|'food'|'fulfillment'|'incomeEma'|'kind'|'literacy'|'growth';
type View='living'|'income'|'education';
const VIEW_COLUMNS:Record<View,Column[]>={living:['size','sol','food','fulfillment'],income:['size','wealth','incomeEma','kind'],education:['size','literacy','growth']};
export function PopTable({world,request,onRegion,onBuilding}:{world:World;request?:PopRequest|null;onRegion:(id:number)=>void;onBuilding:(id:number)=>void}) {
 const T=useT(),ko=useLang()==='ko';
 const [region,setRegion]=useState(0),[prof,setProf]=useState<PopClass|''>(''),[unemployed,setUnemployed]=useState(false);
 const [view,setView]=useState<View>(()=>{try{const v=localStorage.getItem('estera.popView');return v==='income'||v==='education'?v:'living';}catch{return 'living';}});
 const [sort,setSort]=useState<Column>('size'),[direction,setDirection]=useState(-1);
 useEffect(()=>{try{localStorage.setItem('estera.popView',view);}catch{}},[view]);
 useEffect(()=>{if(request){setRegion(request.regionId);setProf(request.prof);setUnemployed(false);}},[request]);
 const buildings=useMemo(()=>new Map(world.buildings.map(b=>[b.id,b])),[world.buildings]);
 const regions=useMemo(()=>new Map(world.regions.map(r=>[r.id,r])),[world.regions]);
 const names:Record<Column,string>={region:T.popRegion,prof:T.popProfession,size:T.popSize,wealth:T.wealthLevel,sol:T.standardOfLiving,food:T.popFood,fulfillment:T.popNeeds,incomeEma:T.popIncome,kind:T.popKind,literacy:T.popLiteracy,growth:T.popGrowth};
 const columns:Column[]=['region','prof',...VIEW_COLUMNS[view]];
 const rows=world.pops.filter(p=>p.size>=0.5&&(!region||p.regionId===region)&&(!prof||p.prof===prof)&&(!unemployed||p.work===0)).map(p=>{
  const r=regions.get(p.regionId)!,b=buildings.get(p.work),per=p.size>0?1/p.size:0;
  return {p,region:regionName(r),prof:className(p.prof),work:b?buildingName(b.typeId):T.unemployment,size:p.size,wealth:wealthOf(p),sol:p.sol,food:p.food,fulfillment:p.fulfillment,literacy:literacyOf(p),growth:p.growth,incomeEma:p.incomeEma*per,kind:GOOD_IDS.reduce((sum,g)=>sum+(p.inKind[g]??0)*r.market[g].price,0)*per,per};
 }).sort((a,b)=>{const av=a[sort],bv=b[sort];return (typeof av==='string'?av.localeCompare(String(bv)):Number(av)-Number(bv))*direction||a.p.id-b.p.id;});
 const hints:Partial<Record<Column,keyof typeof T.help>>={size:'population',wealth:'wealth',sol:'sol',food:'food',fulfillment:'fulfillment',incomeEma:'cashIncome',kind:'kind',literacy:'literacy',growth:'growth'};
 return <div className="pop-directory"><div className="pop-filters">
  <select aria-label={T.popRegion} value={region} onChange={e=>setRegion(Number(e.target.value))}><option value={0}>{T.allRegions}</option>{world.regions.map(r=><option key={r.id} value={r.id}>{regionName(r)}</option>)}</select>
  <select aria-label={T.popProfession} value={prof} onChange={e=>setProf(e.target.value as PopClass|'')}><option value="">{T.allProfessions}</option>{POP_CLASSES.map(c=><option key={c} value={c}>{className(c)}</option>)}</select>
  <label><input type="checkbox" checked={unemployed} onChange={e=>setUnemployed(e.target.checked)}/>{T.unemployedOnly}</label><span>{rows.length}</span>
 </div><div className="pxseg pop-views" role="group" aria-label={ko?'인구 보기':'Population view'}>{(['living','income','education'] as View[]).map(v=><button key={v} aria-pressed={view===v} onClick={()=>{setView(v);if(!['region','prof',...VIEW_COLUMNS[v]].includes(sort)){setSort('size');setDirection(-1);}}}>{({living:ko?'생활':'Living',income:ko?'소득':'Income',education:ko?'교육':'Education'})[v]}</button>)}</div>
 <table className="pop-table"><colgroup><col style={{width:'30%'}}/><col style={{width:30}}/>{VIEW_COLUMNS[view].map(k=><col key={k}/>)}</colgroup><thead><tr>{columns.map(key=><SortHeader key={key} label={key==='size'?(ko?'인구':'Pop'):key==='incomeEma'?(ko?'소득':'Income'):key==='kind'?(ko?'현물':'In kind'):key==='growth'?(ko?'증감':'Growth'):key==='prof'?(ko?'직종':'Job'):key==='sol'?(ko?'생활':'SoL'):key==='fulfillment'?(ko?'충족':'Needs'):key==='literacy'?(ko?'문해':'Literacy'):names[key]} hint={hints[key]?T.help[hints[key]!]:undefined} active={sort===key} direction={direction} onClick={()=>{setSort(key);setDirection(sort===key?-direction:['region','prof'].includes(key)?1:-1);}}/>)}</tr></thead><tbody>{rows.map(row=><tr key={row.p.id} className={row.p.work===0||row.food<.4?'pop-risk':''}>
 <td><button className="entity-link" data-help={row.region} onClick={()=>onRegion(row.p.regionId)}>{row.region}</button><small>{row.p.work&&buildings.has(row.p.work)?<button className="entity-link" data-help={row.work} onClick={()=>onBuilding(row.p.work)}>{row.work} ↗</button>:row.work}</small></td>
 <td><span tabIndex={0} data-help={row.prof} aria-label={row.prof}><ClassSprite c={row.p.prof} size={18}/></span></td>
 {VIEW_COLUMNS[view].map(k=><td key={k}>{k==='kind'?<span tabIndex={0} data-help={`${T.inKindValue}: ${exactNumber(row.kind)}\n${GOOD_IDS.filter(g=>row.p.inKind[g]).map(g=>`${goodName(g)}: ${exactNumber(row.p.inKind[g]!*row.per)}`).join('\n')}`}><NumericValue value={row.kind} format="money"/></span>:k==='food'||k==='fulfillment'||k==='literacy'?<span data-help={`${names[k]}: ${exactNumber(row[k]*100)}%`} tabIndex={0}>{pct(row[k])}</span>:k==='growth'?<span className={row.growth<0?'neg':'pos'}>{row.growth.toFixed(2)}%</span>:<NumericValue value={Number(row[k])} format={k==='size'?'compact':k==='incomeEma'?'money':'one'}/>}</td>)}
 </tr>)}</tbody></table>{!rows.length&&<div className="muted">{T.noMatches}</div>}</div>;
}
