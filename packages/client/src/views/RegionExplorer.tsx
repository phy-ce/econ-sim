import { educationOf, literacyOf, regionPopulation, regionUnemployment } from '@econ/sim';
import type { PopClass, Region, World } from '@econ/sim';
import { useLang, useT, buildingName } from '../i18n';
import { compact, pct } from '../format';
import { NumericValue } from '../NumericValue';
import { BuildingSprite } from '../sprites';
import { HelpText } from '../TooltipLayer';
import { ClassDonut } from './ClassDonut';
import { RegionCircles } from './RegionCircles';
import { SectionStack } from './SectionStack';

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
 return <SectionStack explorer storageKey="region-explorer" items={[
  {id:'people',title:T.population,height:420,content:<>
   <div className="explorer-facts"><span><HelpText text={T.help.population}>{T.population}</HelpText><b><NumericValue value={regionPopulation(region)} format="compact"/></b></span><span><HelpText text={T.help.unemployment}>{T.unemployment}</HelpText><b>{pct(regionUnemployment(world,region.id,'unskilled'))}</b></span></div>
   <ClassDonut region={region} onViewPops={onPops}/>
  </>},
  {id:'land',title:ko?'토지 · 소유':'Land · ownership',height:280,content:<RegionCircles world={world} region={region} onBuildings={onBuildings}/>},
  {id:'buildings',title:T.buildings,height:360,content:<>
   <div className="explorer-facts"><span>{T.buildings}<b>{compact(buildings.length)}</b></span><span>{T.ringLevels}<b>{compact(buildings.reduce((sum,b)=>sum+b.level,0))}</b></span></div>
   {[...groups].sort((a,b)=>b[1]-a[1]).map(([type,levels])=><button key={type} className="explorer-building" onClick={onBuildings} data-help={`${buildingName(type)} · ${levels} ${T.ringLevels}\n${T.ringOpenBuildings}`}><BuildingSprite typeId={type} size={32}/><span>{buildingName(type)}</span><b>{compact(levels)}</b></button>)}
   {!buildings.length&&<p>{T.noBuildings}</p>}
   <button className="entity-link" onClick={onBuildings}>{ko?'지역 건물 전체 보기':'All regional buildings'} ↗</button>
  </>},
  {id:'education',title:T.education,height:260,content:<>
   <div className="explorer-rates">{rate(T.education,education,T.help.education)}{rate(T.popLiteracy,literacy,T.help.literacy)}</div>
   <div className="explorer-facts"><span>{buildingName('school')}<b>{compact(groups.get('school')??0)} {T.ringLevels}</b></span></div>
   <button className="entity-link" onClick={onBuildings} data-help={T.ringOpenBuildings}>{ko?'학교 · 지역 건물':'Schools · regional buildings'} ↗</button>
  </>}
 ]}/>;
}
