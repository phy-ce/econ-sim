import { useState } from 'react';
import { MAX_CONCURRENT_CONSTRUCTIONS, regionById } from '@econ/sim';
import type { Company, World } from '@econ/sim';
import { X, ArrowUp, ArrowDown, Pause, Play } from 'lucide-react';
import type { Game } from '../useGame';
import { Button as UIButton } from '../ui/controls';
import { NumericValue } from '../NumericValue';
import { OwnerBadge } from './OwnerBadge';
import { BuildingSprite } from '../sprites';
import { Bar } from '../ui';
import { money, one } from '../format';
import { buildingName, regionName, useT } from '../i18n';

// 공사 대기열: 왕실과 민간 두 줄 (건설 창·건설 상세·지역 창·게임 창)
export function Projects({game,world,owner,projects,regionId,onRegion}:{game?:Game;world:World;owner:Company;projects:World['constructions'];regionId?:number;onRegion?:(id:number)=>void}) {
  const T=useT();
  const activity=game?.constructionActivity;
  const [cancelId,setCancelId]=useState<number|null>(null);
  return <div className="projects construction-lanes">{[true,false].map(state=>{
    const companies=world.companies.filter(c=>c.kingdomId===owner.kingdomId&&c.state===state);
    const ids=new Set(companies.map(c=>c.id));
    const lane=projects.filter(k=>ids.has(k.companyId));
    const entries=activity?.entries.filter(e=>ids.has(e.companyId)&&(regionId===undefined||e.regionId===regionId));
    return <section className="construction-lane" key={String(state)}><header><OwnerBadge company={companies[0]} world={world}/><span className="pxnum">{world.constructions.filter(k=>ids.has(k.companyId)).length}/{MAX_CONCURRENT_CONSTRUCTIONS}</span><b data-help={T.receivedToday}>{entries?one(entries.reduce((sum,e)=>sum+e.points,0)):'—'} pt{T.perDay}</b></header>
      {lane.map((k,i)=>{
        const own=world.constructions.filter(x=>x.companyId===k.companyId),position=own.findIndex(x=>x.id===k.id);
        return <article className={`project ${k.paused?'project-paused':''}`} key={k.id}><span className="pxnum">{position+1}/{own.length}</span><BuildingSprite typeId={k.typeId} size={64}/><div className="project-main"><div className="project-top"><strong>{buildingName(k.typeId)} +{k.levels??1} {k.paused&&<Pause size={14}/>}</strong><span className="lbl">{onRegion?<UIButton className="entity-link" onClick={()=>onRegion(k.regionId)}>{regionName(regionById(world,k.regionId))} ↗</UIButton>:regionName(regionById(world,k.regionId))} · {k.targetBuildingId?T.expansion:T.newConstruction}</span>{entries?.find(e=>e.id===k.id)?.capped&&<span data-help={T.dailyCap} aria-label={T.dailyCap}>◆</span>}</div><Bar value={k.points/k.required} label={T.projectProgress(buildingName(k.typeId))}/><span className="project-nums"><span><NumericValue value={k.points} format="one"/>/<NumericValue value={k.required} format="int"/> pt</span><span><NumericValue value={k.spent} format="money"/></span><span>{T.nDays(k.ticksElapsed)}</span></span></div>{game&&owner.isPlayer&&k.companyId===owner.id&&<div className="project-actions"><UIButton className="icon-btn sm" data-help={T.moveProjectUp} aria-label={T.moveProjectUp} disabled={position<=0} onClick={()=>game.command({type:'moveConstruction',constructionId:k.id,index:position-1})}><ArrowUp size={14}/></UIButton><UIButton className="icon-btn sm" data-help={T.moveProjectDown} aria-label={T.moveProjectDown} disabled={position===own.length-1} onClick={()=>game.command({type:'moveConstruction',constructionId:k.id,index:position+1})}><ArrowDown size={14}/></UIButton><UIButton className="icon-btn sm" data-help={k.paused?T.resumeProject:T.pauseProject} aria-label={k.paused?T.resumeProject:T.pauseProject} onClick={()=>game.command({type:'pauseConstruction',constructionId:k.id,paused:!k.paused})}>{k.paused?<Play size={14}/>:<Pause size={14}/>}</UIButton><UIButton className="icon-btn sm" data-help={T.cancelProject} aria-label={T.cancelProjectOf(buildingName(k.typeId))} onClick={()=>setCancelId(k.id)}><X size={14}/></UIButton></div>}{cancelId===k.id&&game&&<div className="project-confirm" role="alertdialog" aria-label={T.cancelProject} onKeyDown={e=>{if(e.key==='Escape')setCancelId(null);}}><p>{T.cancelSpent(money(k.spent))}</p><UIButton autoFocus onClick={()=>setCancelId(null)}>{T.keepConstruction}</UIButton><UIButton onClick={()=>{game.command({type:'cancelConstruction',constructionId:k.id});setCancelId(null);}}>{T.cancelProject}</UIButton></div>}</article>;
      })}{!lane.length&&<span className="muted">—</span>}
    </section>;
  })}</div>;
}
