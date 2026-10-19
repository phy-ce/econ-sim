import { NumericValue } from '../NumericValue';
import type { Game } from '../useGame';
import { BuildList, Projects } from './CompanyPanel';
import { educationOf, playerCompany } from '@econ/sim';
import { OwnerBadge } from './OwnerBadge';
import { PORTS_OPEN, regionLivingStandard } from '../systemMetrics';
import { LockKeyhole } from 'lucide-react';
import { SortHeader } from './SortHeader';
import { SectionStack } from './SectionStack';
import { useMemo, useState, useEffect, useRef } from 'react';
import {
  GOOD_IDS, REGIONS, GOODS, LAND_TYPES,
  companyById, landUsed, regionAvgWealth, regionPopulation, regionUnemployment,
} from '@econ/sim';
import type { PopClass, GoodId, HistoryPoint, Region, World } from '@econ/sim';
import { MapPin, Package, Factory, Users } from 'lucide-react';
import { BuildingSprite, GoodSprite, Sprite64 } from '../sprites';
import { ListTools } from './ListTools';
import { ResourceInspector, BuildingInspector } from './ResourceInspector';
import { PriceGauge } from './PriceGauge';
import { SourceBreakdown } from './SourceBreakdown';
import { ClassDonut } from './ClassDonut';
import { TimeChart } from './Chart';
import { Bar } from '../ui';
import { compact, compactMoney, int, money, pct } from '../format';
import { buildingName, companyName, goodName, landName, regionName, useLang, useT } from '../i18n';

type SortKey = 'value' | 'name' | 'price' | 'ratio' | 'balance';

