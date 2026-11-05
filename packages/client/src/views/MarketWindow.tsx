import {t as uiCopy} from '../i18n';
import {SupplyDemandBar} from './SupplyDemand';
import {RegionTrade} from './RegionTrade';
import {marketSD,sdText} from '../supplyDemand';
import {SectionStack} from './SectionStack';
import {ResourceInspector} from './ResourceInspector';
import {SourceBreakdown} from './SourceBreakdown';
import {memo} from 'react';
import {useNavigationState} from '../NavigationHistory';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GOOD_IDS, GOODS, playerCompany,currentSD } from '@econ/sim';
import type { GoodId, HistoryPoint, World } from '@econ/sim';
import { Crosshair } from 'lucide-react';
import type { Game } from '../useGame';
import { marketOf, marketPriceHistory, scopeRegions, validMarketScope } from '../marketScope';
import type { MarketScope } from '../marketScope';
import { goodName, regionName, useLang, useT } from '../i18n';
import { NumericValue } from '../NumericValue';
import { GoodSprite } from '../sprites';
import { SortHeader } from './SortHeader';
import { PriceGauge } from './PriceGauge';
import { TimeChart } from './Chart';

export function useMarketScope(world:World|null) {
 const [stored,setStored]=useNavigationState<MarketScope>('views/MarketWindow.tsx:stored',()=>{try{return JSON.parse(localStorage.getItem('market-scope')??'"world"');}catch{return 'world';}});
 const scope=world?validMarketScope(stored,world):stored;
 useEffect(()=>{if(world){try{localStorage.setItem('market-scope',JSON.stringify(scope));}catch{/* session only */}}},[scope,world!==null]);
 return [scope,setStored] as const;
}
function MarketWindowView({world,game,scope,onScope,mapRegionId,history,good,onGood,onCompany,onBuildings}:{world:World;game:Game;scope:MarketScope;onScope:(s:MarketScope)=>void;mapRegionId:number;history:HistoryPoint[];good:GoodId;onGood:(g:GoodId)=>void;onCompany:(id:number)=>void;onBuildings:(regionId:number)=>void}) {
 const T=useT(),lang=useLang(),S=T.marketScope;
 const chips=useRef<HTMLDivElement>(null);
 const own=playerCompany(world)?.kingdomId;
 const regions=[...world.regions].sort((a,b)=>Number(b.kingdomId===own)-Number(a.kingdomId===own)||regionName(a).localeCompare(regionName(b),lang));
 const choices:MarketScope[]=['world','kingdom',...regions.map(r=>r.id)];
 const name=(s:MarketScope)=>s==='world'?S.world:s==='kingdom'?S.kingdom:regionName(world.regions.find(r=>r.id===s)!);
 const [resourceRequest,setResourceRequest]=useState<number|null>(null);
 const selectGood=(g:GoodId)=>{onGood(g);setResourceRequest(n=>(n??0)+1);};
 const [sort,setSort]=useNavigationState('views/MarketWindow.tsx:sort',{key:'volume',dir:-1});
 const market=marketOf(world,scope),members=scopeRegions(world,scope);
 const sdValue=(g:GoodId)=>typeof scope==='number'?currentSD(world,scope,g):marketSD(market[g]);
 const goods=useMemo(()=>[...GOOD_IDS].sort((a,b)=>{
  if(sort.key==='name')return goodName(a).localeCompare(goodName(b),lang)*sort.dir;
  const value=(g:GoodId)=>sort.key==='price'?market[g].price:sort.key==='ratio'?market[g].ratio:sort.key==='balance'||sort.key==='sd'?sdValue(g):market[g].price*(market[g].supplyEma+market[g].demandEma)/2;
  const av=value(a),bv=value(b);return av===null?(bv===null?0:1):bv===null?-1:(av-bv)*sort.dir;
 }),[world,scope,sort,lang]);
 const setSortKey=(key:string)=>setSort(s=>({key,dir:s.key===key?-s.dir:key==='name'?1:-1}));
 const prices=marketPriceHistory(history,members.map(r=>r.id),good);
 const priceSamples=prices.filter(p=>p.price!==undefined).length;
 const sumSources=(key:'demandByEma'|'supplyByEma')=>{const total:Record<string,number>={};for(const r of members)for(const [id,n] of Object.entries(r.market[good][key]??r.market[good][key==='demandByEma'?'demandBy':'supplyBy']??{}))total[id]=(total[id]??0)+n;return total;};
 const sourceMarket={inventory:market[good].inventory,demandByEma:sumSources('demandByEma'),supplyByEma:sumSources('supplyByEma')};

 return <div className="market-window">
  <div className="market-scope-toolbar"><div className="market-scope-chips" ref={chips} role="radiogroup" aria-label={S.scope}>
   {choices.map((s,i)=><button key={s} role="radio" aria-checked={scope===s} tabIndex={scope===s?0:-1} onClick={()=>onScope(s)} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?choices.length-1:(i+(e.key==='ArrowRight'?1:-1)+choices.length)%choices.length;onScope(choices[next]);const b=chips.current?.querySelectorAll<HTMLButtonElement>('button')[next];b?.focus();b?.scrollIntoView({block:'nearest',inline:'nearest'});}}>
    {typeof s==='number'&&<i style={{background:world.kingdoms.find(k=>k.id===regions.find(r=>r.id===s)?.kingdomId)?.color}}/>}{name(s)}
   </button>)}
  </div><button className="market-follow" aria-label={S.follow} data-help={S.follow} onClick={()=>onScope(mapRegionId)}><Crosshair size={15}/></button></div>
  <SectionStack explorer storageKey="market" revealId="resource" revealKey={resourceRequest} items={[
   {id:'prices',title:uiCopy().screenText['marketPrices'],height:174,content:<section className="market-ledger unified-market">
   <div className="table-scroll"><table className="goods"><thead><tr>{[['name',T.colGood],['price',T.colPrice],['ratio',T.colRatio],['sd',T.supplyDemandRatio],['volume',T.colValue]].map(([key,label])=><SortHeader key={key} label={label} active={sort.key===key} direction={sort.dir} onClick={()=>setSortKey(key)}/>)}</tr></thead><tbody>{goods.map(g=><tr key={g} className={good===g?'selected':''} tabIndex={0} aria-selected={good===g} onClick={()=>selectGood(g)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();selectGood(g);}}}><td><span className="good-name"><GoodSprite g={g} size={24}/>{goodName(g)}</span></td><td><NumericValue value={market[g].price} format="money"/></td><td><PriceGauge ratio={market[g].ratio}/></td><td><span className="market-sd"><span>{sdText(sdValue(g))}</span><SupplyDemandBar now={sdValue(g)} compact/></span></td><td><NumericValue value={market[g].price*(market[g].supplyEma+market[g].demandEma)/2} format="compactMoney"/></td></tr>)}</tbody></table></div>
   </section>},
   ...(typeof scope==='number'?[{id:'trade',title:T.tradeFlow,height:130,content:<RegionTrade region={members[0]}/>}]:[]),
   {id:'resource',shortTitle:uiCopy().screenText['goodDetails'],title:uiCopy().screenText['selectedGoodBuildings'],height:290,content:members[0]?<ResourceInspector key={`${scope}-${good}`} world={world} game={game} region={members[0]} scopeRegions={members} scopeMarket={market[good]} scopeLabel={name(scope)} good={good} onGood={selectGood} onCompany={onCompany}/>:<span>—</span>},
   {id:'sources',shortTitle:uiCopy().screenText['supplyDemand'],title:uiCopy().screenText['supplyAndDemand'],height:210,content:<SourceBreakdown good={good} m={sourceMarket}/>},
   {id:'history',title:uiCopy().screenText['priceHistory'],height:190,content:<div className="price-chart"><div className="card-head"><span className="good-name strong"><GoodSprite g={good}/>{T.priceTrend(goodName(good))}</span></div>{priceSamples<2?<p className="empty chart-empty" data-help={uiCopy().screenText['twoCompleteObservationsForTheSelectedRegions']} tabIndex={0}>{uiCopy().screenText['awaitingPriceHistory']}</p>:<TimeChart data={prices} series={[{key:'price',name:T.price,color:'var(--accent)'}]} format={v=>`ƒ${v.toFixed(2)}`} reference={{y:GOODS[good].basePrice,label:T.basePrice}} height={150}/>}<small data-help={uiCopy().screenText['historyUsesTheSimpleMeanOfRegional']} tabIndex={0}>{uiCopy().screenText['meanRegionalPrice']}</small></div>},
   {id:'regions',title:uiCopy().screenText['regionalPrices'],height:200,content:<>
   <table className="system-table"><thead><tr><th>{T.system.region}</th><th>{T.colPrice}</th><th>{T.colRatio}</th></tr></thead><tbody>{[...members].sort((a,b)=>b.market[good].price-a.market[good].price).map(r=><tr key={r.id}><th><button className="entity-link" onClick={()=>onScope(r.id)}>{regionName(r)} ↗</button></th><td><NumericValue value={r.market[good].price} format="money"/></td><td><PriceGauge ratio={r.market[good].price/GOODS[good].basePrice}/></td></tr>)}</tbody></table>
   </>}
  ]}/>

 </div>;
}

export const MarketWindow=memo(MarketWindowView);

