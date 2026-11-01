import {t as uiCopy} from '../i18n';
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
function PopTableView({world,request,onRegion,onBuilding,fixedRegion,preserveSelection=false}:{preserveSelection?:boolean;world:World;fixedRegion?:number;request?:PopRequest|null;onRegion:(id:number)=>void;onBuilding:(id:number)=>void}) {
 const stateScope=preserveSelection?'detail:'+fixedRegion+':'+(request?.prof??''):(fixedRegion===undefined?'global':'region');
 const [active,setActive]=useNavigationState<number|null>(`pops:${stateScope}:active`,null);
 const activePop=world.pops.find(p=>p.id===active);
 const visit=(id:number|null)=>setActive(id);
 const T=useT(),ko=useLang()==='ko';
 const [region,setRegion]=useNavigationState(`pops:${stateScope}:region`,fixedRegion??0),[prof,setProf]=useNavigationState<PopClass|''>(`pops:${stateScope}:prof`,preserveSelection?(request?.prof??''):''),[unemployed,setUnemployed]=useNavigationState(`pops:${stateScope}:unemployed`,false);
 const [view,setView]=useNavigationState<View>(`pops:${stateScope}:view`,()=>{try{const v=localStorage.getItem('estera.popView');return v==='income'||v==='education'?v:'living';}catch{return 'living';}});
 const [sort,setSort]=useNavigationState<Column>(`pops:${stateScope}:sort`,'size'),[direction,setDirection]=useNavigationState(`pops:${stateScope}:direction`,-1);
 useEffect(()=>{try{localStorage.setItem('estera.popView',view);}catch{}},[view]);
 useEffect(()=>{if(request&&!preserveSelection){setActive(null);setRegion(request.regionId);setProf(request.prof);setUnemployed(false);}},[request]);
 useEffect(()=>{if(fixedRegion!==undefined&&!preserveSelection){setRegion(fixedRegion);setActive(null);}},[fixedRegion]);
 const buildings=useMemo(()=>new Map(world.buildings.map(b=>[b.id,b])),[world.buildings]);
 const regions=useMemo(()=>new Map(world.regions.map(r=>[r.id,r])),[world.regions]);
 const names:Record<Column,string>={region:T.popRegion,prof:T.popProfession,size:T.popSize,wealth:T.wealthLevel,sol:T.standardOfLiving,food:T.popFood,fulfillment:T.popNeeds,incomeEma:T.popIncome,kind:T.popKind,literacy:T.popLiteracy,growth:T.popGrowth};
 const columns:Column[]=['region','prof',...VIEW_COLUMNS[view]];
 const rows=world.pops.filter(p=>p.size>=0.5&&(!region||p.regionId===region)&&(!prof||p.prof===prof)&&(!unemployed||p.work===0)).map(p=>{
  const r=regions.get(p.regionId)!,b=buildings.get(p.work),per=p.size>0?1/p.size:0;
  return {p,region:regionName(r),prof:className(p.prof),work:b?buildingName(b.typeId):T.unemployment,size:p.size,wealth:wealthOf(p),sol:p.sol,food:p.food,fulfillment:p.fulfillment,literacy:literacyOf(p),growth:p.growth,incomeEma:p.incomeEma*per,kind:GOOD_IDS.reduce((sum,g)=>sum+(p.inKind[g]??0)*r.market[g].price,0)*per,per};
 }).sort((a,b)=>{const av=a[sort],bv=b[sort];return (typeof av==='string'?av.localeCompare(String(bv)):Number(av)-Number(bv))*direction||a.p.id-b.p.id;});
 const hints:Partial<Record<Column,keyof typeof T.help>>={size:'population',wealth:'wealth',sol:'sol',food:'food',fulfillment:'fulfillment',incomeEma:'cashIncome',kind:'kind',literacy:'literacy',growth:'growth'};
 return <div className="pop-directory">{active!==null&&<button className="entity-link" onClick={()=>visit(null)}>{uiCopy().screenText['populationList']}</button>}{active!==null?<>{activePop?<><h3>{regionName(regions.get(activePop.regionId)!)} · {className(activePop.prof)}</h3><section className="pop-relations" aria-label={uiCopy().screenText['relatedEntities']}><header>{uiCopy().screenText['related']} <small>#{activePop.id}</small></header><button onClick={()=>onRegion(activePop.regionId)} data-help={uiCopy().screenText['openThisPopSHomeRegion']}><span>{uiCopy().screenText['home175']}</span><strong>{regionName(regions.get(activePop.regionId)!)}</strong><small>{uiCopy().screenText['regionOverview']} ↗</small></button>{activePop.work&&buildings.has(activePop.work)?<button onClick={()=>onBuilding(activePop.work)} data-help={uiCopy().screenText['openTheActualWorkplaceUseBackIn']}><span>{uiCopy().screenText['work']}</span><strong>{buildingName(buildings.get(activePop.work)!.typeId)}</strong><small>{uiCopy().screenText['jobsProduction']} ↗</small></button>:<p>{T.unemployment}</p>}</section><BuildingPops world={world} buildings={activePop.work&&buildings.has(activePop.work)?[buildings.get(activePop.work)!]:[]} popIds={[activePop.id]} onGood={()=>{}}/></>:<p>{uiCopy().screenText['thisPopHasMovedOrMergedAnd']}</p>}</>:<><div className="pop-filters">
  <select aria-label={T.popRegion} disabled={fixedRegion!==undefined} value={region} onChange={e=>setRegion(Number(e.target.value))}><option value={0}>{T.allRegions}</option>{world.regions.map(r=><option key={r.id} value={r.id}>{regionName(r)}</option>)}</select>
  <select aria-label={T.popProfession} value={prof} onChange={e=>setProf(e.target.value as PopClass|'')}><option value="">{T.allProfessions}</option>{POP_CLASSES.map(c=><option key={c} value={c}>{className(c)}</option>)}</select>
  <label><input type="checkbox" checked={unemployed} onChange={e=>setUnemployed(e.target.checked)}/>{T.unemployedOnly}</label><span>{rows.length}</span>
 </div><div className="pxseg pop-views" role="group" aria-label={uiCopy().screenText['populationView']}>{(['living','income','education'] as View[]).map(v=><button key={v} aria-pressed={view===v} onClick={()=>{setView(v);if(!['region','prof',...VIEW_COLUMNS[v]].includes(sort)){setSort('size');setDirection(-1);}}}>{({living:uiCopy().screenText['living'],income:uiCopy().screenText['income'],education:uiCopy().screenText['education']})[v]}</button>)}</div>
 <table className="pop-table"><colgroup><col style={{width:'30%'}}/><col style={{width:30}}/>{VIEW_COLUMNS[view].map(k=><col key={k}/>)}</colgroup><thead><tr>{columns.map(key=><SortHeader key={key} label={key==='size'?(uiCopy().screenText['pop']):key==='incomeEma'?(uiCopy().screenText['income']):key==='kind'?(uiCopy().screenText['inKind']):key==='growth'?(uiCopy().screenText['growth']):key==='prof'?(uiCopy().screenText['job']):key==='sol'?(uiCopy().screenText['sol']):key==='fulfillment'?(uiCopy().screenText['needs188']):key==='literacy'?(uiCopy().screenText['literacy189']):names[key]} hint={hints[key]?T.help[hints[key]!]:undefined} active={sort===key} direction={direction} onClick={()=>{setSort(key);setDirection(sort===key?-direction:['region','prof'].includes(key)?1:-1);}}/>)}</tr></thead><tbody>{rows.map(row=><tr key={row.p.id} className={row.p.work===0||row.food<.4?'pop-risk':''}>
 <td><button className="entity-link" data-help={row.region} onClick={()=>onRegion(row.p.regionId)}>{row.region}</button><small>{row.p.work&&buildings.has(row.p.work)?<button className="entity-link" data-help={row.work} onClick={()=>onBuilding(row.p.work)}>{row.work} ↗</button>:row.work}</small></td>
 <td><button className="entity-link" data-help={row.prof} aria-label={`${row.region} · ${row.work} · ${row.prof} 상세`} onClick={()=>visit(row.p.id)}><ClassSprite c={row.p.prof} size={24}/>↗</button></td>
 {VIEW_COLUMNS[view].map(k=><td key={k}>{k==='kind'?<span tabIndex={0} data-help={`${T.inKindValue}: ${exactNumber(row.kind)}\n${GOOD_IDS.filter(g=>row.p.inKind[g]).map(g=>`${goodName(g)}: ${exactNumber(row.p.inKind[g]!*row.per)}`).join('\n')}`}><NumericValue value={row.kind} format="money"/></span>:k==='food'||k==='fulfillment'||k==='literacy'?<span data-help={`${names[k]}: ${exactNumber(row[k]*100)}%`} tabIndex={0}>{pct(row[k])}</span>:k==='growth'?<span className={row.growth<0?'neg':'pos'}>{row.growth.toFixed(2)}%</span>:<NumericValue value={Number(row[k])} format={k==='size'?'compact':k==='incomeEma'?'money':'one'}/>}</td>)}
 </tr>)}</tbody></table>{!rows.length&&<div className="muted">{T.noMatches}</div>}</>}</div>;
}

export const PopTable=memo(PopTableView);