export function RegionPanel({ world, region, history, selectedGood, onSelectGood, onViewCompany, mode, onViewBuildings, game, buildingRequest, onViewPops }: {
  onViewPops?:(regionId:number,prof:PopClass)=>void;
  buildingRequest?:{id:number;sequence:number}|null; game:Game;
  onViewBuildings?: () => void;
  mode?: 'overview' | 'market' | 'industry';
  world: World; region: Region; history: HistoryPoint[]; selectedGood: GoodId; onSelectGood: (g: GoodId) => void; onViewCompany: (companyId: number) => void;
}) {
  const [localTab, setTab] = useState<'overview' | 'market' | 'industry'>('market');
  const tab = mode ?? localTab;
  const inspectorRef=useRef<HTMLDivElement>(null);
  const [buildingId, setBuildingId] = useState<number | null>(null);
  useEffect(()=>{if(buildingRequest){setBuildingId(buildingRequest.id);setIndustrySearch('');}},[buildingRequest]);
  useEffect(()=>{if(buildingId!==null)inspectorRef.current?.scrollIntoView({block:'nearest'});},[buildingId]);
  const selectGood = (g: GoodId) => { onSelectGood(g); setTab('market'); };
  const [buildingMenu,setBuildingMenu]=useState(false);
  const me=playerCompany(world);
  const r = region;
  const lang = useLang();
  const T = useT();
  const pop = regionPopulation(r);
  const [industrySort, setIndustrySort] = useState('level');
  const [industryDirection, setIndustryDirection] = useState(-1);
  const [industrySearch, setIndustrySearch] = useState('');
  const allBuildings = world.buildings.filter(b => b.regionId === r.id);
  const buildings = allBuildings.filter(b => `${buildingName(b.typeId)} ${companyById(world,b.companyId) ? companyName(companyById(world,b.companyId)!) : ''}`.toLocaleLowerCase().includes(industrySearch.toLocaleLowerCase())).sort((a,b) => {
    const value = (b: typeof a) => industrySort === 'level' ? b.level : industrySort === 'utilization' ? (b.active && !b.idle ? b.utilization : 0) : b.profitEma;
    const label = (b: typeof a) => industrySort === 'name' ? buildingName(b.typeId) : companyById(world,b.companyId) ? companyName(companyById(world,b.companyId)!) : '';
    return (['name','owner'].includes(industrySort) ? label(a).localeCompare(label(b)) : value(a)-value(b))*industryDirection || a.id-b.id;
  });
  const lower = r.households.peasant.population + r.households.unskilled.population;
  const laborer = r.households.unskilled;
  const unemp = regionUnemployment(world, r.id, 'unskilled');
  const tenantShare = lower > 0 ? r.households.peasant.population / lower : 0;
  const headline = `region-${r.id}`;
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'value', dir: -1 });
  const priceData = useMemo(() => history.map((p) => ({ tick: p.tick, price: p.prices[r.id]?.[selectedGood] ?? 0 })), [history, r.id, selectedGood]);

  // 순서는 정렬 기준·지역이 바뀔 때와 게임 속 일주일마다만 다시 매긴다 (값이 매 순간 바뀌어 행이 뛰지 않게)
  const week = Math.floor(world.tick / 7);
  const goods = useMemo(() => [...GOOD_IDS].sort((a, b) => {
    if (sort.key === 'name') return goodName(a).localeCompare(goodName(b), lang) * sort.dir;
    const ma = r.market[a], mb = r.market[b];
    const v = (g: GoodId, m: typeof ma) =>
      sort.key === 'value' ? m.price * (m.supplyEma + m.demandEma) / 2 : sort.key === 'price' ? m.price : sort.key === 'ratio' ? m.price / GOODS[g].basePrice : m.supplyEma - m.demandEma;
    return (v(a, ma) - v(b, mb)) * sort.dir;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [sort, r.id, week, lang]);
  const sortBy = (key: SortKey) => setSort((s) => ({ key, dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'name' ? 1 : -1 }));
  // 컴포넌트가 아니라 함수로 그린다: 매 갱신마다 새 컴포넌트가 되면 버튼이 다시 만들어져 클릭이 씹힌다
  const sortTh = (k: SortKey, children: string) => (
    <SortHeader key={k} label={children} active={sort.key===k} direction={sort.dir} onClick={()=>sortBy(k)}/>
  );

  return (
    <>
      <header className="pane-head">
        <div className="title-row">
          <span className="tile lg region-art"><Sprite64 id={headline} size={64} /></span>
          <h2>{regionName(r)}</h2>
          {r.spaceport && <span className={`pill soft ${PORTS_OPEN ? '' : 'port-closed'}`}>{!PORTS_OPEN && <LockKeyhole size={12}/>} {PORTS_OPEN ? T.port : T.portClosed}</span>}
          {Object.entries(REGIONS.find((d) => d.id === r.id)?.perks ?? {}).length > 0 && (
            <span className="perks">
              {Object.entries(REGIONS.find((d) => d.id === r.id)!.perks).map(([t, v]) => (
                <span key={t} className="tag-soft">
                  <BuildingSprite typeId={t} size={16} /> {buildingName(t)} +{Math.round((v ?? 0) * 100)}%
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="stats region-stats">
          <div className="stat"><span className="stat-label">{T.standardOfLiving}</span><span className="stat-value">{regionLivingStandard(r).toFixed(1)}</span><Bar value={regionLivingStandard(r)/30} size="sm" label={T.standardOfLiving}/></div>
          <div className="stat"><span className="stat-label">{T.population}</span><span className="stat-value"><NumericValue value={pop} format="compact"/></span></div>
          <div className="stat">
            <span className="stat-label">{T.wealthPerHead}</span>
            <span className={`stat-value ${regionAvgWealth(r) < 4 ? 'neg' : ''}`}>{regionAvgWealth(r).toFixed(1)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">{T.laborerWealth}</span>
            <span className="stat-value">{laborer.wealth.toFixed(1)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">{T.unemployment}</span>
            <span className="stat-value">{pct(unemp)}</span>
            <Bar value={unemp} tone="neg" size="sm" label={T.unemployment} />
          </div>
          <div className="stat"><span className="stat-label">{T.education}</span><span className="stat-value">{pct(educationOf(r))}</span><Bar value={educationOf(r)} tone="pos" size="sm" label={T.education} /></div>
          <div className="stat"><span className="stat-label">{T.tenants}</span><span className="stat-value accent">{pct(tenantShare)}</span><Bar value={tenantShare} tone="accent" size="sm" label={T.tenants} /></div>
        </div>
        {tab !== 'industry' && <button className="region-buildings-link" onClick={() => { if (onViewBuildings) onViewBuildings(); else setTab('industry'); }}><Factory size={15}/>{lang === 'ko' ? '지역 건물 전체 보기' : 'All regional buildings'} <b>{allBuildings.length}</b></button>}
        {tab === 'industry' && <p className="lbl">{lang === 'ko' ? `모든 상회 · 건물 ${allBuildings.length}개 · 총 ${allBuildings.reduce((sum,b)=>sum+b.level,0)}레벨` : `All companies · ${allBuildings.length} buildings`}</p>}
      </header>

      {!mode && <nav className="region-tabs" aria-label={lang === 'ko' ? '지역 정보' : 'Region views'}>
        <button aria-pressed={tab === 'overview'} onClick={() => setTab('overview')}><Users size={18}/>{lang === 'ko' ? '지역 개요' : 'Overview'}</button>
        <button aria-pressed={tab === 'market'} onClick={() => setTab('market')}><Package size={18}/>{T.market}</button>
        <button aria-pressed={tab === 'industry'} onClick={() => setTab('industry')}><Factory size={18}/>{T.buildings}<span className="count-pill">{buildings.length}</span></button>
      </nav>}
      {tab === 'overview' && <>
      <section className="block">
        <h3><MapPin size={16}/>{T.landUse}</h3>
        <div className="land">
          {LAND_TYPES.map((l) => {
            const used = landUsed(world, r.id, l), total = r.land[l];
            if (total === 0) return null;
            return [
              <span key={`${l}n`}>{landName(l)}</span>,
              <Bar key={`${l}m`} value={used / total} tone={l === 'arable' ? 'pos' : l === 'plot' ? 'accent' : 'gold'} label={`${landName(l)} ${used}/${total}`} />,
              <span key={`${l}v`} className="num pxnum"><NumericValue value={used} format="int"/>/<NumericValue value={total} format="int"/></span>,
            ];
          })}
        </div>
      </section>

      <section className="block">
        <h3>{T.classes}</h3>
        <ClassDonut region={r} onViewPops={prof=>onViewPops?.(r.id,prof)} />
      </section>

      </>}
      {tab === 'market' && <section className="block market-workspace">
        <SectionStack storageKey="market" items={[{ id: 'prices', title: lang === 'ko' ? '전체 시세표' : 'Market prices', height: 174, content: <section className="market-ledger unified-market">

        <div className="table-scroll">
          <table className="goods">
            <thead><tr>
              {sortTh('name', T.colGood)}{sortTh('price', T.colPrice)}{sortTh('ratio', T.colRatio)}
              {sortTh('balance', T.colBalance)}{sortTh('value', T.colValue)}
            </tr></thead>
            <tbody>
              {goods.map((g) => {
                const m = r.market[g];
                const short = m.supplyEma < m.demandEma * 0.5 && m.demandEma > 1;
                return (
                  <tr key={g} className={g === selectedGood ? 'selected' : ''} onClick={() => selectGood(g)} tabIndex={0} aria-selected={g === selectedGood}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectGood(g); } }}>
                    <td><span className="good-name"><GoodSprite g={g} size={24} /> {goodName(g)}</span></td>
                    <td><NumericValue value={m.price} format="money"/></td>
                    <td className="gauge-cell"><PriceGauge ratio={m.price / GOODS[g].basePrice} /></td>
                    <td className={short ? 'neg strong' : ''}><NumericValue value={m.supplyEma} format="compact"/> / <NumericValue value={m.demandEma} format="compact"/></td>
                    <td><NumericValue value={m.price * (m.supplyEma + m.demandEma) / 2} format="compactMoney"/></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        </section>
        }, { id: 'resource', title: lang === 'ko' ? '선택 상품 · 관련 건물' : 'Selected good · Buildings', height: 290, content: <ResourceInspector game={game} key={`${r.id}-${selectedGood}`} world={world} region={r} good={selectedGood} onGood={selectGood} onCompany={onViewCompany}/>
        }, { id: 'sources', title: lang === 'ko' ? '수요·공급 구성' : 'Supply and demand', height: 210, content: <SourceBreakdown good={selectedGood} m={r.market[selectedGood]} />
        }, { id: 'history', title: lang === 'ko' ? '가격 추이' : 'Price history', height: 190, content: <div className="price-chart">
          <div className="card-head">
            <span className="good-name strong"><GoodSprite g={selectedGood} /> {T.priceTrend(goodName(selectedGood))}</span>
            <span className="lbl">{T.basePriceOf(money(GOODS[selectedGood].basePrice))}</span>
          </div>
          <TimeChart data={priceData} series={[{ key: 'price', name: T.price, color: 'var(--accent)' }]}
            format={(v) => `ƒ${v.toFixed(v < 10 ? 2 : 0)}`} reference={{ y: GOODS[selectedGood].basePrice, label: T.basePrice }} height={150} />
        </div>
        }]} />
      </section>

      }
      {tab === 'industry' && <section className="block">
        {me&&<><button className="primary sm-btn" aria-expanded={buildingMenu} onClick={()=>setBuildingMenu(v=>!v)}>{T.construct}</button>{buildingMenu&&<BuildList game={game} world={world} me={me} region={r} projects={world.constructions.filter(k=>k.companyId===me.id).length}/>}
        {world.constructions.some(k=>k.regionId===r.id)&&<Projects game={game} world={world} owner={world.companies.find(c=>c.kingdomId===r.kingdomId&&c.state)??me} regionId={r.id} projects={world.constructions.filter(k=>k.regionId===r.id)}/>}</>}

        {allBuildings.find(b => b.id === buildingId) && <div ref={inspectorRef}><BuildingInspector game={game} building={allBuildings.find(b => b.id === buildingId)!} world={world} onGood={selectGood} onCompany={onViewCompany}/></div>}
        <ListTools value={industrySort} onChange={setIndustrySort} direction={industryDirection} onDirection={() => setIndustryDirection(-industryDirection)} search={industrySearch} onSearch={setIndustrySearch} count={buildings.length} options={lang === 'ko' ? [['level','규모'],['name','이름'],['owner','소유 회사'],['utilization','가동률'],['profit','손익']] : [['level','Levels'],['name','Name'],['owner','Owner'],['utilization','Utilization'],['profit','Profit']]}/>
        <h3>{T.buildings} <span className="count-pill">{buildings.length}</span> </h3>
        {buildings.length === 0 ? <p className="empty">{lang === 'ko' ? (allBuildings.length === 0 ? T.noBuildings : T.noMatches) : (allBuildings.length === 0 ? T.noBuildings : T.noMatches)}</p> : (
          <ul className="chips-grid">
            {buildings.map((b) => {
              const c = companyById(world, b.companyId);
              return (
                <li key={b.id}>
                  <button className={`b-chip ${b.active ? '' : 'off'}`} aria-pressed={buildingId === b.id} onClick={() => setBuildingId(b.id === buildingId ? null : b.id)}
                    title={c?.isPlayer ? T.myHouse : c ? companyName(c) : undefined}>
                    <span className="b-chip-icon" style={{ borderColor: c?.color }}><BuildingSprite typeId={b.typeId} size={48} /></span>
                    <span className="b-chip-name">{buildingName(b.typeId)}<OwnerBadge company={c} world={world}/></span>
                    <span className="b-chip-count">×{b.level}{(b.shrinking??0)>0&&<small className="demolition-badge">{T.demolitionQueue(b.shrinking!)}</small>}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>}
    </>
  );
}
