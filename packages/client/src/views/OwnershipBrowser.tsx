import {BuildingPops} from './BuildingPops';
import {OwnerSummary} from './OwnerSummary';
import {useState,type ReactNode} from 'react';
import {holdingsOf,buildingEcon,isOwnerBuilding} from '@econ/sim';
import type {World} from '@econ/sim';
import {buildingName,regionName,className,useLang} from '../i18n';
import {NumericValue} from '../NumericValue';
import {BuildingSprite} from '../sprites';
import {shareLabel,ownershipPeople} from '../ownershipPortfolio';
export {shareLabel} from '../ownershipPortfolio';
export type OwnershipPage=number|null|{pop:number}|{region:number};
export function OwnershipBrowser({world,children,initialPage=null}:{world:World;initialPage?:OwnershipPage;children:(go:(id:number)=>void)=>ReactNode}){
 const ko=useLang()==='ko',[nav,setNav]=useState<{pages:OwnershipPage[];at:number}>({pages:[initialPage],at:0});
 const go=(id:number)=>setNav(n=>n.pages[n.at]===id?n:{pages:[...n.pages.slice(0,n.at+1),id],at:n.at+1});
 const visit=(page:{pop:number}|{region:number})=>setNav(n=>({pages:[...n.pages.slice(0,n.at+1),page],at:n.at+1}));
 const page=nav.pages[nav.at],pop=typeof page==='object'&&page!==null&&'pop' in page?world.pops.find(p=>p.id===page.pop):undefined;
 const area=typeof page==='object'&&page!==null&&'region' in page?world.regions.find(r=>r.id===page.region):undefined;
 const id=typeof page==='number'?page:null,b=world.buildings.find(x=>x.id===id),region=b&&world.regions.find(x=>x.id===b.regionId);
 const holdings=b&&isOwnerBuilding(b.typeId)?holdingsOf(world,b):[];
 const finance=b?.typeId==='finance';
 const people=b?ownershipPeople(world,b):[];
 const total=people.reduce((n,x)=>n+x.weight,0),econ=b?buildingEcon(world,b):null;
 return <div className="ownership-browser"><nav aria-label={ko?'소유권 탐색':'Ownership navigation'}><button aria-label={ko?'소유권 뒤로':'Ownership back'} disabled={nav.at===0} onClick={()=>setNav(n=>({...n,at:n.at-1}))}>←</button><button aria-label={ko?'소유권 앞으로':'Ownership forward'} disabled={nav.at===nav.pages.length-1} onClick={()=>setNav(n=>({...n,at:n.at+1}))}>→</button><span>{typeof page==='object'&&page!==null?(pop?className(pop.prof):area?regionName(area):'—'):id===null?(ko?'소유주 목록':'Owners'):b?`${buildingName(b.typeId)} #${b.id}`:'—'}</span></nav>
 {typeof page==='object'&&page!==null?('pop' in page?pop?<>
 <h3>{className(pop.prof)} #{pop.id}</h3>
 <div className="pop-relations"><button onClick={()=>visit({region:pop.regionId})}>{ko?'거주지':'Home'} · {regionName(world.regions.find(r=>r.id===pop.regionId)!)} ↗</button>
 {world.buildings.some(b=>b.id===pop.work)?<button onClick={()=>go(pop.work)}>{ko?'고용처':'Workplace'} · {buildingName(world.buildings.find(b=>b.id===pop.work)!.typeId)} #{pop.work} ↗</button>:<span>{ko?'실업':'Unemployed'}</span>}</div>
 <BuildingPops key={pop.id} world={world} buildings={[]} popIds={[pop.id]} onGood={()=>{}}/>
 </>:<p>{ko?'이 팝은 이동 또는 병합되어 더 이상 존재하지 않습니다.':'This pop has moved or merged and no longer exists.'}</p>:area?<>
 <h3>{regionName(area)}</h3><table className="system-table"><tbody>{world.buildings.filter(b=>b.regionId===area.id).map(b=><tr key={b.id}><th><button className="entity-link" onClick={()=>go(b.id)}>{buildingName(b.typeId)} #{b.id} ↗</button></th><td>L {b.level}</td></tr>)}</tbody></table>
 </>:<p>{ko?'지역 없음':'Region unavailable'}</p>):id===null?children(go):!b?<p>{ko?'이 건물은 더 이상 존재하지 않습니다.':'This building no longer exists.'}</p>:<>
 <h3><BuildingSprite typeId={b.typeId} size={28}/>{region?regionName(region):''} · {buildingName(b.typeId)} #{b.id}</h3>
 {isOwnerBuilding(b.typeId)?<OwnerSummary buildings={[b]}/>:<div className="explorer-facts"><span>{ko?'레벨':'Levels'}<b>{b.level}</b></span>{isOwnerBuilding(b.typeId)&&<span>{ko?'금고':'Treasury'}<b><NumericValue value={b.cash??0} format="money"/></b></span>}<span>{ko?'주간 수입 / 이익':'Weekly income / profit'}<b><NumericValue value={econ!.profitWeek} format="signedMoney"/></b></span></div>}
 {isOwnerBuilding(b.typeId)?<>
 <h4>{ko?'보유 건물':'Holdings'} · {holdings.length}</h4><table className="system-table"><thead><tr><th>{ko?'지역 · 건물':'Region · building'}</th><th>{ko?'관계':'Relation'}</th><th>L / %</th></tr></thead><tbody>{holdings.map(h=><tr key={h.building.id}><th><button className="entity-link" onClick={()=>go(h.building.id)}>{regionName(world.regions.find(r=>r.id===h.building.regionId)!)} · {buildingName(h.building.typeId)} ↗</button></th><td>{h.kind==='rent'?(ko?'지대':'Rent'):(ko?'지분':'Shares')}</td><td><NumericValue value={h.building.level*h.share} format="compact"/> / {shareLabel(h.share)}</td></tr>)}</tbody></table>{!holdings.length&&<p>{ko?'보유 건물 없음':'No holdings'}</p>}
 <h4>{finance?(ko?'투자자 구성':'Investors'):(ko?'귀족 구성':'Nobles')}</h4>
 <table className="system-table"><thead><tr><th>{ko?'지역 · 계층':'Region · class'}</th><th>{ko?'인구':'Population'}</th><th><span tabIndex={0} className="help-text" data-help={finance?(ko?'해당 금융가의 실제 보유 지분 수 비율입니다. 직원 인구와는 다릅니다.':'Share of units in this fund, not staff population.'):(ko?'배분 비중 = 인구 × 직종별 배당 가중치. 토지 투자 지분이 아닙니다.':'Distribution weight = population × class weight; not land investment shares.')}>{finance?(ko?'지분 / 비율':'Units / share'):(ko?'배분 비중':'Distribution share')}</span></th></tr></thead><tbody>{people.map(({p,weight})=><tr key={p.id}><th><button className="entity-link" onClick={()=>visit({pop:p.id})}>{regionName(world.regions.find(r=>r.id===p.regionId)!)} · {className(p.prof)} <small>#{p.id}</small> ↗</button></th><td><NumericValue value={p.size} format="compact"/></td><td>{finance&&<><NumericValue value={weight} format="compact"/> / </>}{shareLabel(total?weight/total:0)}</td></tr>)}</tbody></table>{!people.length&&<p>{ko?'등록된 수령자 없음':'No registered recipients'}</p>}
 {finance&&<><h4 data-help={ko?'실제 고용처가 이 금융가인 팝입니다. 인구는 부양가족을 포함합니다.':'Pops employed by this fund. Population includes dependants.'} tabIndex={0}>{ko?'직원 구성':'Staff'}</h4><table className="system-table"><tbody>{world.pops.filter(p=>p.work===b.id&&p.size>0).map(p=><tr key={p.id}><th><button className="entity-link" onClick={()=>visit({pop:p.id})}>{className(p.prof)} #{p.id} ↗</button></th><td><NumericValue value={p.size} format="compact"/></td></tr>)}</tbody></table></>}
 </>:<><h4>{ko?'소유 기관':'Ownership institutions'}</h4>{econ!.owners.map((o,i)=><div key={i}>{o.ownerBuildingId!==undefined?<button className="entity-link" onClick={()=>go(o.ownerBuildingId!)}>{o.owner==='manor'?(ko?'저택':'Manor'):(ko?'금융가':'Finance')} #{o.ownerBuildingId} ↗</button>:<span>{ko?'왕실':'Crown'}</span>} · {shareLabel(o.share)}</div>)}{b.typeId==='subsistence'&&world.buildings.filter(x=>x.regionId===b.regionId&&x.typeId==='manor').map(x=><button key={x.id} className="entity-link" onClick={()=>go(x.id)}>{ko?'저택 · 지대 관계':'Manor · rent'} #{x.id} ↗</button>)}</>}
 </>}
 </div>;
}
