import { buildingEcon, BUILDING_BY_ID, holdingsOf, industryOf, INDUSTRIES, isOwnerBuilding, postCap } from '@econ/sim';
import type { World, Building } from '@econ/sim';
import type { Game } from '../useGame';
import { useT, useLang, buildingName, regionName } from '../i18n';
import { NumericValue } from '../NumericValue';
import { Bar } from '../ui';
import { pct } from '../format';
export function BuildingEconomics({world,building:b,game,onBuilding,compact=false}:{world:World;building:Building;game?:Game;onBuilding?:(id:number)=>void;compact?:boolean}) {
 const T=useT(),S=T.system,ko=useLang()==='ko',e=buildingEcon(world,b);
 const industry=industryOf(b.typeId,b.methodId),owner=world.companies.find(c=>c.id===b.companyId);
 const names={state:S.state,manor:S.manor,finance:S.finance};
 return <div className={`building-economics ${compact?'compact':''}`}>
  <div className="ownership-split" role="img" aria-label={e.owners.map(o=>`${names[o.owner]} ${pct(o.share)}`).join(' · ')||'—'}>{e.owners.map((o,i)=><i key={i} title={`${names[o.owner]} ${o.levels} · ${pct(o.share)}`} style={{width:`${o.share*100}%`,background:o.owner==='state'?'#bd6150':o.owner==='manor'?'#bd914b':'#4d8eaf'}}/>)}</div>
  <div className="econ-profit"><span>{S.weekProfit} <b className={e.profitWeek<0?'neg':'pos'}><NumericValue value={e.profitWeek} format="signedMoney"/></b></span><span data-help={S.perLevel}><NumericValue value={e.profitWeekPerLevel} format="signedMoney"/> / L</span></div>
  {e.hasReserve&&<div title={`${S.reserve}: ${e.reserve.toFixed(2)} / ${e.reserveCap.toFixed(2)}`}><Bar value={e.reserveCap?e.reserve/e.reserveCap:0} label={S.reserve}/></div>}
  {!compact&&<>
   {industry&&<span className="tag-soft">{ko?INDUSTRIES[industry].name:INDUSTRIES[industry].nameEn}</span>}
   <div className="cash-flow">{[[S.sales,e.day.sales],[S.inputs,-e.day.inputs],[S.wages,-e.day.wages],[S.profit,e.day.profit]].map(([name,value])=><div key={name}><span>{name} / {S.day}</span><b className={Number(value)<0?'neg':'pos'}><NumericValue value={Number(value)} format="signedMoney"/></b></div>)}</div>
   {e.hasReserve&&<p>{S.reserve} <NumericValue value={e.reserve} format="money"/> / <NumericValue value={e.reserveCap} format="money"/> · <NumericValue value={e.reserveWeek} format="signedMoney"/> / {S.week}</p>}
   {(isOwnerBuilding(b.typeId)||b.typeId==='trading_post')&&<p>{T.treasury} <NumericValue value={b.cash??0} format="money"/>{b.typeId==='trading_post'&&<> / <NumericValue value={postCap(b)} format="money"/><Bar value={(b.cash??0)/Math.max(1,postCap(b))} label={T.treasury}/></>}</p>}
   <table className="system-table"><thead><tr><th>{S.owner}</th><th>L / %</th><th>{S.dividend}</th></tr></thead><tbody>{e.owners.map((o,i)=><tr key={i}><th>{o.ownerBuildingId!==undefined?<button className="entity-link" onClick={()=>onBuilding?.(o.ownerBuildingId!)}>{names[o.owner]} ↗</button>:names[o.owner]}{o.regionId&&<small>{regionName(world.regions.find(r=>r.id===o.regionId)!)}</small>}</th><td>{o.levels} / {pct(o.share)}</td><td><NumericValue value={o.dividendWeek} format="money"/></td></tr>)}</tbody></table>
   {isOwnerBuilding(b.typeId)&&<details open><summary>{S.holdings}</summary><table className="system-table"><tbody>{holdingsOf(world,b).map(h=><tr key={h.building.id}><th><button className="entity-link" onClick={()=>onBuilding?.(h.building.id)}>{buildingName(h.building.typeId)} ↗</button><small>{regionName(world.regions.find(r=>r.id===h.building.regionId)!)}</small></th><td>{pct(h.share)} · <NumericValue value={h.building.level*h.share} format="one"/> L</td></tr>)}</tbody></table></details>}
   {game&&owner?.isPlayer&&b.stateOwned&&!BUILDING_BY_ID[b.typeId].auto&&!BUILDING_BY_ID[b.typeId].stateOnly&&<label className="check"><input type="checkbox" checked={!!b.privatize} onChange={ev=>game.command({type:'setPrivatize',buildingId:b.id,on:ev.target.checked})}/>{S.privatize}</label>}
  </>}
 </div>;
}
