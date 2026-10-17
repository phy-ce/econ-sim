import { useMemo, useState } from 'react';
import {
  GOOD_IDS, REGIONS, GOODS, LAND_TYPES,
  companyById, landUsed, regionAvgWealth, regionPopulation, regionUnemployment,
} from '@econ/sim';
import type { GoodId, HistoryPoint, Region, World } from '@econ/sim';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { BuildingSprite, GoodSprite, Sprite64 } from '../sprites';
import { PriceGauge } from './PriceGauge';
import { SourceBreakdown } from './SourceBreakdown';
import { ClassDonut } from './ClassDonut';
import { TimeChart } from './Chart';
import { Bar } from '../ui';
import { compact, compactMoney, int, money, pct } from '../format';
import { buildingName, companyName, goodName, landName, regionName, useLang, useT } from '../i18n';

type SortKey = 'value' | 'name' | 'price' | 'ratio' | 'balance';

export function RegionPanel({ world, region, history, selectedGood, onSelectGood, onViewCompany }: {
  world: World; region: Region; history: HistoryPoint[]; selectedGood: GoodId; onSelectGood: (g: GoodId) => void; onViewCompany: (companyId: number) => void;
}) {
  const r = region;
  const lang = useLang();
  const T = useT();
  const pop = regionPopulation(r);
  const buildings = world.buildings.filter((b) => b.regionId === r.id).sort((a, b) => b.level - a.level);
  const lower = r.households.peasant.population + r.households.unskilled.population;
  const laborer = r.households.unskilled;
  const unemp = regionUnemployment(world, r.id, 'unskilled');
  const tenantShare = lower > 0 ? r.households.peasant.population / lower : 0;
  // 머리 그림: 이 지역에 가장 많이 지어진 건물 (없으면 주된 땅에 맞춰 농장·벌목장·광산)
  const byType = new Map<string, number>();
  for (const b of buildings) if (b.typeId !== 'builder') byType.set(b.typeId, (byType.get(b.typeId) ?? 0) + b.level);
  const top = [...byType].sort((a, b) => b[1] - a[1])[0]?.[0];
  const mainLand = (['arable', 'forest', 'ore'] as const).reduce((best, l) => (r.land[l] > r.land[best] ? l : best), 'arable' as 'arable' | 'forest' | 'ore');
  const headline = top ?? (mainLand === 'forest' ? 'lumber' : mainLand === 'ore' ? 'mine' : 'farm');
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
    <th key={k} aria-sort={sort.key === k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button className="th-sort" onClick={() => sortBy(k)}>
        {children}{sort.key === k && (sort.dir === 1 ? <ArrowUp size={11} aria-hidden="true" /> : <ArrowDown size={11} aria-hidden="true" />)}
      </button>
    </th>
  );

  return (
    <>
      <header className="pane-head">
        <div className="title-row">
          <span className="tile lg region-art"><Sprite64 id={headline} size={64} /></span>
          <h2>{regionName(r)}</h2>
          {r.spaceport && <span className="pill soft">{T.port}</span>}
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
        <div className="stats">
          <div className="stat"><span className="stat-label">{T.population}</span><span className="stat-value">{compact(pop)}</span></div>
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
          <div className="stat"><span className="stat-label">{T.education}</span><span className="stat-value">{pct(r.education)}</span><Bar value={r.education} tone="pos" size="sm" label={T.education} /></div>
          <div className="stat"><span className="stat-label">{T.tenants}</span><span className="stat-value accent">{pct(tenantShare)}</span><Bar value={tenantShare} tone="accent" size="sm" label={T.tenants} /></div>
        </div>
      </header>

      <section className="block">
        <h3>{T.landUse}</h3>
        <div className="land">
          {LAND_TYPES.map((l) => {
            const used = landUsed(world, r.id, l), total = r.land[l];
            if (total === 0) return null;
            return [
              <span key={`${l}n`}>{landName(l)}</span>,
              <Bar key={`${l}m`} value={used / total} tone={l === 'arable' ? 'pos' : l === 'plot' ? 'accent' : 'gold'} label={`${landName(l)} ${used}/${total}`} />,
              <span key={`${l}v`} className="num pxnum">{int(used)}/{int(total)}</span>,
            ];
          })}
        </div>
      </section>

      <section className="block">
        <h3>{T.classes}</h3>
        <ClassDonut region={r} />
      </section>

      <section className="block">
        <h3>{T.market}</h3>
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
                  <tr key={g} className={g === selectedGood ? 'selected' : ''} onClick={() => onSelectGood(g)} tabIndex={0} aria-selected={g === selectedGood}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectGood(g); } }}>
                    <td><span className="good-name"><GoodSprite g={g} /> {goodName(g)}</span></td>
                    <td>{money(m.price)}</td>
                    <td className="gauge-cell"><PriceGauge ratio={m.price / GOODS[g].basePrice} /></td>
                    <td className={short ? 'neg strong' : ''}>{compact(m.supplyEma)} / {compact(m.demandEma)}</td>
                    <td>{compactMoney(m.price * (m.supplyEma + m.demandEma) / 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <SourceBreakdown good={selectedGood} m={r.market[selectedGood]} />
        <div className="price-chart">
          <div className="card-head">
            <span className="good-name strong"><GoodSprite g={selectedGood} /> {T.priceTrend(goodName(selectedGood))}</span>
            <span className="lbl">{T.basePriceOf(money(GOODS[selectedGood].basePrice))}</span>
          </div>
          <TimeChart data={priceData} series={[{ key: 'price', name: T.price, color: 'var(--accent)' }]}
            format={(v) => `ƒ${v.toFixed(v < 10 ? 1 : 0)}`} reference={{ y: GOODS[selectedGood].basePrice, label: T.basePrice }} height={150} />
        </div>
      </section>

      <section className="block">
        <h3>{T.buildings} <span className="count-pill">{buildings.length}</span> </h3>
        {buildings.length === 0 ? <p className="empty">—</p> : (
          <ul className="chips-grid">
            {buildings.map((b) => {
              const c = companyById(world, b.companyId);
              return (
                <li key={b.id}>
                  <button className={`b-chip ${b.active ? '' : 'off'}`} onClick={() => onViewCompany(b.companyId)}
                    title={c?.isPlayer ? T.myHouse : c ? companyName(c) : undefined}>
                    <span className="b-chip-icon" style={{ borderColor: c?.color }}><BuildingSprite typeId={b.typeId} size={16} /></span>
                    <span className="b-chip-name">{buildingName(b.typeId)}<small className="lbl"> {c?.isPlayer ? T.meShort : c ? companyName(c) : ''}</small></span>
                    <span className="b-chip-count">×{b.level}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </>
  );
}
