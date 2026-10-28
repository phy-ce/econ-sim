import {OwnershipBar} from './OwnershipBar';
import { educationOf, literacyOf, regionPopulation, regionUnemployment } from '@econ/sim';
import type { PopClass, Region, World } from '@econ/sim';
import { useLang, useT, buildingName } from '../i18n';
import { compact, pct } from '../format';
import { NumericValue } from '../NumericValue';
import { BuildingSprite } from '../sprites';
import { HelpText } from '../TooltipLayer';
import { ClassDonut } from './ClassDonut';
import { RegionCircles } from './RegionCircles';
import { DetailWindow } from './DetailWindow';

export function RegionExplorer({world,region,onBuildings,onPops}:{world:World;region:Region;onBuildings:()=>void;onPops:(prof:PopClass)=>void}) {
 const T=useT(),ko=useLang()==='ko';
 const buildings=world.buildings.filter(b=>b.regionId===region.id);
 const groups=new Map<string,number>();
 buildings.forEach(b=>groups.set(b.typeId,(groups.get(b.typeId)??0)+b.level));
 const pops=world.pops.filter(p=>p.regionId===region.id);
 const people=pops.reduce((sum,p)=>sum+p.size,0);
 const literacy=people?pops.reduce((sum,p)=>sum+p.size*literacyOf(p),0)/people:0;
 const education=educationOf(region);
 const rate=(label:string,value:number,help:string)=><div className="explorer-rate" data-help={`${label}: ${pct(value)}\n${help}`} tabIndex={0}>
   <div className="explorer-ring" role="img" aria-label={`${label}: ${pct(value)}`} style={{background:`conic-gradient(var(--gold) ${Math.max(0,Math.min(1,value))*360}deg, var(--rule) 0)`}}><span>{pct(value)}</span></div>
   <strong>{label}</strong>
 </div>;
 return <div className="region-ledger">
  <div className="ledger-caption">{ko?'지역 장부':'Regional ledger'}<small>{ko?'항목 클릭 → 상세 창':'Click a row for details'}</small></div>
  <DetailWindow title={ko?'인구 구성':'Population composition'} summary={<NumericValue value={regionPopulation(region)} format="compact"/>} help={T.help.population+'\n'+(ko?'직종별 인구와 비율을 별도 창으로 엽니다.':'Open population shares in a detail window.')}>
   <ClassDonut region={region} onViewPops={onPops}/>
  </DetailWindow>
  <DetailWindow title={ko?'토지 · 소유':'Land · ownership'} summary={ko?'이용률 · 왕실 / 민영':'Usage · crown / private'} help={ko?'토지 종류별 사용량과 건물 소유 비율을 확인합니다.':'Inspect land use and building ownership.'}><RegionCircles world={world} region={region} onBuildings={onBuildings}/></DetailWindow>
  <DetailWindow title={T.education} summary={pct(education)} help={T.help.education+'\n'+T.help.literacy}>
   <div className="explorer-rates">{rate(T.education,education,T.help.education)}{rate(T.popLiteracy,literacy,T.help.literacy)}</div>
   <div className="explorer-facts"><span>{buildingName('school')}<b>{compact(groups.get('school')??0)} {T.ringLevels}</b></span></div>
   <button className="entity-link" onClick={onBuildings}>{ko?'학교 · 지역 건물':'Schools · regional buildings'} ↗</button>
  </DetailWindow>
  <div className="ledger-caption"><HelpText text={ko?'건물의 개수가 아니라 종류별 총 레벨입니다. 행을 클릭하면 지역 건물 목록을 엽니다.':'Total levels by building type. Click to open regional buildings.'}>{T.buildings} · {groups.size}</HelpText><small>{T.ringLevels} {compact(buildings.reduce((sum,b)=>sum+b.level,0))}</small></div>
  {[...groups].sort((a,b)=>b[1]-a[1]).map(([type,levels])=><div key={type}><button className="explorer-building" onClick={onBuildings} data-help={`${buildingName(type)} · ${levels} ${T.ringLevels}\n${T.ringOpenBuildings}`}><BuildingSprite typeId={type} size={26}/><span>{buildingName(type)}</span><b>{compact(levels)}</b><span aria-hidden="true"> ↗</span></button><OwnershipBar world={world} buildings={buildings.filter(b=>b.typeId===type)}/></div>)}
  {!buildings.length&&<p>{T.noBuildings}</p>}
 </div>;
}
