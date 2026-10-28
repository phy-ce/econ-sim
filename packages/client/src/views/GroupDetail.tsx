
import {getMethod,isOwnerBuilding} from '@econ/sim';
import type {Building,GoodId,World} from '@econ/sim';
import {rowOf,BuildingControls} from './CompanyPanel';
import type {Game} from '../useGame';
import {NumericValue} from '../NumericValue';
import {GoodSprite} from '../sprites';
import {Bar,CLASS_COLOR} from '../ui';
import {className,goodName,methodName,regionName,useT} from '../i18n';
import {pct} from '../format';
import {aggregateRows} from '../groupRows';
import {summarizeBuildings} from '../buildingGroups';

export function GroupDetail({world,buildings,game,onGood,onOwner,showControls}:{world:World;buildings:Building[];game:Game;onGood:(g:GoodId)=>void;onOwner:(id:number)=>void;showControls:boolean}){
 const T=useT(),G=T.buildingGroups,S=T.system;
 const rows=buildings.map(b=>rowOf(world,b)),a=aggregateRows(rows),econ=summarizeBuildings(world,buildings).econ;
 const allOwner=buildings.length>0&&buildings.every(b=>isOwnerBuilding(b.typeId));
 const crown=buildings.find(b=>b.stateOwned&&world.companies.find(c=>c.id===b.companyId)?.isPlayer);
 const methods=[...new Set(buildings.map(b=>b.methodId))];
 return <div className="group-detail-ledger">
  <div className="system-tags">{methods.map(id=>{const b=buildings.find(b=>b.methodId===id)!;return <span key={id}>{methods.length>1?`${b.stateOwned?S.state:S.private} · `:''}{methodName(getMethod(b.typeId,id))}</span>;})}</div>
  {!allOwner&&<details><summary>{G.workforce} <NumericValue value={a.employed} format="compact"/> / <NumericValue value={a.jobs} format="compact"/></summary><div className="workforce-list">{a.staff.map(s=><div className="workforce-row" key={s.s}><span>{className(s.s)}</span><Bar value={s.jobs?s.emp/s.jobs:0} color={CLASS_COLOR[s.s]} label={className(s.s)}/><b><NumericValue value={s.emp} format="compact"/> / <NumericValue value={s.jobs} format="compact"/></b></div>)}</div></details>}
  {!allOwner&&<details><summary>{G.flows} · {G.coverage} {pct(a.inputFill)}</summary>{(['inputs','outputs'] as const).map(side=><div key={side}><h4>{side==='inputs'?G.inputs:G.outputs}</h4><table className="system-table"><tbody>{a[side].map(f=><tr key={f.g}><th><button className="entity-link" onClick={()=>onGood(f.g)}><GoodSprite g={f.g} size={20}/>{goodName(f.g)} ↗</button></th><td><NumericValue value={f.cur} format="compact"/> / <NumericValue value={f.max} format="compact"/><Bar value={f.max?f.cur/f.max:0} label={goodName(f.g)}/></td></tr>)}</tbody></table></div>)}</details>}
  {econ.owners.length>0&&<details><summary>{S.owner} · {S.dividend} <NumericValue value={econ.dividendsWeek} format="money"/></summary><table className="system-table"><thead><tr><th>{S.owner}</th><th>L / %</th><th>{S.dividend}</th></tr></thead><tbody>{econ.owners.map((o,i)=><tr key={i}><th>{o.ownerBuildingId!==undefined?<button className="entity-link" onClick={()=>onOwner(o.ownerBuildingId!)}>{S[o.owner]} ↗</button>:S[o.owner]}{o.regionId!==undefined&&<small>{regionName(world.regions.find(r=>r.id===o.regionId)!)}</small>}</th><td><NumericValue value={o.levels} format="compact"/> / {pct(o.share)}</td><td><NumericValue value={o.dividendWeek} format="money"/></td></tr>)}</tbody></table></details>}
  {showControls&&crown&&<details><summary>{G.controls} · {S.state} ×{crown.level}</summary><BuildingControls world={world} game={game} building={crown}/></details>}
 </div>;
}
