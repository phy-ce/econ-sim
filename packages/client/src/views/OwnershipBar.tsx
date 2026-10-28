import {OwnershipBrowser,shareLabel} from './OwnershipBrowser';
import {buildingEcon,BUILDING_BY_ID} from '@econ/sim';
import type {World,Building} from '@econ/sim';
import {Crown,Landmark,House,Minus} from 'lucide-react';
import {buildingName,companyName,regionName,useLang} from '../i18n';
import {NumericValue} from '../NumericValue';
import {DetailWindow} from './DetailWindow';
import {pct} from '../format';
const colors={state:'#a64240',manor:'#87601c',finance:'#246f96',none:'#687078'};
const icons={state:Crown,manor:House,finance:Landmark,none:Minus};
type Kind=keyof typeof colors;
export function OwnershipBar({world,buildings}:{world:World;buildings:Building[]}){
 const ko=useLang()==='ko',total=buildings.reduce((n,b)=>n+b.level,0);
 const tenancy=buildings.length>0&&buildings.every(b=>b.typeId==='subsistence');
 const rows=new Map<string,{kind:Kind;name:string;levels:number;dividend:number;buildingId?:number}>();
 const add=(key:string,kind:Kind,name:string,levels:number,dividend=0,buildingId?:number)=>{const old=rows.get(key);rows.set(key,{kind,name,buildingId,levels:levels+(old?.levels??0),dividend:dividend+(old?.dividend??0)});};
 for(const b of buildings){
 if(b.typeId==='subsistence'){
  const manor=world.buildings.find(x=>x.regionId===b.regionId&&x.typeId==='manor');
  const region=world.regions.find(x=>x.id===b.regionId);
  if(manor)add(`rent:${manor.id}`,'manor',`${region?regionName(region)+' · ':''}${buildingName('manor')} #${manor.id}`,b.level,0,manor.id);
  else add(`rent-missing:${b.regionId}`,'none',ko?'지역 저택 없음':'No regional manor',b.level);
  continue;
 }
 const e=buildingEcon(world,b);for(const o of e.owners){const owner=world.buildings.find(x=>x.id===o.ownerBuildingId),region=world.regions.find(x=>x.id===owner?.regionId),company=world.companies.find(x=>x.id===b.companyId);const name=o.owner==='state'?`${company?companyName(company):ko?'왕실':'Crown'}`:`${region?regionName(region)+' · ':''}${owner?buildingName(owner.typeId):o.owner} #${o.ownerBuildingId}`;add(o.owner==='state'?`state:${b.companyId}`:`owner:${o.ownerBuildingId}`,o.owner,name,o.levels,o.dividendWeek,o.ownerBuildingId);}
 const remainder=Math.max(0,b.level-e.owners.reduce((n,o)=>n+o.levels,0));if(remainder){const auto=BUILDING_BY_ID[b.typeId].auto;add(auto?`auto:${b.id}`:'unassigned','none',auto?`${buildingName(b.typeId)} #${b.id} · ${ko?'구성 보기':'Composition'}`:(ko?'등록 소유주 없음':'No registered owner'),remainder,0,auto?b.id:undefined);}}
 const entries=[...rows.values()],kinds=(Object.keys(colors) as Kind[]).map(kind=>({kind,levels:entries.filter(x=>x.kind===kind).reduce((n,x)=>n+x.levels,0)})).filter(x=>x.levels>0);
 const names={state:ko?'왕실':'Crown',manor:ko?'저택':'Manor',finance:ko?'금융가':'Finance',none:ko?'지분 없음':'No shares'};
 const title=`${buildings[0]?buildingName(buildings[0].typeId):ko?'건물':'Building'} · ${ko?'소유권':'Ownership'}`;
 return <DetailWindow title={title} help={(tenancy?(ko?'소작지는 같은 지역 저택의 지대 관계로 표시합니다. 클릭하면 해당 저택을 확인합니다.':'Subsistence land is linked to its regional manor through rent.'):ko?'건물 레벨 기준 소유 비율. 클릭하면 소유주·소재 지역·보유 레벨·지난주 배당을 확인합니다.':'Level-based ownership. Click for owners, locations, levels and dividends.')+'\n'+kinds.map(x=>`${names[x.kind]} ${pct(total?x.levels/total:0)}`).join(' · ')} triggerContent={<span className="ownership-meter">{kinds.map(x=>{const Icon=icons[x.kind],share=total?x.levels/total:0;return <span key={x.kind} style={{width:`${share*100}%`,background:colors[x.kind]}}><Icon size={15}/>{share>=.18&&<b>{names[x.kind]} {pct(share)}</b>}</span>;})}{!total&&<span style={{width:'100%',background:colors.none}}>{ko?'건물 없음':'No buildings'}</span>}</span>}>

 <OwnershipBrowser world={world}>{go=><><div className="ownership-legend">{kinds.map(x=>{const Icon=icons[x.kind];return <span key={x.kind}><Icon size={14} color={colors[x.kind]}/>{names[x.kind]} {shareLabel(total?x.levels/total:0)}</span>;})}</div><table className="system-table ownership-table"><thead><tr><th>{ko?'소유주 · 소재지':'Owner · location'}</th><th><span tabIndex={0} className="help-text" data-help={tenancy?(ko?'소작지는 같은 지역 저택 소유로 표시합니다. 비율은 해당 저택에 연결된 소작지 레벨 비중이며, 일반 건물의 투자 지분과는 다릅니다. 지대는 저택으로 지급됩니다.':'Subsistence land belongs to the regional manor through rent. Percentages describe linked land levels, not investment shares.'):ko?'보유 레벨 / 전체 레벨 기준. 회색은 지분 소유로 분류되지 않는 부분입니다.':'Shares use owned levels / total levels. Grey indicates levels without ownership shares.'}>{tenancy?(ko?'소작지 L / %':'Land L / %'):'L / %'}</span></th><th>{tenancy?(ko?'지난주 지대':'Weekly rent'):(ko?'지난주 배당':'Weekly dividend')}</th></tr></thead><tbody>{entries.map((x,i)=>{const Icon=icons[x.kind];return <tr key={i}><th><span className="ownership-owner" style={{color:colors[x.kind]}}><Icon size={16}/>{x.buildingId!==undefined?<button className="entity-link" onClick={()=>go(x.buildingId!)}>{x.name} ↗</button>:x.name}</span></th><td><NumericValue value={x.levels} format="compact"/> / {shareLabel(total?x.levels/total:0)}</td><td>{tenancy?<span tabIndex={0} data-help={ko?'소작지별 지난주 지대 금액은 별도로 기록되지 않습니다.':'Weekly rent is not tracked per subsistence building.'}>—</span>:<NumericValue value={x.dividend} format="money"/>}</td></tr>;})}</tbody></table></>}</OwnershipBrowser>
 </DetailWindow>;
}
