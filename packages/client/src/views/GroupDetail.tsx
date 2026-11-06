import {Button as UIButton} from '../ui/controls';
import {LedgerTable as UITable} from '../ui/primitives';
import {officeFeeHelp} from '../officeFees';
import {WorkforceWage} from './WorkforceWage';
import {BuildingRoom} from './BuildingRoom';
import {DemolitionProgress} from './DemolitionProgress';
import {officeLoadFor} from '../officeLoad';
import {FlowRow} from './FlowRow';

import {KEEP_SHARE,getMethod,isOwnerBuilding,TUNE,officeLoad,companyById} from '@econ/sim';
import type {Building,GoodId,World} from '@econ/sim';
import {rowOf,BuildingControls} from './CompanyPanel';
import type {Game} from '../useGame';
import {NumericValue} from '../NumericValue';
import {GoodSprite} from '../sprites';
import {Bar,CLASS_COLOR,Waterfall} from '../ui';
import {className,goodName,methodName,regionName,useT} from '../i18n';
import {pct} from '../format';
import {aggregateRows} from '../groupRows';
import {summarizeBuildings} from '../buildingGroups';

export function GroupDetail({world,buildings,game,onGood,onOwner,showControls}:{world:World;buildings:Building[];game:Game;onGood:(g:GoodId)=>void;onOwner:(id:number)=>void;showControls:boolean}){
 const T=useT(),G=T.buildingGroups,S=T.system;
 const rows=buildings.map(b=>rowOf(world,b)),a=aggregateRows(rows),econ=summarizeBuildings(world,buildings).econ;
 const allOwner=buildings.length>0&&buildings.every(b=>isOwnerBuilding(b.typeId));
 const crown=buildings.find(b=>b.stateOwned&&world.companies.find(c=>c.id===b.companyId)?.isPlayer);
 const services=buildings.reduce((n,b)=>{const m=getMethod(b.typeId,b.methodId);return {tax:n.tax+(m.taxCapacity??0)*b.level*TUNE.adminScale,seats:n.seats+(m.seats??0)*b.level,points:n.points+b.last.points};},{tax:0,seats:0,points:0});
 const officeBuildings=buildings.filter(b=>getMethod(b.typeId,b.methodId).construction);
 const loadWeight=officeBuildings.reduce((n,b)=>n+b.level,0);
 const officeRate=loadWeight?officeBuildings.reduce((n,b)=>n+b.level*officeLoadFor(world,b),0)/loadWeight:0;
 const methods=[...new Set(buildings.map(b=>b.methodId))];
 return <div className="group-detail-ledger">
  {buildings[0]&&<BuildingRoom world={world} typeId={buildings[0].typeId} regionId={buildings[0].regionId}/>}
  <div className="system-tags">{methods.map(id=>{const b=buildings.find(b=>b.methodId===id)!;return <span key={id}>{methods.length>1?`${b.stateOwned?S.state:S.private} · `:''}{methodName(getMethod(b.typeId,id))}</span>;})}</div>
  {!allOwner&&<details><summary>{G.workforce} <NumericValue value={a.employed} format="compact"/> / <NumericValue value={a.jobs} format="compact"/></summary><div className="workforce-list workforce-with-wages">{a.staff.map(s=><div className="workforce-row" key={s.s}><span>{className(s.s)}</span><Bar value={s.jobs?s.emp/s.jobs:0} color={CLASS_COLOR[s.s]} label={className(s.s)}/><b><NumericValue value={s.emp} format="compact"/> / <NumericValue value={s.jobs} format="compact"/></b><WorkforceWage world={world} buildings={buildings} skill={s.s}/></div>)}</div></details>}
  {!allOwner&&buildings[0]&&<FlowRow world={world} typeId={buildings[0].typeId} methodId={buildings[0].methodId} regionId={buildings[0].regionId} levels={buildings.reduce((n,b)=>n+b.level,0)} onGood={onGood} summary={{...a,rev:econ.day.sales,raw:econ.day.inputs,wage:econ.day.wages,stopped:buildings.every(b=>!b.active||b.idle),...services,officeLoad:officeRate}}/>}
  {!allOwner&&<><div className="system-facts">{[[T.taxCapacity,services.tax],[T.schoolSeats,services.seats],[T.buildPts,services.points]].filter(([,v])=>Number(v)>0).map(([label,value])=><span key={label}>{label}<b><NumericValue value={Number(value)} format="compact"/></b></span>)}</div><details><summary>{T.balance} / {S.day}</summary><div data-help={officeBuildings.length?officeFeeHelp(officeBuildings[0].methodId,econ.day.fee):undefined} tabIndex={officeBuildings.length?0:undefined}><Waterfall rev={econ.day.sales} raw={econ.day.inputs} wage={econ.day.wages} labels={[officeBuildings.length?T.constructionFees:T.wfRev,T.wfRaw,T.wfWage,T.wfProfit]}/></div></details></>}
  {Object.keys(econ.ownerless).length>0&&<details><summary>{S.dividend} · —</summary><UITable className="system-table"><tbody>{Object.entries(econ.ownerless).map(([id,value])=><tr key={id}><th>{Number(id)>0?<UIButton className="entity-link" onClick={()=>onOwner(Number(id))}>#{id} ↗</UIButton>:'—'}</th><td><NumericValue value={value} format="money"/></td></tr>)}</tbody></UITable></details>}
  {econ.owners.length>0&&<details><summary>{S.owner} · {S.dividend} <NumericValue value={econ.dividendsWeek} format="money"/></summary><UITable className="system-table"><thead><tr><th>{S.owner}</th><th>L / %</th><th>{S.dividend}</th></tr></thead><tbody>{econ.owners.map((o,i)=><tr key={i}><th>{o.ownerBuildingId!==undefined?<UIButton className="entity-link" onClick={()=>onOwner(o.ownerBuildingId!)}>{S[o.owner]} ↗</UIButton>:S[o.owner]}{o.regionId!==undefined&&<small>{regionName(world.regions.find(r=>r.id===o.regionId)!)}</small>}</th><td><NumericValue value={o.levels} format="compact"/> / {pct(o.share)}</td><td tabIndex={0} data-help={o.owner==='state'?undefined:`${T.keepShare} ${pct(KEEP_SHARE[o.owner])}`}><NumericValue value={o.dividendWeek} format="money"/></td></tr>)}</tbody></UITable></details>}
  {buildings.filter(b=>(b.shrinking??0)>0).map(b=><section key={b.id}><strong>#{b.id}</strong><DemolitionProgress world={world} building={b} game={game}/></section>)}
  {showControls&&crown&&<details><summary>{G.controls} · {S.state} ×{crown.level}</summary><BuildingControls world={world} game={game} building={crown}/></details>}
 </div>;
}
