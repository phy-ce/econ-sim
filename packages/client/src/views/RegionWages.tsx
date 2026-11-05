import {useMemo} from 'react';
import {SKILLS,TUNE,regionUnemployment,subsistenceWage} from '@econ/sim';
import type {World,Region} from '@econ/sim';
import {className,useT} from '../i18n';
import {ClassSprite} from '../sprites';
import {NumericValue} from '../NumericValue';
import {Bar} from '../ui';
import {exactNumber,pct} from '../format';

export function RegionWages({world,region}:{world:World;region:Region}){
 const T=useT(),week=Math.floor(world.tick/7);
 // Tenant income is deliberately sampled weekly; regional wage columns stay live.
 const tenant=useMemo(()=>subsistenceWage(world,region),[world.seed,region.id,week]);
 if(!region.wages)return null;
 const amount=(n:number|undefined,formula?:string)=>n!==undefined&&Number.isFinite(n)?<NumericValue value={n} format="money" formula={formula}/>:'—';
 const kingdom=world.kingdoms.find(k=>k.id===region.kingdomId),government=world.companies.find(c=>c.id===kingdom?.governmentId);
 const relative=tenant>0?region.wages.unskilled/tenant:null;
 return <div className="region-wages">
  <div className="system-facts"><span tabIndex={0} data-help={`${T.labourerTenantRatio}: ${relative===null?'—':exactNumber(relative)}`}>
   {T.tenantIncomeHead}<b>{amount(tenant)}</b>
  </span></div>
  <table className="system-table regional-wage-table"><colgroup><col style={{width:'28%'}}/><col style={{width:'16%'}}/><col style={{width:'19%'}}/><col style={{width:'16%'}}/><col style={{width:'21%'}}/></colgroup>
   <thead><tr><th>{T.popProfession}</th><th>{T.marketWage}</th><th>{T.regionalWageAverage}</th><th>{T.regionalWageState}</th><th>{T.unemployment}</th></tr></thead>
   <tbody>{SKILLS.map(skill=>{const idle=regionUnemployment(world,region.id,skill),premium=government?.statePremium?.[region.id]?.[skill]??0;
    const formula=kingdom?`${T.marketWage} ƒ${exactNumber(region.wages![skill])} × ${T.stage} ${exactNumber(TUNE.govWageLevels[kingdom.budget.wages-1])}${premium>0?` × (1 + ${T.wagePremium} ${exactNumber(premium)})`:''}`:undefined;
    return <tr key={skill}>
    <th><span className="regional-wage-class"><ClassSprite c={skill} size={24}/><span>{className(skill)}</span></span></th>
    <td>{amount(region.wages![skill])}</td><td>{amount(region.wageAvg?.[skill])}</td><td>{amount(region.stateWages?.[skill],formula)}</td>
    <td><span className="regional-wage-idle"><span>{pct(idle)}</span><Bar value={idle} tone="neg" size="sm" label={T.unemployment}/></span></td>
   </tr>;})}</tbody>
  </table>
 </div>;
}
