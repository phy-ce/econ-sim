import {Button as UIButton} from '../ui/controls';
import {LedgerTable as UITable} from '../ui/primitives';
import {buildingEcon,holdingsOf} from '@econ/sim';
import type {Building,World} from '@econ/sim';
import {buildingName,regionName,useT} from '../i18n';
import {NumericValue} from '../NumericValue';
import {shareLabel} from '../ownershipPortfolio';

export function ownerHoldings(world:World,owner:Building){
 return holdingsOf(world,owner).map(h=>{const e=buildingEcon(world,h.building);return {...h,profit:e.profitWeek*h.share,dividend:e.owners.filter(o=>o.ownerBuildingId===owner.id).reduce((n,o)=>n+o.dividendWeek,0)+(e.ownerless[owner.id]??0)};}).sort((a,b)=>b.profit-a.profit||a.building.id-b.building.id);
}
export function OwnerHoldings({world,owner,onBuilding}:{world:World;owner:Building;onBuilding:(id:number)=>void}){
 const T=useT(),rows=ownerHoldings(world,owner),totals=rows.reduce((n,h)=>({levels:n.levels+h.building.level*h.share,profit:n.profit+h.profit,dividend:n.dividend+h.dividend}),{levels:0,profit:0,dividend:0});
 return <><h4>{T.system.holdings} · {rows.length}</h4><UITable className="system-table owner-holdings"><colgroup><col style={{width:'40%'}}/><col style={{width:'20%'}}/><col style={{width:'20%'}}/><col style={{width:'20%'}}/></colgroup><thead><tr><th>{T.screenText.regionBuilding}</th><th>L / %</th><th>{T.system.weekProfit}</th><th>{T.system.dividend}</th></tr></thead><tbody>{rows.map(h=><tr key={h.building.id}><th><UIButton className="entity-link" onClick={()=>onBuilding(h.building.id)}>{regionName(world.regions.find(r=>r.id===h.building.regionId)!)} · {buildingName(h.building.typeId)} ↗</UIButton><small>{h.kind==='rent'?T.screenText.rent:T.screenText.shares}</small></th><td><NumericValue value={h.building.level*h.share} format="two"/><small>{shareLabel(h.share)}</small></td><td><NumericValue value={h.profit} format="signedMoney"/></td><td>{h.kind==='rent'?'—':<NumericValue value={h.dividend} format="money"/>}</td></tr>)}</tbody><tfoot><tr><th>{T.holdingsTotal}</th><td><NumericValue value={totals.levels} format="two"/></td><td><NumericValue value={totals.profit} format="signedMoney"/></td><td><NumericValue value={totals.dividend} format="money"/></td></tr></tfoot></UITable></>;
}
