import {t as uiCopy} from '../i18n';
import {DetailExplorer} from './DetailExplorer';
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
  <div className="ledger-caption">{uiCopy().screenText['regionalLedger']}<small>{uiCopy().screenText['clickARowForDetails']}</small></div>
  <DetailWindow title={uiCopy().screenText['populationComposition']} summary={<NumericValue value={regionPopulation(region)} format="compact"/>} help={T.help.population+'\n'+(uiCopy().screenText['openPopulationSharesInADetailWindow'])}>
   <DetailExplorer world={world} regionId={region.id}>{go=><ClassDonut region={region} onViewPops={prof=>go({kind:'pops',region:region.id,prof})}/>}</DetailExplorer>
  </DetailWindow>
  <DetailWindow title={uiCopy().screenText['landOwnership']} summary={uiCopy().screenText['usageCrownPrivate']} help={uiCopy().screenText['inspectLandUseAndBuildingOwnership']}><DetailExplorer world={world} regionId={region.id}>{go=><RegionCircles world={world} region={region} onBuildings={()=>go({kind:'buildings',region:region.id})}/>}</DetailExplorer></DetailWindow>
  <DetailWindow title={T.education} summary={pct(education)} help={T.help.education+'\n'+T.help.literacy}>
   <DetailExplorer world={world} regionId={region.id}>{go=><><div className="explorer-rates">{rate(T.education,education,T.help.education)}{rate(T.popLiteracy,literacy,T.help.literacy)}</div>
   <div className="explorer-facts"><span>{buildingName('school')}<b>{compact(groups.get('school')??0)} {T.ringLevels}</b></span></div>
   <button className="entity-link" onClick={()=>go({kind:'buildings',region:region.id})}>{uiCopy().screenText['schoolsRegionalBuildings']} ↗</button></>}</DetailExplorer>
  </DetailWindow>
  <div className="ledger-caption"><HelpText text={uiCopy().screenText['totalLevelsByBuildingTypeClickTo']}>{T.buildings} · {groups.size}</HelpText><small>{T.ringLevels} {compact(buildings.reduce((sum,b)=>sum+b.level,0))}</small></div>
  {[...groups].sort((a,b)=>b[1]-a[1]).map(([type,levels])=><div key={type}><button className="explorer-building" onClick={onBuildings} data-help={`${buildingName(type)} · ${levels} ${T.ringLevels}\n${T.ringOpenBuildings}`}><BuildingSprite typeId={type} size={26}/><span>{buildingName(type)}</span><b>{compact(levels)}</b><span aria-hidden="true"> ↗</span></button><OwnershipBar world={world} buildings={buildings.filter(b=>b.typeId===type)}/></div>)}
  {!buildings.length&&<p>{T.noBuildings}</p>}
 </div>;
}
