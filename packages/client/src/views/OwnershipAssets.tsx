import {useEffect} from 'react';
import {ownershipAssets,playerCompany} from '@econ/sim';
import type {World} from '@econ/sim';
import {useNavigationState} from '../NavigationHistory';
import {regionName,useLang,useT} from '../i18n';
import {NumericValue} from '../NumericValue';
import {TimeChart} from './Chart';
import {pct,exactNumber} from '../format';
import '../ownership-theme.css';
export function OwnershipAssets({world}:{world:World}){
 const T=useT(),ko=useLang()==='ko',assets=ownershipAssets(world),own=playerCompany(world)?.kingdomId;
 const [scope,setScope]=useNavigationState<'kingdom'|'region'>('trends:asset-scope',()=>{try{return localStorage.getItem('trends-assets-scope')==='region'?'region':'kingdom';}catch{return 'kingdom';}});
 useEffect(()=>{try{localStorage.setItem('trends-assets-scope',scope);}catch{}},[scope]);
 const rows=(scope==='kingdom'?assets.kingdoms:assets.regions).slice().sort((a,b)=>Number(b.kingdomId===own)-Number(a.kingdomId===own)||a.kingdomId-b.kingdomId);
 const history=world.metrics.map(p=>{const row:Record<string,number>={tick:p.tick};for(const k of world.kingdoms){const m=p.kingdoms[k.id];if(m&&m.assetsManor+m.assetsFinance>0)row[String(k.id)]=m.assetsFinance/(m.assetsManor+m.assetsFinance);}return row;});
 return <><nav className="system-tabs"><button aria-pressed={scope==='kingdom'} onClick={()=>setScope('kingdom')}>{T.assetsKingdoms}</button><button aria-pressed={scope==='region'} onClick={()=>setScope('region')}>{T.assetsRegions}</button></nav>
 <table className="system-table"><tbody>{rows.map((r,i)=>{const k=world.kingdoms.find(k=>k.id===r.kingdomId)!,total=r.manor+r.finance;return <tr key={String('regionId' in r?r.regionId:r.kingdomId)}><th><i className="swatch" style={{background:k.color}}/>{'regionId' in r?regionName(world.regions.find(a=>a.id===r.regionId)!):ko?k.name:k.nameEn}</th><td data-help={`${T.system.manor} ${exactNumber(r.manor)} / ${T.system.week}\n${T.system.finance} ${exactNumber(r.finance)} / ${T.system.week}`} tabIndex={0}><span style={{display:'flex',height:10,minWidth:80,border:'1px solid var(--ink)',background:'var(--sheet)'}}><i style={{width:`${total?r.manor/total*100:0}%`,background:'var(--manor-owner)'}}/><i style={{flex:total?1:0,background:'var(--finance-owner)'}}/></span></td><td>{total?pct(r.ratio):'—'}</td></tr>;})}</tbody></table>
 <TimeChart data={history} series={world.kingdoms.map(k=>({key:String(k.id),name:ko?k.name:k.nameEn,color:k.color}))} format={pct} height={160}/></>;
}
