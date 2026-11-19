import { BUILDING_BY_ID, companyById, depositFree, isGovernment, landFree } from '@econ/sim';
import type { Building, Company, World } from '@econ/sim';
import type { Game } from '../useGame';
import { Button as UIButton } from '../ui/controls';
import { buildBlockers as constructionBlockers } from '../constructionCatalogue';
import { MethodComparison } from './MethodComparison';
import { pct } from '../format';
import { regionName, useT } from '../i18n';
import { rowOf, type Row } from './buildingRow';

/** 내 건물 조작: 개수(−/+/+10), 생산 방식, 가동률, 가동 중지 */
function Controls({ r, game, world, owner, constructionOnly=false }: { r: Row; game: Game; world: World; owner: Company; constructionOnly?:boolean }) {
  const T = useT();
  const { b } = r;
  const type = BUILDING_BY_ID[b.typeId];
  const rname = regionName(r.region);
  const free = Math.min(type.land ? landFree(world, b.regionId, type.land) : Infinity,type.deposit ? depositFree(world,b.regionId,type.deposit) : Infinity);
  const oneBlocked=constructionBlockers(world,owner,r.region,b.typeId,1),fiveBlocked=constructionBlockers(world,owner,r.region,b.typeId,5);
  const full=oneBlocked.length>0;
  return (
    <div className="hctrl">
      <span className="stepper" role="group" aria-label={T.countOf(r.name)}>
        {!constructionOnly&&<UIButton aria-label={T.demolishOne} data-help={T.demolishOne} disabled={r.queued>0||(b.shrinking??0)>=b.level}
          onClick={() => { if (b.level > 1 || confirm(T.confirmDemolish(rname, r.name))) game.command({ type: 'demolish', buildingId: b.id }); }}>−</UIButton>}
        <output>{b.level}{r.queued > 0 && <small>+{r.queued}</small>}</output>
        <UIButton aria-label={T.expandOne}  data-help={[free < 1 ? T.noLand : T.expandOne,oneBlocked.join(' · ')].filter(Boolean).join('\n')} disabled={full||free < 1||(b.shrinking??0)>0}
          onClick={() => game.command({ type: 'expand', buildingId: b.id })}>+</UIButton>
        <UIButton aria-label={T.buildingGroups.expandFive}  data-help={[T.buildingGroups.expandFive,fiveBlocked.join(' · ')].filter(Boolean).join('\n')} disabled={fiveBlocked.length>0||free < 5||(b.shrinking??0)>0}
          onClick={() => game.command({ type: 'expand', buildingId: b.id, levels: 5 })}>+5</UIButton>
      </span>
      {!constructionOnly&&<>{(b.shrinking??0)>0&&<UIButton className="sm-btn" onClick={()=>game.command({type:'cancelDemolish',buildingId:b.id})}>{T.cancelDemolition}</UIButton>}
      <MethodComparison world={world} building={b} owner={owner} game={game}/>
      {!(owner.state && isGovernment(b.typeId)) && <><span className="util">
        <span className="lbl">{T.utilisation}</span>
        <output className="pxnum">{pct(b.utilization)}</output>
      </span>
      <UIButton className="sm-btn" onClick={() => game.command({ type: 'setActive', buildingId: b.id, active: !b.active })}>{b.active ? T.stop : T.resume}</UIButton></>}</>}
    </div>
  );
}

export function BuildingControls({building,game,world,constructionOnly=false}:{building:Building;game:Game;world:World;constructionOnly?:boolean}) {
  const owner=companyById(world,building.companyId);
  if (!owner?.isPlayer || BUILDING_BY_ID[building.typeId].auto) return null;
  return <Controls r={rowOf(world,building)} game={game} world={world} owner={owner} constructionOnly={constructionOnly}/>;
}
