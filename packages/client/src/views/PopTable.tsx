import {memo, useCallback} from 'react';
import {useNavigationState} from '../NavigationHistory';
import {BuildingPops} from './BuildingPops';
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
function PopTableView({world,request,onRegion,onBuilding,fixedRegion}:{world:World;fixedRegion?:number;request?:PopRequest|null;onRegion:(id:number)=>void;onBuilding:(id:number)=>void}) {
 const [active,setActive]=useNavigationState<number|null>(`pops:${fixedRegion===undefined?'global':'region'}:active`,null);
 const activePop=world.pops.find(p=>p.id===active);
 const visit=(id:number|null)=>setActive(id);
 const T=useT(),ko=useLang()==='ko';
 const [region,setRegion]=useNavigationState(`pops:${fixedRegion===undefined?'global':'region'}:region`,fixedRegion??0),[prof,setProf]=useNavigationState<PopClass|''>(`pops:${fixedRegion===undefined?'global':'region'}:prof`,''),[unemployed,setUnemployed]=useNavigationState(`pops:${fixedRegion===undefined?'global':'region'}:unemployed`,false);
 const [view,setView]=useNavigationState<View>(`pops:${fixedRegion===undefined?'global':'region'}:view`,()=>{try{const v=localStorage.getItem('estera.popView');return v==='income'||v==='education'?v:'living';}catch{return 'living';}});
 const [sort,setSort]=useNavigationState<Column>(`pops:${fixedRegion===undefined?'global':'region'}:sort`,'size'),[direction,setDirection]=useNavigationState(`pops:${fixedRegion===undefined?'global':'region'}:direction`,-1);
 useEffect(()=>{try{localStorage.setItem('estera.popView',view);}catch{}},[view]);
 useEffect(()=>{if(request){setActive(null);setRegion(request.regionId);setProf(request.prof);setUnemployed(false);}},[request]);
 useEffect(()=>{if(fixedRegion!==undefined){setRegion(fixedRegion);setActive(null);}},[fixedRegion]);
 const buildings=useMemo(()=>new Map(world.buildings.map(b=>[b.id,b])),[world.buildings]);
 const regions=useMemo(()=>new Map(world.regions.map(r=>[r.id,r])),[world.regions]);
 const names:Record<Column,string>={region:T.popRegion,prof:T.popProfession,size:T.popSize,wealth:T.wealthLevel,sol:T.standardOfLiving,food:T.popFood,fulfillment:T.popNeeds,incomeEma:T.popIncome,kind:T.popKind,literacy:T.popLiteracy,growth:T.popGrowth};
 const columns:Column[]=['region','prof',...VIEW_COLUMNS[view]];
 const rows=world.pops.filter(p=>p.size>=0.5&&(!region||p.regionId===region)&&(!prof||p.prof===prof)&&(!unemployed||p.work===0)).map(p=>{
  const r=regions.get(p.regionId)!,b=buildings.get(p.work),per=p.size>0?1/p.size:0;
  return {p,region:regionName(r),prof:className(p.prof),work:b?buildingName(b.typeId):T.unemployment,size:p.size,wealth:wealthOf(p),sol:p.sol,food:p.food,fulfillment:p.fulfillment,literacy:literacyOf(p),growth:p.growth,incomeEma:p.incomeEma*per,kind:GOOD_IDS.reduce((sum,g)=>sum+(p.inKind[g]??0)*r.market[g].price,0)*per,per};
 }).sort((a,b)=>{const av=a[sort],bv=b[sort];return (typeof av==='string'?av.localeCompare(String(bv)):Number(av)-Number(bv))*direction||a.p.id-b.p.id;});
 const hints:Partial<Record<Column,keyof typeof T.help>>={size:'population',wealth:'wealth',sol:'sol',food:'food',fulfillment:'fulfillment',incomeEma:'cashIncome',kind:'kind',literacy:'literacy',growth:'growth'};
 return <div className="pop-directory">{active!==null&&<button className="entity-link" onClick={()=>visit(null)}>{ko?'인구 목록':'Population list'}</button>}{active!==null?<>{activePop?<><h3>{regionName(regions.get(activePop.regionId)!)} · {className(activePop.prof)}</h3><section className="pop-relations" aria-label={ko?'관련 대상':'Related entities'}><header>{ko?'관련 대상':'RELATED'} <small>#{activePop.id}</small></header><button onClick={()=>onRegion(activePop.regionId)} data-help={ko?'이 팝이 거주하는 지역의 개요로 이동합니다.':'Open this pop’s home region.'}><span>{ko?'거주지':'HOME'}</span><strong>{regionName(regions.get(activePop.regionId)!)}</strong><small>{ko?'지역 개요':'Region overview'} ↗</small></button>{activePop.work&&buildings.has(activePop.work)?<button onClick={()=>onBuilding(activePop.work)} data-help={ko?'이 팝의 실제 근무 건물로 이동합니다. 창 제목의 뒤로 버튼으로 돌아올 수 있습니다.':'Open the actual workplace. Use Back in the window header to return.'}><span>{ko?'근무지':'WORK'}</span><strong>{buildingName(buildings.get(activePop.work)!.typeId)}</strong><small>{ko?'고용·생산':'Jobs · production'} ↗</small></button>:<p>{T.unemployment}</p>}</section><BuildingPops world={world} buildings={activePop.work&&buildings.has(activePop.work)?[buildings.get(activePop.work)!]:[]} popIds={[activePop.id]} onGood={()=>{}}/></>:<p>{ko?'이 팝은 이동 또는 병합되어 더 이상 존재하지 않습니다.':'This pop has moved or merged and no longer exists.'}</p>}</>:<><div className="pop-filters">
  <select aria-label={T.popRegion} disabled={fixedRegion!==undefined} value={region} onChange={e=>setRegion(Number(e.target.value))}><option value={0}>{T.allRegions}</option>{world.regions.map(r=><option key={r.id} value={r.id}>{regionName(r)}</option>)}</select>
  <select aria-label={T.popProfession} value={prof} onChange={e=>setProf(e.target.value as PopClass|'')}><option value="">{T.allProfessions}</option>{POP_CLASSES.map(c=><option key={c} value={c}>{className(c)}</option>)}</select>
  <label><input type="checkbox" checked={unemployed} onChange={e=>setUnemployed(e.target.checked)}/>{T.unemployedOnly}</label><span>{rows.length}</span>
 </div><div className="pxseg pop-views" role="group" aria-label={ko?'인구 보기':'Population view'}>{(['living','income','education'] as View[]).map(v=><button key={v} aria-pressed={view===v} onClick={()=>{setView(v);if(!['region','prof',...VIEW_COLUMNS[v]].includes(sort)){setSort('size');setDirection(-1);}}}>{({living:ko?'생활':'Living',income:ko?'소득':'Income',education:ko?'교육':'Education'})[v]}</button>)}</div>
 <table className="pop-table"><colgroup><col style={{width:'30%'}}/><col style={{width:30}}/>{VIEW_COLUMNS[view].map(k=><col key={k}/>)}</colgroup><thead><tr>{columns.map(key=><SortHeader key={key} label={key==='size'?(ko?'인구':'Pop'):key==='incomeEma'?(ko?'소득':'Income'):key==='kind'?(ko?'현물':'In kind'):key==='growth'?(ko?'증감':'Growth'):key==='prof'?(ko?'직종':'Job'):key==='sol'?(ko?'생활':'SoL'):key==='fulfillment'?(ko?'충족':'Needs'):key==='literacy'?(ko?'문해':'Literacy'):names[key]} hint={hints[key]?T.help[hints[key]!]:undefined} active={sort===key} direction={direction} onClick={()=>{setSort(key);setDirection(sort===key?-direction:['region','prof'].includes(key)?1:-1);}}/>)}</tr></thead><tbody>{rows.map(row=><tr key={row.p.id} className={row.p.work===0||row.food<.4?'pop-risk':''}>
 <td><button className="entity-link" data-help={row.region} onClick={()=>onRegion(row.p.regionId)}>{row.region}</button><small>{row.p.work&&buildings.has(row.p.work)?<button className="entity-link" data-help={row.work} onClick={()=>onBuilding(row.p.work)}>{row.work} ↗</button>:row.work}</small></td>
 <td><button className="entity-link" data-help={row.prof} aria-label={`${row.region} · ${row.work} · ${row.prof} 상세`} onClick={()=>visit(row.p.id)}><ClassSprite c={row.p.prof} size={18}/>↗</button></td>
 {VIEW_COLUMNS[view].map(k=><td key={k}>{k==='kind'?<span tabIndex={0} data-help={`${T.inKindValue}: ${exactNumber(row.kind)}\n${GOOD_IDS.filter(g=>row.p.inKind[g]).map(g=>`${goodName(g)}: ${exactNumber(row.p.inKind[g]!*row.per)}`).join('\n')}`}><NumericValue value={row.kind} format="money"/></span>:k==='food'||k==='fulfillment'||k==='literacy'?<span data-help={`${names[k]}: ${exactNumber(row[k]*100)}%`} tabIndex={0}>{pct(row[k])}</span>:k==='growth'?<span className={row.growth<0?'neg':'pos'}>{row.growth.toFixed(2)}%</span>:<NumericValue value={Number(row[k])} format={k==='size'?'compact':k==='incomeEma'?'money':'one'}/>}</td>)}
 </tr>)}</tbody></table>{!rows.length&&<div className="muted">{T.noMatches}</div>}</>}</div>;
}

export const PopTable=memo(PopTableView);
