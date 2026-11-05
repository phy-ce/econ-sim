import {useMemo} from 'react';
import {SKILLS,TUNE,marketWageTargets,regionUnemployment,subsistenceWage} from '@econ/sim';
import {ArrowDown,ArrowUp} from 'lucide-react';
import {wageDirection} from '../wageDirection';
import type {World,Region} from '@econ/sim';
import {className,useT} from '../i18n';
import {ClassSprite} from '../sprites';
import {NumericValue} from '../NumericValue';
import {Bar} from '../ui';
import {compact,exactNumber,pct} from '../format';

export function RegionWages({world,region}:{world:World;region:Region}){
 const T=useT(),week=Math.floor(world.tick/7);
 // Tenant income is deliberately sampled weekly; regional wage columns stay live.
 const tenant=useMemo(()=>subsistenceWage(world,region),[world.seed,region.id,week]);
 const targets=useMemo(()=>marketWageTargets(world,region.id),[world.seed,region.id,week]);
 if(!region.wages)return null;
 const amount=(n:number|undefined,formula?:string)=>n!==undefined&&Number.isFinite(n)?<NumericValue value={n} format="money" formula={formula}/>:'—';
 const kingdom=world.kingdoms.find(k=>k.id===region.kingdomId),government=world.companies.find(c=>c.id===kingdom?.governmentId);
 const relative=tenant>0?region.wages.unskilled/tenant:null;
 return <div className="region-wages">
  <div className="system-facts"><span tabIndex={0} data-help={`${T.labourerTenantRatio}: ${relative===null?'—':exactNumber(relative)}`}>
   {T.tenantIncomeHead}<b>{amount(tenant)}</b>
  </span></div>
  <table className="system-table regional-wage-table"><colgroup><col style={{width:'28%'}}/><col style={{width:'20%'}}/><col style={{width:'17%'}}/><col style={{width:'15%'}}/><col style={{width:'20%'}}/></colgroup>
   <thead><tr><th>{T.popProfession}</th><th>{T.marketWage}</th><th>{T.regionalWageAverage}</th><th>{T.regionalWageState}</th><th>{T.unemployment}</th></tr></thead>
   <tbody>{SKILLS.map(skill=>{const idle=regionUnemployment(world,region.id,skill),premium=government?.statePremium?.[region.id]?.[skill]??0;
    const formula=kingdom?`${T.marketWage} ƒ${exactNumber(region.wages![skill])} × ${T.stage} ${exactNumber(TUNE.govWageLevels[kingdom.budget.wages-1])}${premium>0?` × (1 + ${T.wagePremium} ${exactNumber(premium)})`:''}`:undefined;
    const target=targets?.[skill],direction=target?wageDirection(region.wages![skill],target.target):null,Arrow=direction==='up'?ArrowUp:ArrowDown;
    const targetHelp=target?`${T.wageTarget} ƒ${exactNumber(target.target)} · ${T.wageLowEnd} ƒ${exactNumber(target.lo)} · ${T.wageHighEnd} ƒ${exactNumber(target.hi)} · ${T.wageJobs} ${compact(target.jobs)} · ${T.wageWilling} ${compact(target.willing)}`:undefined;
    return <tr key={skill}>
    <th><span className="regional-wage-class"><ClassSprite c={skill} size={24}/><span>{className(skill)}</span></span></th>
    <td><span className="regional-market-pay">{amount(region.wages![skill],targetHelp)}{direction&&<Arrow size={14} aria-hidden="true" data-direction={direction}/>}</span></td><td>{amount(region.wageAvg?.[skill])}</td><td>{amount(region.stateWages?.[skill],formula)}</td>
    <td><span className="regional-wage-idle"><span>{pct(idle)}</span><Bar value={idle} tone="neg" size="sm" label={T.unemployment}/></span></td>
   </tr>;})}</tbody>
  </table>
 </div>;
}
