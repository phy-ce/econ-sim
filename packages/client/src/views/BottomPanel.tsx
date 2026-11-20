import {withViewTransition} from '../ui/viewTransition';
import {memo,useEffect} from 'react';
import {playerCompany,type World} from '@econ/sim';
import {Segmented} from '../ui/components';
import {Button,Select} from '../ui/controls';
import {useNavigationState} from '../NavigationHistory';
import {useLang,useT} from '../i18n';
import {EconomyCharts} from './EconomyCharts';
import {KingdomComparison,KingdomEconomy} from './KingdomEconomy';
type Tab='economy'|'living'|'finance'|'comparison';
function BottomPanelView({world,kingdomId,sequence,onViewKingdom,onBuilding,onFinance}:{world:World;kingdomId:number|null;sequence?:number;onViewKingdom:(id:number)=>void;onBuilding:(id:number)=>void;onFinance?:()=>void}){
 const T=useT(),S=T.screenText,ko=useLang()==='ko';
 const [tab,setTab]=useNavigationState<Tab>('statistics:tab',kingdomId===null?'economy':'comparison');
 const [period,setPeriod]=useNavigationState('statistics:period',0);
 const [scope,setScope]=useNavigationState('statistics:kingdom','all');
 useEffect(()=>{if(kingdomId!==null)setTab('comparison');},[kingdomId,sequence]);
 const viewed=kingdomId??playerCompany(world)?.kingdomId??world.kingdoms[0]?.id;
 return <div className="statistics-window"><Segmented className="statistics-tabs" label={S.statisticsGroup} value={tab} onChange={v=>{if(v!==tab)withViewTransition(()=>setTab(v as Tab),'.window-trends .window-body');}} options={[{id:'economy',label:S.economy},{id:'living',label:S.living},{id:'finance',label:S.finance},{id:'comparison',label:T.kingdomCompare}]}/>
 {tab!=='comparison'&&<div className="statistics-toolbar"><div role="group" aria-label={S.period}>{[360,1800,0].map(p=><Button key={p} aria-pressed={p===period} onClick={()=>setPeriod(p)}>{p===0?S.all:p===360?S['1Year']:S['5Years']}</Button>)}</div><Select aria-label={T.kingdomLabel} value={scope} onChange={e=>setScope(e.target.value)}><option value="all">{S.all}</option>{world.kingdoms.map(k=><option key={k.id} value={k.id}>{ko?k.name:k.nameEn}</option>)}</Select></div>}
 {tab==='comparison'?<><section className="statistics-section"><h3>{T.kingdomCompare}</h3><KingdomComparison world={world} onSelect={onViewKingdom}/></section>{viewed!==undefined&&<section className="statistics-section"><h3>{T.kingdomEconomy}</h3><KingdomEconomy world={world} id={viewed} onSelect={onViewKingdom} onBuilding={onBuilding} onFinance={onFinance}/></section>}</>:<EconomyCharts world={world} group={tab} period={period} kingdomId={scope==='all'?undefined:Number(scope)}/>}
 </div>;
}
export const BottomPanel=memo(BottomPanelView);
