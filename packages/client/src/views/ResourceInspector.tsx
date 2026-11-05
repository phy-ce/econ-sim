import {t as uiCopy} from '../i18n';
import {ownershipLabel} from '../ownershipLabel';
import {DemolitionProgress} from './DemolitionProgress';
import {FlowRow} from './FlowRow';
import {useNavigationState} from '../NavigationHistory';
import { BuildingEconomics } from './BuildingEconomics';
import { isOwnerBuilding } from '@econ/sim';
import { HelpText } from '../TooltipLayer';
import { HarvestBadge } from './HarvestBadge';
import { NumericValue } from '../NumericValue';
import type { Game } from '../useGame';
import { BuildingControls,rowOf } from './CompanyPanel';
import { OwnerBadge } from './OwnerBadge';
import { Workforce } from './Workforce';
import { ListTools } from './ListTools';
import { useId, useEffect } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ArrowRight, Factory, Pause, ChevronRight } from 'lucide-react';
import { TUNE, getMethod, companyById } from '@econ/sim';
import type { Building, GoodBag, GoodId, Region, World } from '@econ/sim';
import { BuildingSprite, GoodSprite } from '../sprites';
import { buildingName, goodName, regionName, methodName, useLang, useT } from '../i18n';
import { compact, money, pct } from '../format';

export function BuildingInspector({ building: input, world, onGood, onCompany, game }: {
  game?:Game; building: Building; world: World; onGood: (g: GoodId) => void; onCompany: (id: number) => void;
}) {
  const scope=useId();
  const [ownerId,setOwnerId]=useNavigationState<number|null>(scope+':owner',null);
  useEffect(()=>setOwnerId(null),[input.id]);
  const b=world.buildings.find(b=>b.id===ownerId)??input;
  const ko = useLang() === 'ko';
  const T = useT();
  const method = getMethod(b.typeId, b.methodId);
  const owner = companyById(world, b.companyId);
  const bag = (goods: GoodBag) => <div className="recipe-goods">{Object.entries(goods).map(([g, n]) =>
    <button key={g} onClick={() => onGood(g as GoodId)} title={goodName(g as GoodId)}>
      <GoodSprite g={g as GoodId} size={32} /><span>{goodName(g as GoodId)}<small><NumericValue value={(n ?? 0) * b.level} format="compact"/></small></span>
    </button>)}{!Object.keys(goods).length && <span className="muted">—</span>}</div>;
  return <section className="building-inspector" aria-label={buildingName(b.typeId)}>
    <div className="inspector-heading"><BuildingSprite typeId={b.typeId} size={88} /><div><h3>{buildingName(b.typeId)} ×{b.level}</h3><p>{methodName(getMethod(b.typeId, b.methodId))}</p>
      <button className="link-btn" onClick={() => onCompany(b.companyId)}><OwnerBadge company={owner} world={world}/> <ChevronRight size={14} /></button></div></div>
    <DemolitionProgress world={world} building={b} game={game}/>
    {!isOwnerBuilding(b.typeId)&&<div className="inspector-metrics">{!isOwnerBuilding(b.typeId)&&<span><HelpText text={T.help.utilization}>{uiCopy().screenText['utilization']}</HelpText><b>{b.active && !b.idle ? pct(b.utilization) : '0%'}</b></span>}<span><HelpText text={T.help.staffing}>{uiCopy().screenText['staffing236']}</HelpText><b>{pct(b.last.staffing)}</b></span>{!isOwnerBuilding(b.typeId)&&<span><HelpText text={T.help.inputFill}>{uiCopy().screenText['inputCoverage']}</HelpText><b>{pct(b.last.inputFill)}</b></span>}</div>}
    <BuildingEconomics world={world} building={b} game={game} onBuilding={setOwnerId}/>{!isOwnerBuilding(b.typeId)&&<><Workforce building={b} world={world}/><FlowRow world={world} building={b} onGood={onGood}/></>}

    {game&&<BuildingControls building={b} game={game} world={world}/>}
  </section>;
}

