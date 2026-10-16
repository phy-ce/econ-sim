import { useMemo, useState } from 'react';
import {
  BUILDING_BY_ID, GOOD_IDS, REGIONS, GOODS, LAND_NAMES, LAND_TYPES,
  companyById, landFree, landUsed, regionAvgWealth, regionPopulation, regionUnemployment,
} from '@econ/sim';
import type { GoodId, HistoryPoint, Region, World } from '@econ/sim';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { BuildingSprite, GoodSprite, Sprite64 } from '../sprites';
import { PriceGauge } from './PriceGauge';
import { SourceBreakdown } from './SourceBreakdown';
import { ClassDonut } from './ClassDonut';
import { TimeChart } from './Chart';
import { Info, Meter } from '../ui';
import { compact, compactMoney, int, money, one, pct } from '../format';

type SortKey = 'value' | 'name' | 'price' | 'ratio' | 'balance';

export function RegionPanel({ world, region, history, selectedGood, onSelectGood, onViewCompany }: {
  world: World; region: Region; history: HistoryPoint[]; selectedGood: GoodId; onSelectGood: (g: GoodId) => void; onViewCompany: (companyId: number) => void;
}) {
  const r = region;
  const pop = regionPopulation(r);
  const buildings = world.buildings.filter((b) => b.regionId === r.id).sort((a, b) => b.level - a.level);
  const landless = Math.max(0, r.households.peasant.population - r.subsistenceWorkers);
  const lower = r.households.peasant.population + r.households.unskilled.population;
  const laborer = r.households.unskilled;
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
    if (sort.key === 'name') return GOODS[a].name.localeCompare(GOODS[b].name, 'ko') * sort.dir;
    const ma = r.market[a], mb = r.market[b];
    const v = (g: GoodId, m: typeof ma) =>
      sort.key === 'value' ? m.price * (m.supplyEma + m.demandEma) / 2 : sort.key === 'price' ? m.price : sort.key === 'ratio' ? m.price / GOODS[g].basePrice : m.supplyEma - m.demandEma;
    return (v(a, ma) - v(b, mb)) * sort.dir;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [sort, r.id, week]);
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
          <h2>{r.name}</h2>
          {r.spaceport && <span className="pill soft">개항장</span>}
          <span className="lbl" style={{ flexBasis: '100%' }}>{r.description}</span>
          {Object.entries(REGIONS.find((d) => d.id === r.id)?.perks ?? {}).length > 0 && (
            <span style={{ flexBasis: '100%', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {Object.entries(REGIONS.find((d) => d.id === r.id)!.perks).map(([t, v]) => (
                <span key={t} className="tag-soft" title="이 지역 특성: 이 건물의 생산량이 늘어납니다">
                  <BuildingSprite typeId={t} size={16} /> {BUILDING_BY_ID[t]?.name} +{Math.round((v ?? 0) * 100)}%
                </span>
              ))}
            </span>
          )}
        </div>
        <div className="stats">
          <div className="stat"><span className="stat-label">인구</span><span className="stat-value">{compact(pop)}</span></div>
          <div className="stat">
            <span className="stat-label">1인당 부</span>
            <span className={`stat-value ${regionAvgWealth(r) < 4 ? 'neg' : ''}`}>{regionAvgWealth(r).toFixed(1)}</span>
            <span className="stat-sub">노동자 {laborer.wealth.toFixed(1)} · 실업 {pct(regionUnemployment(world, r.id, 'unskilled'))}</span>
          </div>
          <div className="stat"><span className="stat-label">교육</span><span className="stat-value">{pct(r.education)}</span></div>
          <div className="stat"><span className="stat-label">소작농</span><span className="stat-value accent">{pct(lower > 0 ? r.households.peasant.population / lower : 0)}</span></div>
        </div>
      </header>

      <section className="block">
        <h3>땅 사용 <Info text={<>
          빈 농지·산림 {landFree(world, r.id, 'arable')}·{landFree(world, r.id, 'forest')}칸을 소작농 {int(r.subsistenceWorkers)}명이 빌려 짓습니다.
          {landless > 1 ? ` 땅을 못 빌린 소작농 ${int(landless)}명은 아무것도 얻지 못합니다.` : ''} 건물이 땅을 차지하면 소작농이 밀려나 노동자가 됩니다.
        </>} /></h3>
        <div className="land">
          {LAND_TYPES.map((l) => {
            const used = landUsed(world, r.id, l), total = r.land[l];
            if (total === 0) return null;
            return [
              <span key={`${l}n`}>{LAND_NAMES[l]}</span>,
              <Meter key={`${l}m`} value={used / total} cells={20} tone={l === 'arable' ? 'pos' : l === 'plot' ? 'accent' : 'gold'} label={`${LAND_NAMES[l]} ${used}/${total}`} />,
              <span key={`${l}v`} className="num">{used}/{total}</span>,
            ];
          })}
        </div>
      </section>

      <section className="block">
        <h3>계층 <Info text="부 5 아래는 가난해 인구가 조금씩 줄고, 식량 충족이 90% 아래면 굶어 줄어듭니다. 15 위부터는 출생이 줄어 증가가 완만해집니다. 소작농은 판 것을 전부 지주에게 지대로 내고 현물만 갖습니다." /></h3>
        <ClassDonut region={r} />
      </section>

      <section className="block">
        <h3>시세 <Info text="행을 누르면 아래에 그 상품의 수요·공급 출처와 가격 추이가 나옵니다. 가운데 선이 기본가이고, 표시가 왼쪽(녹색)이면 남아돌아 싸고 오른쪽(붉은색)이면 모자라 비쌉니다. 이동은 이웃 지역에서 들어온(+) 또는 나간(−) 하루 물량입니다." /></h3>
        <div className="table-scroll">
          <table className="goods">
            <thead><tr>
              {sortTh('name', '상품')}{sortTh('price', '가격')}{sortTh('ratio', '기본가 대비')}
              {sortTh('balance', '공급/수요')}{sortTh('value', '거래액')}
            </tr></thead>
            <tbody>
              {goods.map((g) => {
                const m = r.market[g];
                const net = m.shippedIn - m.shippedOut;
                const short = m.supplyEma < m.demandEma * 0.5 && m.demandEma > 1;
                return (
                  <tr key={g} className={g === selectedGood ? 'selected' : ''} onClick={() => onSelectGood(g)} tabIndex={0} aria-selected={g === selectedGood}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectGood(g); } }}>
                    <td><span className="good-name"><GoodSprite g={g} /> {GOODS[g].name}</span></td>
                    <td>{money(m.price)}</td>
                    <td style={{ width: 130 }}><PriceGauge ratio={m.price / GOODS[g].basePrice} compact /></td>
                    <td className={short ? 'neg strong' : ''}>{compact(m.supplyEma)} / {compact(m.demandEma)}</td>
                    <td title={Math.abs(net) < 0.05 ? undefined : `이웃 지역과 하루 ${net > 0 ? '+' : '−'}${one(Math.abs(net))} 이동`}>{compactMoney(m.price * (m.supplyEma + m.demandEma) / 2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <SourceBreakdown good={selectedGood} m={r.market[selectedGood]} />
        <div className="price-chart">
          <div className="card-head">
            <span className="good-name strong"><GoodSprite g={selectedGood} /> {GOODS[selectedGood].name} 가격 추이</span>
            <span className="lbl">기본가 {money(GOODS[selectedGood].basePrice)}</span>
          </div>
          <TimeChart data={priceData} series={[{ key: 'price', name: '가격', color: 'var(--accent)' }]}
            format={(v) => `ƒ${v.toFixed(v < 10 ? 1 : 0)}`} reference={{ y: GOODS[selectedGood].basePrice, label: '기본가' }} height={150} />
        </div>
      </section>

      <section className="block">
        <h3>건물 <span className="count-pill">{buildings.length}</span> <Info text="누르면 그 상회의 건물 상세가 오른쪽에 열립니다." /></h3>
        {buildings.length === 0 ? <p className="empty">아직 이 지역에 건물이 없습니다.</p> : (
          <ul className="chips-grid">
            {buildings.map((b) => {
              const c = companyById(world, b.companyId);
              return (
                <li key={b.id}>
                  <button className={`b-chip ${b.active ? '' : 'off'}`} onClick={() => onViewCompany(b.companyId)}
                    title={`${c?.isPlayer ? '내 상회' : c?.name ?? ''} · ${c?.isPlayer ? '내 회사 보기' : '건물 상세 보기'}`}>
                    <span className="b-chip-icon" style={{ borderColor: c?.color }}><BuildingSprite typeId={b.typeId} size={16} /></span>
                    <span className="b-chip-name">{BUILDING_BY_ID[b.typeId].name}<small className="lbl"> {c?.isPlayer ? '나' : c?.name}</small></span>
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
