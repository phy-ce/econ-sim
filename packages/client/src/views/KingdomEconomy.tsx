import {Button as UIButton} from '../ui/controls';
import {LedgerTable as UITable} from '../ui/primitives';
import type {GoodId,World} from '@econ/sim';
import '../kingdom-economy.css';
import {useNavigationState} from '../NavigationHistory';
import {useLang,useT} from '../i18n';
import {kingdomStats} from '../kingdomStats';
import {NumericValue} from '../NumericValue';
import {KingdomSummary} from './CompanyPanel';
import {KingdomBuildings} from './KingdomBuildings';
import {KingdomTrends} from './KingdomTrends';
import {SortHeader} from './SortHeader';
const colors={royal:'var(--royal-owner)',manor:'var(--manor-owner)',finance:'var(--finance-owner)',unassigned:'var(--unassigned-owner)'};
export function KingdomEconomy({world,id,onSelect,onBuilding,onFinance}:{world:World;id:number;onSelect:(id:number)=>void;onBuilding:(id:number)=>void;onFinance?:()=>void}){
 const T=useT(),ko=useLang()==='ko',data=kingdomStats(world,id);
 if(!data.government)return <span>—</span>;
 return <><nav className="system-tabs">{world.kingdoms.map((k,i)=><UIButton key={k.id} aria-pressed={id===k.id} onClick={()=>onSelect(k.id)}><span className="territory-marker" style={{color:k.color}}>{['●','◆','▲'][i]}</span>{ko?k.name:k.nameEn}{world.companies.find(c=>c.id===k.governmentId)?.isPlayer?' ★':''}</UIButton>)}</nav>
 <KingdomSummary world={world} government={data.government} onFinance={onFinance} includePrivate/>
 <KingdomTrends key={`trends-${id}`} world={world} id={id}/><KingdomBuildings key={id} world={world} id={id} onBuilding={onBuilding}/></>;
}
export function KingdomComparison({world,onSelect}:{world:World;onSelect:(id:number)=>void}){
 const T=useT(),ko=useLang()==='ko';
 const [sort,setSort]=useNavigationState('kingdom-comparison:sort','gdp'),[dir,setDir]=useNavigationState('kingdom-comparison:dir',-1);
 const columns=[['name',T.kingdomLabel],['treasury',T.treasury],['privateFunds',T.privateOwner],['levels',T.buildingGroups.levels],['profit',T.system.weekProfit],['gdp',T.annualGdp],['pool',T.investmentPool]];
 const rows=world.kingdoms.map(k=>kingdomStats(world,k.id)).sort((a,b)=>{const value=(r:typeof a)=>sort==='treasury'?r.treasury:sort==='privateFunds'?r.privateFunds:sort==='levels'?r.levels:sort==='profit'?r.profit:sort==='pool'?r.pool:r.gdp;return (sort==='name'?(ko?a.kingdom.name:a.kingdom.nameEn).localeCompare(ko?b.kingdom.name:b.kingdom.nameEn):value(a)-value(b))*dir;});
 return <div className="table-scroll"><UITable className="system-table kingdom-comparison"><thead><tr>{columns.map(([key,label])=><SortHeader key={key} label={label} active={sort===key} direction={dir} onClick={()=>{setSort(key);setDir(sort===key?-dir:-1);}}/>)}</tr></thead><tbody>{rows.map(r=><tr key={r.kingdom.id}><th><UIButton className="entity-link" onClick={()=>onSelect(r.kingdom.id)}><span className="territory-marker" style={{color:r.kingdom.color}}>{['●','◆','▲'][world.kingdoms.findIndex(k=>k.id===r.kingdom.id)]}</span>{ko?r.kingdom.name:r.kingdom.nameEn}{r.government?.isPlayer?' ★':''}</UIButton></th><td className={r.treasury<0?'neg':undefined}><NumericValue value={r.treasury} format="money"/></td><td className={r.privateFunds<0?'neg':undefined}><NumericValue value={r.privateFunds} format="money"/></td><td><NumericValue value={r.levels} format="compact"/><span style={{display:'flex',height:8,border:'1px solid var(--ink)',minWidth:48}}>{(Object.keys(colors) as (keyof typeof colors)[]).map(key=><i key={key} style={{flex:r.parts[key],background:colors[key]}} data-help={[{royal:T.stateOwner,manor:T.system.manor,finance:T.system.finance,unassigned:T.system.none}[key],r.parts[key].toFixed(2)].join(': ')}/>)}</span></td><td><NumericValue value={r.profit} format="signedMoney"/></td><td><NumericValue value={r.gdp} format="money"/></td><td><NumericValue value={r.pool} format="money"/></td></tr>)}</tbody></UITable></div>;
}
