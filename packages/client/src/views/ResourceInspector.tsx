import { NumericValue } from '../NumericValue';
import type { Game } from '../useGame';
import { BuildingControls } from './CompanyPanel';
import { OwnerBadge } from './OwnerBadge';
import { Workforce } from './Workforce';
import { ListTools } from './ListTools';
import { useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine, ArrowRight, Factory, Pause, ChevronRight } from 'lucide-react';
import { TUNE, getMethod, companyById } from '@econ/sim';
import type { Building, GoodBag, GoodId, Region, World } from '@econ/sim';
import { BuildingSprite, GoodSprite } from '../sprites';
import { buildingName, goodName, companyName, methodName, useLang, useT } from '../i18n';
import { compact, money, pct } from '../format';

export function BuildingInspector({ building: b, world, onGood, onCompany, game }: {
  game?:Game; building: Building; world: World; onGood: (g: GoodId) => void; onCompany: (id: number) => void;
}) {
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
      <button className="link-btn" onClick={() => onCompany(b.companyId)}><OwnerBadge company={owner} world={world}/> <ChevronRight size={14} /></button>{(b.privateShare??0)>0&&<span className="private-share">{T.privateEquity} {pct(b.privateShare!)}</span>}</div></div>
    {(b.shrinking??0)>0&&<div className="demolition-status"><strong>{T.demolitionQueue(b.shrinking!)}</strong><div className="demolition-levels" role="img" aria-label={T.demolitionQueue(b.shrinking!)}><i style={{flex:b.level-(b.shrinking??0)}}/><i className="pending" style={{flex:b.shrinking}}/></div></div>}
    <div className="inspector-metrics"><span>{ko ? '가동률' : 'Utilization'}<b>{b.active && !b.idle ? pct(b.utilization) : '0%'}</b></span><span>{ko ? '충원율' : 'Staffing'}<b>{pct(b.last.staffing)}</b></span><span>{ko ? '원료 충족' : 'Input coverage'}<b>{pct(b.last.inputFill)}</b></span></div>
    <Workforce building={b}/><div className="recipe"><div><h4><ArrowDownToLine size={16} />{ko ? '투입' : 'Inputs'}</h4>{bag(method.inputs)}</div><ArrowRight className="recipe-arrow" /><div><h4><ArrowUpFromLine size={16} />{ko ? '산출' : 'Outputs'}</h4>{method.taxCapacity ? <span className="service-output">{T.taxCapacity} <b><NumericValue value={method.taxCapacity*b.level*TUNE.adminScale} format="compact"/></b></span> : bag(method.outputs)}{method.construction && <span className="service-output"><Factory size={18}/>{ko ? '건설력' : 'Construction'} <b><NumericValue value={method.construction*b.level} format="compact"/> pt</b></span>}{method.grant && <span className="service-output">{ko ? '교육 서비스' : 'Education service'}</span>}</div></div>

    {game&&<BuildingControls building={b} game={game} world={world}/>}
  </section>;
}

