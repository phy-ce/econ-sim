import type {Company,World} from '@econ/sim';
import type {Game} from '../useGame';
import {useNavigationState} from '../NavigationHistory';
import {regionName,useT} from '../i18n';
import {BuildList,Projects} from './CompanyPanel';
export function ConstructionPanel({world,game,me,regionId,onRegion,onOpenRegion}:{world:World;game:Game;me:Company;regionId:number;onRegion:(id:number)=>void;onOpenRegion:(id:number)=>void}){
 const T=useT(),[tab,setTab]=useNavigationState<'build'|'queue'>('construction:tab','build');
 const owned=world.regions.filter(r=>r.kingdomId===me.kingdomId).sort((a,b)=>a.id-b.id);
 const region=owned.find(r=>r.id===regionId)??owned[0];
 const projects=world.constructions.filter(c=>c.companyId===me.id);
 return <><nav className="system-tabs" aria-label={T.system.region}>{world.regions.map(r=>{const count=projects.filter(c=>c.regionId===r.id).length;return <button key={r.id} disabled={r.kingdomId!==me.kingdomId} aria-pressed={region?.id===r.id} onClick={()=>onRegion(r.id)}>{regionName(r)}{count>0&&<b> {count}</b>}</button>;})}</nav>
 <nav className="system-tabs"><button aria-pressed={tab==='build'} onClick={()=>setTab('build')}>{T.constructionBuild}</button><button aria-pressed={tab==='queue'} onClick={()=>setTab('queue')}>{T.constructionQueue} · {projects.length}</button></nav>
 <div hidden={tab!=='build'}>{region?<BuildList game={game} world={world} me={me} region={region} projects={projects.length}/>:<span>—</span>}</div>
 <div hidden={tab!=='queue'}><Projects game={game} world={world} owner={me} projects={world.constructions} onRegion={onOpenRegion}/></div></>;
}
