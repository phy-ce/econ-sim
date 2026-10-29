import {useNavigationState} from '../NavigationHistory';
import {BookOpen} from 'lucide-react';
import { policyStatus, TUNE } from '@econ/sim';
import type { World, TaxLaw, InvestLaw, WelfareLaw } from '@econ/sim';
import type { Game } from '../useGame';
import { useT, techName } from '../i18n';
import { NumericValue } from '../NumericValue';
import { pct } from '../format';
import { Bar } from '../ui';
export function PolicyPanel({world,game,kingdomId,onResearch}:{world:World;game:Game;kingdomId:number;onResearch:()=>void}) {
 const T=useT(),S=T.system,st=policyStatus(world,kingdomId),k=world.kingdoms.find(k=>k.id===kingdomId)!;
 const [kind,setKind]=useNavigationState<'tax'|'invest'|'welfare'>('policy:kind','tax');
 const [choices,setChoices]=useNavigationState<Partial<Record<'tax'|'invest'|'welfare',string>>>('policy:choices',{});
 const status=st[kind],pending=status.pending;
 const selected=status.options.find(o=>o.id===choices[kind])??status.options.find(o=>o.id===status.current)!;
 const locked='unlocked' in selected&&!selected.unlocked;
 const names:Record<string,string>=S;
 const help:Record<string,string>=T.policyHelp;
 const entries={tax:'tax-laws',invest:'invest-law',welfare:'welfare'};
 const change=(kind:'tax'|'invest'|'welfare',law:string)=>kind==='tax'?game.command({type:'setTaxLaw',law:law as TaxLaw}):kind==='invest'?game.command({type:'setInvestLaw',law:law as InvestLaw}):game.command({type:'setWelfareLaw',law:law as WelfareLaw});
 return <div className="policy-desk">
  <nav className="policy-domains" aria-label={S.policies}>{(['tax','invest','welfare'] as const).map(id=><button key={id} aria-pressed={kind===id} onClick={()=>setKind(id)}><small>{S[id+'Law' as 'taxLaw'|'investLaw'|'welfareLaw']}</small><strong>{names[st[id].current]}</strong>{st[id].pending&&<span className="policy-pending-dot" data-help={`${S.transition}: ${names[st[id].pending!.to]}`} aria-label={S.transition}>◷</span>}</button>)}</nav>
  <div className="policy-context"><span tabIndex={0} data-help={S.conditionHelp}>{S.financeRatio} <b>{pct(st.financeRatio)}</b></span><span>{S.ownerTreasury} <b><NumericValue value={k.investmentPool} format="money"/></b></span></div>
  {pending&&<section className="policy-transition" aria-label={S.transition}><div><strong>{names[status.current]} → {names[pending.to]}</strong><span>{Math.max(0,pending.endTick-world.tick)} {S.days}</span><button onClick={()=>change(kind,status.current)}>{S.cancel}</button></div><Bar value={(world.tick-pending.startTick)/Math.max(1,pending.endTick-pending.startTick)} label={S.transition}/>{'pendingOk' in status&&status.pendingOk===false&&<small className="neg" tabIndex={0} data-help={S.conditionHelp}>{S.conditionLost}</small>}</section>}
  {kind!=='welfare'&&k.lawFail?.[kind]!==undefined&&<small className="neg">{S.failed} · {k.lawFail[kind]}</small>}
  <div className="policy-options" aria-label={S[kind+'Law' as 'taxLaw'|'investLaw'|'welfareLaw']}>{status.options.map(opt=>{const isLocked='unlocked' in opt&&!opt.unlocked;return <button key={opt.id} aria-pressed={selected.id===opt.id} data-help={help[opt.id]} onClick={()=>setChoices(prev=>({...prev,[kind]:opt.id}))}><span aria-hidden="true">{opt.id===status.current?'✓':opt.id===pending?.to?'◷':isLocked?'◇':'○'}</span><strong>{names[opt.id]}</strong><small>{opt.id===status.current?S.current:opt.id===pending?.to?S.transition:''}</small></button>;})}</div>
  <section className="policy-detail"><header><h3 tabIndex={0} className="help-text" data-help={help[selected.id]}>{names[selected.id]}</h3><a className="law-dictionary" href={`https://phy-ce.github.io/econ-sim/encyclopedia/#${entries[kind]}`} target="_blank" rel="noopener noreferrer" aria-label={`${names[selected.id]} · ${T.lawDictionary}`} data-help={T.lawDictionary}><BookOpen size={15}/></a></header>
   <dl>{'tech' in selected&&selected.tech&&<div><dt>{T.research}</dt><dd><button className="entity-link" onClick={onResearch}>{locked?'🔒 ': '✓ '}{techName(selected.tech)} ↗</button></dd></div>}{selected.threshold!==null&&<div><dt>{S.financeRatio}</dt><dd className={st.financeRatio<selected.threshold?'neg':''}>{pct(st.financeRatio)} / {pct(selected.threshold)}</dd></div>}{'weekly' in selected&&<div><dt>{S.week}</dt><dd><NumericValue value={selected.weekly} format="signedMoney"/></dd></div>}<div><dt>{S.transition}</dt><dd>{TUNE.lawDays} {S.days}</dd></div></dl>
   <div tabIndex={0} data-help={[help[selected.id],kind==='welfare'?'':S.conditionHelp,locked&&'tech' in selected&&selected.tech?techName(selected.tech):''].filter(Boolean).join('\n')}><button className="policy-enact" disabled={locked||!selected.eligible||selected.id===status.current||selected.id===pending?.to} onClick={()=>change(kind,selected.id)}>{selected.id===status.current?S.current:selected.id===pending?.to?S.transition:S.enact}</button></div>
  </section>
 </div>;
}