export function ResourceInspector({ world, region, good, onGood, onCompany, game }: {
  game?:Game; world: World; region: Region; good: GoodId; onGood: (g: GoodId) => void; onCompany: (id: number) => void;
}) {
  const ko = useLang() === 'ko';
  const T = useT();
  const [side, setSide] = useState<'inputs' | 'outputs'>('inputs');
  const [selected, setSelected] = useState<number | null>(null);
  const [sort, setSort] = useState('quantity');
  const [direction, setDirection] = useState(-1);
  const [search, setSearch] = useState('');
  const local = world.buildings.filter(b => b.regionId === region.id);
  const related = (s: 'inputs' | 'outputs') => local.filter(b => (getMethod(b.typeId, b.methodId)[s][good] ?? 0) > 0);
  const rows = related(side).filter(b => `${buildingName(b.typeId)} ${companyById(world,b.companyId) ? companyName(companyById(world,b.companyId)!) : ''}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).sort((a,b) => {
    const value = (b: Building) => sort === 'quantity' ? (getMethod(b.typeId,b.methodId)[side][good] ?? 0)*b.level : sort === 'level' ? b.level : sort === 'utilization' ? (b.active && !b.idle ? b.utilization : 0) : b.profitEma;
    const label = (b: Building) => sort === 'name' ? buildingName(b.typeId) : companyById(world,b.companyId) ? companyName(companyById(world,b.companyId)!) : '';
    return (['name','owner'].includes(sort) ? label(a).localeCompare(label(b)) : value(a)-value(b))*direction || a.id-b.id;
  });
  const detail = rows.find(b => b.id === selected);
  const market = region.market[good];
  return <section className="resource-inspector">
    <div className="inspector-heading"><span className="resource-emblem"><GoodSprite g={good} size={48} /></span><div><span className="lbl">{ko ? '선택한 자원 · 지역 시장' : 'Selected good · Local market'}</span><h2>{goodName(good)}</h2></div><strong className="resource-price"><NumericValue value={market.price} format="money"/></strong></div>
    <div className="inspector-metrics"><span><ArrowUpFromLine size={16} />{ko ? '공급' : 'Supply'}<b><NumericValue value={market.supplyEma} format="compact"/></b></span><span><ArrowDownToLine size={16} />{ko ? '수요' : 'Demand'}<b><NumericValue value={market.demandEma} format="compact"/></b></span><span>{ko ? '재고' : 'Inventory'}<b><NumericValue value={market.inventory} format="compact"/></b></span></div>
    <div className="relation-tabs" role="group" aria-label={ko ? '자원과 건물 관계' : 'Building relationships'}>
      <button aria-pressed={side === 'inputs'} onClick={() => { setSide('inputs'); setSelected(null); }}><ArrowDownToLine size={18} />{ko ? '소비 건물' : 'Consumers'}<b>{related('inputs').length}</b></button>
      <button aria-pressed={side === 'outputs'} onClick={() => { setSide('outputs'); setSelected(null); }}><ArrowUpFromLine size={18} />{ko ? '생산 건물' : 'Producers'}<b>{related('outputs').length}</b></button>
    </div>
    <ListTools value={sort} onChange={setSort} direction={direction} onDirection={() => setDirection(-direction)} search={search} onSearch={setSearch} count={rows.length} options={ko ? [['quantity','자원 기준량'],['name','건물 이름'],['owner','소유 회사'],['level','규모'],['utilization','가동률'],['profit','손익']] : [['quantity','Resource volume'],['name','Name'],['owner','Owner'],['level','Levels'],['utilization','Utilization'],['profit','Profit']]}/>
    <div className="industry-list">{rows.map(b => {
      const c = companyById(world,b.companyId);
      const stopped = !b.active || b.idle;
      return <button key={b.id} className="industry-row" aria-pressed={b.id === selected} onClick={() => setSelected(b.id === selected ? null : b.id)}>
        <BuildingSprite typeId={b.typeId} size={64} /><span className="industry-name"><strong>{buildingName(b.typeId)}</strong><small><OwnerBadge company={c} world={world}/> ×{b.level}</small>{(b.shrinking??0)>0&&<small className="demolition-badge">{T.demolitionQueue(b.shrinking!)}</small>}<small>{stopped ? <><Pause size={12} /> {ko ? '정지 / 대기' : 'Paused / idle'}</> : methodName(getMethod(b.typeId, b.methodId))}</small></span>
        <span className="industry-amount"><NumericValue value={(getMethod(b.typeId,b.methodId)[side][good] ?? 0)*b.level} format="compact"/><small>{ko ? '기준 / 일' : 'base / day'}</small></span><ChevronRight size={16} />
      </button>;
    })}</div>
    {!rows.length && <div className="inspector-empty"><Factory size={28}/><span>{search ? T.noMatches : T.noBuildings}</span></div>}
    {detail && <BuildingInspector game={game} building={detail} world={world} onGood={onGood} onCompany={onCompany} />}
  </section>;
}