export function ResourceInspector({ world, region, good, onGood, onCompany, game, scopeRegions, scopeMarket, scopeLabel }: {
  scopeRegions?:Region[];scopeMarket?:Pick<Region['market'][GoodId],'price'|'supplyEma'|'demandEma'|'inventory'>;scopeLabel?:string;game?:Game; world: World; region: Region; good: GoodId; onGood: (g: GoodId) => void; onCompany: (id: number) => void;
}) {
  const ko = useLang() === 'ko';
  const T = useT();
  const scope=useId();
  const [side, setSide] = useNavigationState<'inputs' | 'outputs'>(scope+':side','inputs');
  const [selected, setSelected] = useNavigationState<number | null>(scope+':selected',null);
  const [sort, setSort] = useNavigationState(scope+':sort','quantity');
  const [direction, setDirection] = useNavigationState(scope+':direction',-1);
  const [search, setSearch] = useNavigationState(scope+':search','');
  const regionIds=new Set((scopeRegions??[region]).map(r=>r.id));
  const local = world.buildings.filter(b => regionIds.has(b.regionId));
  const related = (s: 'inputs' | 'outputs') => local.filter(b => (getMethod(b.typeId, b.methodId)[s][good] ?? 0) > 0);
  const rows = related(side).filter(b => `${buildingName(b.typeId)} ${regionName(world.regions.find(r=>r.id===b.regionId)!)} ${ownershipLabel(world,b)}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a,b) => {
    const value = (b: Building) => sort === 'quantity' ? (rowOf(world,b)[side].find(f=>f.g===good)?.cur??0) : sort === 'level' ? b.level : sort === 'utilization' ? (b.active && !b.idle ? b.utilization : 0) : b.profitEma;
    const label = (b: Building) => sort === 'name' ? buildingName(b.typeId) : ownershipLabel(world,b);
    return (['name','owner'].includes(sort) ? label(a).localeCompare(label(b)) : value(a)-value(b))*direction || a.id-b.id;
  });
  const detail = rows.find(b => b.id === selected);
  const market = scopeMarket??region.market[good];
  return <section className="resource-inspector">
    <div className="inspector-heading"><span className="resource-emblem"><GoodSprite g={good} size={48} /></span><div><span className="lbl">{scopeLabel??(uiCopy().screenText['selectedGoodLocalMarket'])}</span><h2>{goodName(good)}</h2></div><strong className="resource-price"><NumericValue value={market.price} format="money"/></strong></div>
    <div className="inspector-metrics"><span><ArrowUpFromLine size={16} /><HelpText text={T.help.supply}>{uiCopy().screenText['supply']}</HelpText><b><NumericValue value={market.supplyEma} format="compact"/></b></span><span><ArrowDownToLine size={16} /><HelpText text={T.help.demand}>{uiCopy().screenText['demand']}</HelpText><b><NumericValue value={market.demandEma} format="compact"/></b></span><span><HelpText text={T.help.inventory}>{uiCopy().screenText['inventory']}</HelpText><b><NumericValue value={market.inventory} format="compact"/></b></span></div>
    <div className="relation-tabs" role="group" aria-label={uiCopy().screenText['buildingRelationships']}>
      <button data-help={T.help.consumers} aria-pressed={side === 'inputs'} onClick={() => { setSide('inputs'); setSelected(null); }}><ArrowDownToLine size={18} />{uiCopy().screenText['consumers']}<b>{related('inputs').length}</b></button>
      <button data-help={T.help.producers} aria-pressed={side === 'outputs'} onClick={() => { setSide('outputs'); setSelected(null); }}><ArrowUpFromLine size={18} />{uiCopy().screenText['producers']}<b>{related('outputs').length}</b></button>
    </div>
    <ListTools value={sort} onChange={setSort} direction={direction} onDirection={() => setDirection(-direction)} search={search} onSearch={setSearch} placeholder={T.resourceSearch} count={rows.length} options={uiCopy().screenLists.resourceSort}/>
    <div className="industry-list">{rows.map(b => {
      const c = companyById(world,b.companyId);
      const stopped = !b.active || b.idle;
      return <button key={b.id} className="industry-row" aria-pressed={b.id === selected} onClick={() => setSelected(b.id === selected ? null : b.id)}>
        <BuildingSprite typeId={b.typeId} size={64} /><span className="industry-name"><strong>{buildingName(b.typeId)}</strong><HarvestBadge world={world} regionId={b.regionId} typeId={b.typeId}/>{scopeRegions&&scopeRegions.length>1&&<small>{regionName(world.regions.find(r=>r.id===b.regionId)!)}</small>}<small>{ownershipLabel(world,b)} ×{b.level}</small>{(b.shrinking??0)>0&&<small className="demolition-badge">{T.demolitionQueue(b.shrinking!)}</small>}<small>{stopped ? <><Pause size={12} /> {uiCopy().screenText['pausedIdle']}</> : methodName(getMethod(b.typeId, b.methodId))}</small></span>
        <span className="industry-amount"><NumericValue value={(rowOf(world,b)[side].find(f=>f.g===good)?.cur??0)} format="compact"/><small>{T.perDay}</small></span><ChevronRight size={16} />
      </button>;
    })}</div>
    {!rows.length && <div className="inspector-empty"><Factory size={28}/><span>{search ? T.noMatches : T.noBuildings}</span></div>}
    {detail && <BuildingInspector game={game} building={detail} world={world} onGood={onGood} onCompany={onCompany} />}
  </section>;
}
