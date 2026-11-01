import type {Building,World} from '@econ/sim';
import {Bar} from '../ui';
import {NumericValue} from '../NumericValue';
import {useT} from '../i18n';
import type {Game} from '../useGame';
import './demolition.css';
export function DemolitionProgress({world,building:b,game}:{world:World;building:Building;game?:Game}){
 const T=useT(),pending=b.shrinking??0;if(!pending)return null;
 const days=7-world.tick%7;
 return <div className="demolition-progress" aria-label={T.demolitionQueue(pending)}>
 <strong><NumericValue value={b.level} format="compact"/> → <NumericValue value={Math.max(0,b.level-pending)} format="compact"/></strong>
 <div className="demolition-segments"><i style={{flex:Math.max(0,b.level-pending)}}/><i className="demolition-pending" style={{flex:Math.max(0,pending-1)}}/><i className="demolition-next" style={{flex:1,opacity:.25+.75*days/7}}/></div>
 <Bar value={1-days/7} tone="gold" label={T.demolitionQueue(pending)}/><span>{T.nDays(days)} · {T.nDays(days+(pending-1)*7)}</span>
 {game&&world.companies.find(c=>c.id===b.companyId)?.isPlayer&&<button onClick={()=>game.command({type:'cancelDemolish',buildingId:b.id})}>{T.cancelDemolition}</button>}
 </div>;
}
