import {useEffect,useState} from 'react';
import type {Company,World} from '@econ/sim';
import type {Game} from '../useGame';
import {useNavigationState} from '../NavigationHistory';
import {useT} from '../i18n';
import {FinancePanel} from './FinancePanel';
import {PolicyPanel} from './PolicyPanel';
export function StatePanel({game,world,me,onBuilding,onResearch,requestedTab,sequence,active=true}:{active?:boolean;game:Game;world:World;me:Company;onBuilding:(id:number)=>void;onResearch:(techId?:string)=>void;requestedTab?:'budget'|'laws';sequence:number}){
 const T=useT(),[tab,setTab]=useNavigationState<'budget'|'laws'>('state:tab',requestedTab??'budget');
 const [domain,setDomain]=useState<{kind:'welfare';sequence:number}|null>(null);
 useEffect(()=>{if(requestedTab)setTab(requestedTab);},[requestedTab,sequence]);
 return <><nav className="system-tabs"><button aria-pressed={tab==='budget'} onClick={()=>setTab('budget')}>{T.stateBudget}</button><button aria-pressed={tab==='laws'} onClick={()=>setTab('laws')}>{T.stateLaws}</button></nav>
 <div hidden={tab!=='budget'}><FinancePanel active={active&&tab==='budget'} game={game} world={world} me={me} onBuilding={onBuilding} onPolicies={()=>{setTab('laws');setDomain(d=>({kind:'welfare',sequence:(d?.sequence??0)+1}));}}/></div>
 <div hidden={tab!=='laws'}><PolicyPanel game={game} world={world} kingdomId={me.kingdomId} onResearch={onResearch} domainRequest={domain}/></div></>;
}
