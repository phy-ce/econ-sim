import {memo, useCallback} from 'react';
import {useNavigationState} from '../NavigationHistory';
import { useEffect, useMemo, useRef, useState } from 'react';
import { GOOD_IDS, GOODS, playerCompany } from '@econ/sim';
import type { GoodId, HistoryPoint, World } from '@econ/sim';
import { Crosshair } from 'lucide-react';
import type { Game } from '../useGame';
import { marketOf, scopeRegions, validMarketScope } from '../marketScope';
import type { MarketScope } from '../marketScope';
import { goodName, regionName, useLang, useT } from '../i18n';
import { NumericValue } from '../NumericValue';
import { GoodSprite } from '../sprites';
import { RegionPanel } from './RegionPanel';
import { SortHeader } from './SortHeader';
import { PriceGauge } from './PriceGauge';
import { TimeChart } from './Chart';
import { DetailWindow } from './DetailWindow';

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
 const [sort,setSort]=useNavigationState('views/MarketWindow.tsx:sort',{key:'volume',dir:-1});
 const market=marketOf(world,scope),members=scopeRegions(world,scope);
 const week=Math.floor(world.tick/7);
 const goods=useMemo(()=>[...GOOD_IDS].sort((a,b)=>{
  if(sort.key==='name')return goodName(a).localeCompare(goodName(b),lang)*sort.dir;
  const value=(g:GoodId)=>sort.key==='price'?market[g].price:sort.key==='ratio'?market[g].ratio:sort.key==='balance'?market[g].supplyEma-market[g].demandEma:market[g].price*market[g].volumeEma;
  return (value(a)-value(b))*sort.dir;
 }),[scope,week,sort,lang]);
 const setSortKey=(key:string)=>setSort(s=>({key,dir:s.key===key?-s.dir:key==='name'?1:-1}));
 const regional=typeof scope==='number'?world.regions.find(r=>r.id===scope):undefined;
 const onRegionalBuildings=useCallback(()=>{if(regional)onBuildings(regional.id);},[regional?.id,onBuildings]);
 const prices=scope==='world'?world.metrics.map(p=>({tick:p.tick,price:p.goods[good].ratio*GOODS[good].basePrice})):history.map(p=>({tick:p.tick,price:members.length?members.reduce((n,r)=>n+(p.prices[r.id]?.[good]??0),0)/members.length:0}));
 return <div className="market-window">
  <div className="market-scope-toolbar"><div className="market-scope-chips" ref={chips} role="radiogroup" aria-label={S.scope}>
   {choices.map((s,i)=><button key={s} role="radio" aria-checked={scope===s} tabIndex={scope===s?0:-1} onClick={()=>onScope(s)} onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const next=e.key==='Home'?0:e.key==='End'?choices.length-1:(i+(e.key==='ArrowRight'?1:-1)+choices.length)%choices.length;onScope(choices[next]);const b=chips.current?.querySelectorAll<HTMLButtonElement>('button')[next];b?.focus();b?.scrollIntoView({block:'nearest',inline:'nearest'});}}>
    {typeof s==='number'&&<i style={{background:world.kingdoms.find(k=>k.id===regions.find(r=>r.id===s)?.kingdomId)?.color}}/>}{name(s)}
   </button>)}
  </div><button className="market-follow" aria-label={S.follow} data-help={S.follow} onClick={()=>onScope(mapRegionId)}><Crosshair size={15}/></button></div>
  {regional?<RegionPanel game={game} mode="market" world={world} region={regional} history={history} selectedGood={good} onSelectGood={onGood} onViewCompany={onCompany} onViewBuildings={onRegionalBuildings}/>:<>
   <div className="market-aggregate-table"><table className="goods"><thead><tr>{[['name',T.colGood],['price',T.colPrice],['ratio',T.colRatio],['balance',T.colBalance],['volume',T.colValue]].map(([key,label])=><SortHeader key={key} label={label} active={sort.key===key} direction={sort.dir} onClick={()=>setSortKey(key)}/>)}</tr></thead><tbody>{goods.map(g=><tr key={g} className={good===g?'selected':''}><td><button className="entity-link" onClick={()=>onGood(g)}><GoodSprite g={g} size={24}/>{goodName(g)}</button></td><td><NumericValue value={market[g].price} format="money"/></td><td><PriceGauge ratio={market[g].ratio}/></td><td><NumericValue value={market[g].supplyEma} format="compact"/> / <NumericValue value={market[g].demandEma} format="compact"/></td><td><NumericValue value={market[g].price*market[g].volumeEma} format="compactMoney"/></td></tr>)}</tbody></table></div>
   <DetailWindow title={`${goodName(good)} · ${lang==='ko'?'지역별 가격 · 추이':'Regional prices · history'}`} summary={<NumericValue value={market[good].price} format="money"/>} help={lang==='ko'?'선택 상품의 지역별 가격과 가격 추이를 별도 창에서 비교합니다. 시세표는 그대로 유지됩니다.':'Compare regional prices and history in a separate detail window.'}>
   <table className="system-table"><thead><tr><th>{T.system.region}</th><th>{T.colPrice}</th><th>{T.colRatio}</th></tr></thead><tbody>{[...members].sort((a,b)=>b.market[good].price-a.market[good].price).map(r=><tr key={r.id}><th><button className="entity-link" onClick={()=>onScope(r.id)}>{regionName(r)} ↗</button></th><td><NumericValue value={r.market[good].price} format="money"/></td><td><PriceGauge ratio={r.market[good].price/GOODS[good].basePrice}/></td></tr>)}</tbody></table>
   <h3>{T.priceTrend(goodName(good))}</h3><TimeChart data={prices} series={[{key:'price',name:T.price,color:'var(--accent)'}]} height={170}/></DetailWindow>
  </>}
 </div>;
}

export const MarketWindow=memo(MarketWindowView);
