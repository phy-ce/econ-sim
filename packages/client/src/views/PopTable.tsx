import { useEffect, useMemo, useState } from 'react';
import { GOOD_IDS, POP_CLASSES, literacyOf, wealthOf } from '@econ/sim';
import type { Pop, PopClass, World } from '@econ/sim';
import { buildingName, className, goodName, regionName, useT } from '../i18n';
import { exactNumber, pct } from '../format';
import { NumericValue } from '../NumericValue';
import { SortHeader } from './SortHeader';
export interface PopRequest { regionId:number; prof:PopClass; sequence:number }
type Column='region'|'prof'|'work'|'size'|'wealth'|'sol'|'food'|'fulfillment'|'incomeEma'|'kind'|'literacy'|'growth';
/** 부·문해력은 100배로 저장된다 (sim wealthOf·literacyOf 로 읽는다) */
const popValue=(p:Pop,c:Exclude<Column,'region'|'prof'|'work'|'kind'>)=>c==='wealth'?wealthOf(p):c==='literacy'?literacyOf(p):p[c];
export function PopTable({world,request,onRegion,onBuilding}:{world:World;request?:PopRequest|null;onRegion:(id:number)=>void;onBuilding:(id:number)=>void}) {
 const T=useT();
 const [region,setRegion]=useState(0),[prof,setProf]=useState<PopClass|''>(''),[unemployed,setUnemployed]=useState(false);
 const [sort,setSort]=useState<Column>('size'),[direction,setDirection]=useState(-1);
 useEffect(()=>{if(request){setRegion(request.regionId);setProf(request.prof);setUnemployed(false);}},[request]);
 const buildings=useMemo(()=>new Map(world.buildings.map(b=>[b.id,b])),[world.buildings]);
 const regions=useMemo(()=>new Map(world.regions.map(r=>[r.id,r])),[world.regions]);
 const columns:[Column,string][]=[['region',T.popRegion],['prof',T.popProfession],['work',T.popWork],['size',T.popSize],['wealth',T.wealthLevel],['sol',T.standardOfLiving],['food',T.popFood],['fulfillment',T.popNeeds],['incomeEma',T.popIncome],['kind',T.popKind],['literacy',T.popLiteracy],['growth',T.popGrowth]];
 const rows=world.pops.filter(p=>(!region||p.regionId===region)&&(!prof||p.prof===prof)&&(!unemployed||p.work===0)).map(p=>{
  const r=regions.get(p.regionId)!,b=buildings.get(p.work);
  return {p,region:regionName(r),prof:className(p.prof),work:b?buildingName(b.typeId):T.unemployment,kind:GOOD_IDS.reduce((sum,g)=>sum+(p.inKind[g]??0)*r.market[g].price,0)};
 }).sort((a,b)=>{
  const av=sort==='region'||sort==='prof'||sort==='work'||sort==='kind'?a[sort]:popValue(a.p,sort);
  const bv=sort==='region'||sort==='prof'||sort==='work'||sort==='kind'?b[sort]:popValue(b.p,sort);
  return (typeof av==='string'?av.localeCompare(String(bv)):Number(av)-Number(bv))*direction||a.p.id-b.p.id;
 });
 return <div className="pop-directory"><div className="pop-filters"><select aria-label={T.popRegion} value={region} onChange={e=>setRegion(Number(e.target.value))}><option value={0}>{T.allRegions}</option>{world.regions.map(r=><option key={r.id} value={r.id}>{regionName(r)}</option>)}</select><select aria-label={T.popProfession} value={prof} onChange={e=>setProf(e.target.value as PopClass|'')}><option value="">{T.allProfessions}</option>{POP_CLASSES.map(c=><option key={c} value={c}>{className(c)}</option>)}</select><label><input type="checkbox" checked={unemployed} onChange={e=>setUnemployed(e.target.checked)}/>{T.unemployedOnly}</label><span className="muted">{rows.length}</span></div>
 <div className="pop-table-scroll"><table className="pop-table"><thead><tr>{columns.map(([key,label])=><SortHeader key={key} label={label} active={sort===key} direction={direction} onClick={()=>{setSort(key);setDirection(sort===key?-direction:['region','prof','work'].includes(key)?1:-1);}}/>)}</tr></thead><tbody>{rows.map(({p,region,prof,work,kind})=><tr key={p.id} className={p.work===0||p.food<.4?'pop-risk':''}><td><button className="entity-link" onClick={()=>onRegion(p.regionId)}>{region}</button></td><td>{prof}</td><td>{p.work&&buildings.has(p.work)?<button className="entity-link" onClick={()=>onBuilding(p.work)}>{work} ↗</button>:work}</td><td><NumericValue value={p.size} format="int"/></td><td><NumericValue value={wealthOf(p)} format="one"/></td><td><NumericValue value={p.sol} format="one"/></td><td>{pct(p.food)}</td><td>{pct(p.fulfillment)}</td><td><NumericValue value={p.incomeEma} format="money"/></td><td><span tabIndex={0} title={`${T.inKindValue}: ${exactNumber(kind)}\n${GOOD_IDS.filter(g=>p.inKind[g]).map(g=>`${goodName(g)}: ${exactNumber(p.inKind[g]!)}`).join('\n')}`}><NumericValue value={kind} format="money"/></span></td><td>{pct(literacyOf(p))}</td><td className={p.growth<0?'neg':'pos'}>{p.growth.toFixed(2)}%</td></tr>)}</tbody></table>{!rows.length&&<div className="muted">{T.noMatches}</div>}</div></div>;
}
