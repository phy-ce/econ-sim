import {isOwnerBuilding} from '@econ/sim';
import type {Pop,World} from '@econ/sim';
import {buildingName,regionName,useLang,useT} from '../i18n';
import {NumericValue} from '../NumericValue';

export function PopHoldings({world,pops}:{world:World;pops:Pop[]}){
 const T=useT(),ko=useLang()==='ko',units=new Map<number,number>();
 for(const p of pops)p.fund?.id.forEach((id,i)=>units.set(id,(units.get(id)??0)+p.fund!.u[i]));
 const holdings=world.buildings.filter(b=>isOwnerBuilding(b.typeId)&&(units.get(b.id)??0)>0);
 if(!holdings.length)return null;
 const home=world.regions.find(r=>r.id===pops[0]?.regionId)?.kingdomId;
 return <details className="pop-holdings"><summary>{T.system.holdings} · {holdings.length}</summary>
  <table className="system-table"><thead><tr><th>{T.buildings}</th><th>{T.ownerUnits}</th><th>{T.ownerHoldingValue}</th></tr></thead>
   <tbody>{holdings.map(b=>{const region=world.regions.find(r=>r.id===b.regionId),kingdom=world.kingdoms.find(k=>k.id===region?.kingdomId);return <tr key={b.id}>
    <th>{buildingName(b.typeId)} #{b.id}<small>{region?regionName(region):'—'}{kingdom&&kingdom.id!==home?` · ${ko?kingdom.name:kingdom.nameEn}`:''}</small></th>
    <td><NumericValue value={units.get(b.id)!} format="two"/></td><td>{b.nav===undefined?'—':<NumericValue value={units.get(b.id)!*b.nav} format="money"/>}</td>
   </tr>;})}</tbody>
  </table>
 </details>;
}
