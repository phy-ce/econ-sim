import {Button as UIButton} from '../ui/controls';
import {LedgerTable as UITable} from '../ui/primitives';
import {OwnerHoldings} from './OwnerHoldings';
import {t as uiCopy} from '../i18n';
import {BuildingPops} from './BuildingPops';
import {OwnerSummary} from './OwnerSummary';
import {useState,type ReactNode} from 'react';
import {buildingEcon,isOwnerBuilding} from '@econ/sim';
import type {World} from '@econ/sim';
import {buildingName,regionName,className,useLang,useT} from '../i18n';
import {NumericValue} from '../NumericValue';
import {BuildingSprite} from '../sprites';
import {shareLabel,ownershipPeople,usesOwnerUnits,ownerUnitStats} from '../ownershipPortfolio';
export {shareLabel} from '../ownershipPortfolio';
export type OwnershipPage=number|null|{pop:number}|{region:number};
export function OwnershipBrowser({world,children,initialPage=null}:{world:World;initialPage?:OwnershipPage;children:(go:(id:number)=>void)=>ReactNode}){
 const T=useT(),ko=useLang()==='ko',[nav,setNav]=useState<{pages:OwnershipPage[];at:number}>({pages:[initialPage],at:0});
 const go=(id:number)=>setNav(n=>n.pages[n.at]===id?n:{pages:[...n.pages.slice(0,n.at+1),id],at:n.at+1});
 const visit=(page:{pop:number}|{region:number})=>setNav(n=>({pages:[...n.pages.slice(0,n.at+1),page],at:n.at+1}));
 const page=nav.pages[nav.at],pop=typeof page==='object'&&page!==null&&'pop' in page?world.pops.find(p=>p.id===page.pop):undefined;
 const area=typeof page==='object'&&page!==null&&'region' in page?world.regions.find(r=>r.id===page.region):undefined;
 const id=typeof page==='number'?page:null,b=world.buildings.find(x=>x.id===id),region=b&&world.regions.find(x=>x.id===b.regionId);
 const finance=b?.typeId==='finance';
 const unitBased=b?usesOwnerUnits(b):false,unitStats=b&&unitBased?ownerUnitStats(world,b):null;
 const people=b?ownershipPeople(world,b):[];
 const total=people.reduce((n,x)=>n+x.weight,0),econ=b?buildingEcon(world,b):null;
 return <div className="ownership-browser"><nav aria-label={uiCopy().screenText['ownershipNavigation']}><UIButton aria-label={uiCopy().screenText['ownershipBack']} disabled={nav.at===0} onClick={()=>setNav(n=>({...n,at:n.at-1}))} data-help={uiCopy().screenText['ownershipBack']}>←</UIButton><UIButton aria-label={uiCopy().screenText['ownershipForward']} disabled={nav.at===nav.pages.length-1} onClick={()=>setNav(n=>({...n,at:n.at+1}))} data-help={uiCopy().screenText['ownershipForward']}>→</UIButton><span>{typeof page==='object'&&page!==null?(pop?className(pop.prof):area?regionName(area):'—'):id===null?(uiCopy().screenText['owners']):b?`${buildingName(b.typeId)} #${b.id}`:'—'}</span></nav>
 {typeof page==='object'&&page!==null?('pop' in page?pop?<>
 <h3>{className(pop.prof)} #{pop.id}</h3>
 <div className="pop-relations"><UIButton onClick={()=>visit({region:pop.regionId})}>{uiCopy().screenText['home']} · {regionName(world.regions.find(r=>r.id===pop.regionId)!)} ↗</UIButton>
 {world.buildings.some(b=>b.id===pop.work)?<UIButton onClick={()=>go(pop.work)}>{uiCopy().screenText['workplace']} · {buildingName(world.buildings.find(b=>b.id===pop.work)!.typeId)} #{pop.work} ↗</UIButton>:<span>{uiCopy().screenText['unemployed']}</span>}</div>
 <BuildingPops key={pop.id} world={world} buildings={[]} popIds={[pop.id]} onGood={()=>{}}/>
 </>:<p>{uiCopy().screenText['thisPopHasMovedOrMergedAnd']}</p>:area?<>
 <h3>{regionName(area)}</h3><UITable className="system-table"><tbody>{world.buildings.filter(b=>b.regionId===area.id).map(b=><tr key={b.id}><th><UIButton className="entity-link" onClick={()=>go(b.id)}>{buildingName(b.typeId)} #{b.id} ↗</UIButton></th><td>L {b.level}</td></tr>)}</tbody></UITable>
 </>:<p>{uiCopy().screenText['regionUnavailable']}</p>):id===null?children(go):!b?<p>{uiCopy().screenText['thisBuildingNoLongerExists']}</p>:<>
 <h3><BuildingSprite typeId={b.typeId} size={28}/>{region?regionName(region):''} · {buildingName(b.typeId)} #{b.id}</h3>
 {isOwnerBuilding(b.typeId)?<OwnerSummary buildings={[b]}/>:<div className="explorer-facts"><span>{uiCopy().screenText['levels']}<b>{b.level}</b></span>{isOwnerBuilding(b.typeId)&&<span>{uiCopy().screenText['treasury']}<b><NumericValue value={b.cash??0} format="money"/></b></span>}<span>{uiCopy().screenText['weeklyIncomeProfit']}<b><NumericValue value={econ!.profitWeek} format="signedMoney"/></b></span></div>}
 {isOwnerBuilding(b.typeId)?<>
 {unitStats&&<div className="explorer-facts"><span>{T.ownerUnits}<b><NumericValue value={unitStats.units} format="two"/></b></span><span>{T.ownerUnitValue}<b>{unitStats.nav===undefined?'—':<NumericValue value={unitStats.nav} format="money"/>}</b></span><span>{T.ownerUnitWeekly}<b><NumericValue value={unitStats.weekly} format="money"/></b></span><span>{T.ownerUnitYield}<b>{unitStats.yield===null?'—':shareLabel(unitStats.yield)}</b></span></div>}
 <OwnerHoldings world={world} owner={b} onBuilding={go}/>
 <h4>{unitBased?(uiCopy().screenText['investors']):(uiCopy().screenText['nobles'])}</h4>
 <UITable className="system-table"><thead><tr><th>{uiCopy().screenText['regionClass']}</th><th>{uiCopy().screenText['population']}</th><th><span tabIndex={0} className="help-text" data-help={unitBased?(uiCopy().screenText['shareOfUnitsInThisFundNot']):(uiCopy().screenText['distributionWeightPopulationClassWeightNotLand'])}>{unitBased?(uiCopy().screenText['unitsShare']):(uiCopy().screenText['distributionShare'])}</span></th></tr></thead><tbody>{people.map(({p,weight})=><tr key={p.id}><th><UIButton className="entity-link" onClick={()=>visit({pop:p.id})}>{regionName(world.regions.find(r=>r.id===p.regionId)!)} · {className(p.prof)} <small>#{p.id}</small> ↗</UIButton></th><td><NumericValue value={p.size} format="compact"/></td><td>{unitBased&&<>{weight<.005?'<0.01':<NumericValue value={weight} format="two"/>} / </>}{shareLabel(total?weight/total:0)}</td></tr>)}</tbody></UITable>{!people.length&&<p>{uiCopy().screenText['noRegisteredRecipients']}</p>}
 {finance&&<><h4 data-help={uiCopy().screenText['popsEmployedByThisFundPopulationIncludes']} tabIndex={0}>{uiCopy().screenText['staff']}</h4><UITable className="system-table"><tbody>{world.pops.filter(p=>p.work===b.id&&p.size>0).map(p=><tr key={p.id}><th><UIButton className="entity-link" onClick={()=>visit({pop:p.id})}>{className(p.prof)} #{p.id} ↗</UIButton></th><td><NumericValue value={p.size} format="compact"/></td></tr>)}</tbody></UITable></>}
 </>:<><h4>{uiCopy().screenText['ownershipInstitutions']}</h4>{econ!.owners.map((o,i)=><div key={i}>{o.ownerBuildingId!==undefined?<UIButton className="entity-link" onClick={()=>go(o.ownerBuildingId!)}>{o.owner==='manor'?(uiCopy().screenText['manor']):(uiCopy().screenText['finance119'])} #{o.ownerBuildingId} ↗</UIButton>:<span>{uiCopy().screenText['crown']}</span>} · {shareLabel(o.share)}</div>)}{b.typeId==='subsistence'&&world.buildings.filter(x=>x.regionId===b.regionId&&x.typeId==='manor').map(x=><UIButton key={x.id} className="entity-link" onClick={()=>go(x.id)}>{uiCopy().screenText['manorRent']} #{x.id} ↗</UIButton>)}</>}
 </>}
 </div>;
}
