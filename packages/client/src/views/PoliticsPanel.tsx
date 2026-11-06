import {Select as UISelect,Button as UIButton} from '../ui/controls';
import {useMemo} from 'react';
import {IG_APPROVAL_CAP,VOTING_NAMES,interestGroups} from '@econ/sim';
import type {World} from '@econ/sim';
import {useNavigationState} from '../NavigationHistory';
import {NumericValue} from '../NumericValue';
import {exactNumber,pct} from '../format';
import {useLang,useT} from '../i18n';
import {Bar} from '../ui';

export function PoliticsPanel({world,kingdomId}:{world:World;kingdomId:number}){
 const T=useT(),P=T.political,lang=useLang();
 const [chosen,setChosen]=useNavigationState('politics:kingdom',kingdomId),[open,setOpen]=useNavigationState<string|null>('politics:group',null);
 const id=world.kingdoms.some(k=>k.id===chosen)?chosen:kingdomId;
 const data=useMemo(()=>interestGroups(world,id),[world,id]);
 const signed=(n:number)=>`${n>=0?'+':'−'}${Math.abs(n).toFixed(1)}`;
 return <section className="politics-panel">
  <div className="politics-context"><UISelect aria-label={T.system.kingdom} value={id} onChange={e=>{setChosen(Number(e.target.value));setOpen(null);}}>{world.kingdoms.map(k=><option key={k.id} value={k.id}>{lang==='ko'?k.name:k.nameEn}</option>)}</UISelect><span>{P.voting} <b>{VOTING_NAMES[data.votingLaw][lang]}</b></span></div>
  <div className="ig-columns ig-heading" aria-hidden="true"><span>{P.group}</span><span>{P.clout}</span><span>{P.approval}</span><span>{P.mood}</span><span>{P.members}</span></div>
  {data.groups.map(g=>{
   const name=lang==='ko'?g.name:g.nameEn,approval=Math.max(-1,Math.min(1,g.approval/IG_APPROVAL_CAP));
   return <article className="ig-entry" key={g.id}>
    <UIButton className="ig-columns ig-row" aria-expanded={open===g.id} onClick={()=>setOpen(open===g.id?null:g.id)} data-ig={g.id}>
     <strong title={name}>{name}</strong><span className="ig-clout"><Bar value={g.clout} label={`${P.clout} ${pct(g.clout)}`}/><b>{pct(g.clout)}</b>{g.status!=='influential'&&<small className={g.status==='powerful'?'accent':'muted'}>{P.status[g.status]}</small>}</span>
     <span data-help={`${P.approval}: ${exactNumber(g.approval)} / ±${IG_APPROVAL_CAP}`}><span className="ig-approval-bar" role="img" aria-label={`${P.approval} ${signed(g.approval)}`}><i style={{left:`${approval<0?50+approval*50:50}%`,width:`${Math.abs(approval)*50}%`,background:approval<0?'var(--bad)':'var(--good)'}}/></span><b className={g.approval<0?'neg':g.approval>0?'pos':''}>{signed(g.approval)}</b></span>
     <span className={`ig-mood ${g.mood}`}>{P.moods[g.mood]}</span><NumericValue value={g.members} format="compact"/>
    </UIButton>
    {open===g.id&&<div className="ig-details"><div className="system-facts">{(['stances','change','sol'] as const).map(key=><span key={key}>{P.parts[key]}<b>{signed(g.parts[key])}</b></span>)}{g.pending!==0&&<span>{P.pending}<b>{signed(g.pending)}</b></span>}</div><dl>{(['tax','invest','welfare','voting'] as const).map(key=><div key={key}><dt>{key==='voting'?P.voting:T.system[`${key}Law` as 'taxLaw'|'investLaw'|'welfareLaw']}</dt><dd>{signed(g.stance[key])}</dd></div>)}</dl></div>}
   </article>;
  })}
 </section>;
}
