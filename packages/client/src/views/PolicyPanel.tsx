import { policyStatus, ownershipAssets, TUNE } from '@econ/sim';
import type { World, TaxLaw, InvestLaw, WelfareLaw } from '@econ/sim';
import type { Game } from '../useGame';
import { useT, techName } from '../i18n';
import { NumericValue } from '../NumericValue';
import { pct } from '../format';
import { Bar } from '../ui';
export function PolicyPanel({world,game,kingdomId,onResearch}:{world:World;game:Game;kingdomId:number;onResearch:()=>void}) {
 const T=useT(),S=T.system,st=policyStatus(world,kingdomId),k=world.kingdoms.find(k=>k.id===kingdomId)!;
 const assets=ownershipAssets(world).kingdoms.find(k=>k.kingdomId===kingdomId);
 const names:Record<string,string>=S;
 const change=(kind:'tax'|'invest'|'welfare',law:string)=>kind==='tax'?game.command({type:'setTaxLaw',law:law as TaxLaw}):kind==='invest'?game.command({type:'setInvestLaw',law:law as InvestLaw}):game.command({type:'setWelfareLaw',law:law as WelfareLaw});
 return <div className="system-panel">
  <div className="system-facts"><span>{S.financeRatio}<b>{pct(st.financeRatio)}</b></span><span>{S.ownerTreasury}<b><NumericValue value={k.investmentPool} format="money"/></b></span></div>
  {assets&&<div className="ownership-split" role="img" aria-label={`${S.manor} ${pct(1-assets.ratio)} · ${S.finance} ${pct(assets.ratio)}`}><i style={{width:`${(1-assets.ratio)*100}%`,background:'#bd914b'}}/><i style={{width:`${assets.ratio*100}%`,background:'#4d8eaf'}}/></div>}
  {(['tax','invest','welfare'] as const).map(kind=>{const status=st[kind],pending=status.pending;return <section className="system-section" key={kind}><h3>{S[kind+'Law' as 'taxLaw'|'investLaw'|'welfareLaw']} <small>{names[status.current]}</small></h3>
   {pending&&<div className="law-progress"><span>{names[pending.to]} · {Math.max(0,pending.endTick-world.tick)} {S.days}</span><Bar value={(world.tick-pending.startTick)/Math.max(1,pending.endTick-pending.startTick)} label={S.transition}/>{'pendingOk' in status&&status.pendingOk===false&&<b className="neg" title={S.conditionHelp}>{S.conditionLost}</b>}<button onClick={()=>change(kind,status.current)}>{S.cancel}</button></div>}
   {kind!=='welfare'&&k.lawFail?.[kind]!==undefined&&<small className="neg">{S.failed} · {k.lawFail[kind]}</small>}
   {status.options.map(opt=>{const locked='unlocked' in opt&&!opt.unlocked;return <div className="law-row" key={opt.id}><div><strong>{names[opt.id]}</strong>{'tech' in opt&&opt.tech&&<button className="entity-link" onClick={onResearch}>{locked?'🔒 ':''}{techName(opt.tech)} ↗</button>}{opt.threshold!==null&&<small>{S.financeRatio} {pct(st.financeRatio)} / {pct(opt.threshold)}</small>}{'weekly' in opt&&<small><NumericValue value={opt.weekly} format="signedMoney"/> / {S.week}</small>}</div><button disabled={locked||!opt.eligible||opt.id===status.current||opt.id===pending?.to} aria-pressed={opt.id===status.current} title={`${TUNE.lawDays} ${S.days} · ${S.conditionHelp}`} onClick={()=>change(kind,opt.id)}>{opt.id===status.current?S.current:opt.id===pending?.to?S.transition:S.enact}</button></div>;})}
  </section>;})}
 </div>;
}
