import {Segmented} from '../ui/components';
import {Button as UIButton} from '../ui/controls';
import {PoliticsPanel} from './PoliticsPanel';
import {ActiveContent} from './ActiveContent';
import {useEffect,useState} from 'react';
import type {Company,World} from '@econ/sim';
import type {Game} from '../useGame';
import {useNavigationState} from '../NavigationHistory';
import {useT} from '../i18n';
import {FinancePanel} from './FinancePanel';
import {PolicyPanel} from './PolicyPanel';
export function StatePanel({game,world,me,onBuilding,onResearch,requestedTab,sequence,active=true}:{active?:boolean;game:Game;world:World;me:Company;onBuilding:(id:number)=>void;onResearch:(techId?:string)=>void;requestedTab?:'budget'|'laws';sequence:number}){
 const T=useT(),[tab,setTab]=useNavigationState<'budget'|'laws'|'politics'>('state:tab',requestedTab??'budget');
 const [domain,setDomain]=useState<{kind:'welfare';sequence:number}|null>(null);
 useEffect(()=>{if(requestedTab)setTab(requestedTab);},[requestedTab,sequence]);
 return <><Segmented className="system-tabs" label={T.stateBudget} value={tab} onChange={value=>setTab(value as typeof tab)} options={[{id:'budget',label:T.stateBudget},{id:'laws',label:T.stateLaws},{id:'politics',label:T.politics}]}/>
 <div hidden={tab!=='budget'}><ActiveContent active={tab==='budget'}><FinancePanel active={active&&tab==='budget'} game={game} world={world} me={me} onBuilding={onBuilding} onPolicies={()=>{setTab('laws');setDomain(d=>({kind:'welfare',sequence:(d?.sequence??0)+1}));}}/></ActiveContent></div>
 <div hidden={tab!=='laws'}><ActiveContent active={tab==='laws'}><PolicyPanel game={game} world={world} kingdomId={me.kingdomId} onResearch={onResearch} domainRequest={domain}/></ActiveContent></div><div hidden={tab!=='politics'}><ActiveContent active={tab==='politics'}><PoliticsPanel world={world} kingdomId={me.kingdomId}/></ActiveContent></div></>;
}
