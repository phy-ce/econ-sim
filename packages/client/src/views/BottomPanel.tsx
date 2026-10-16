import { useMemo } from 'react';
import { CLASS_DEFS, POP_CLASSES } from '@econ/sim';
import type { HistoryPoint, World } from '@econ/sim';
import { TimeChart } from './Chart';
import { Notifications } from './Notifications';
import { ClassSprite } from '../sprites';
import { CLASS_COLOR, Info } from '../ui';
import { compactMoney, signedCompactMoney } from '../format';

export function BottomPanel({ world, history, lastReadTick, onRead, onJump, viewedId, onViewCompany }: {
  world: World; history: HistoryPoint[];
  lastReadTick: number; onRead: () => void; onJump: (regionId: number) => void;
  viewedId: number | null; onViewCompany: (companyId: number) => void;
}) {
  const wealthData = useMemo(() => history.map((p) => ({ tick: p.tick, ...p.sol })), [history]);
  const series = POP_CLASSES.map((c) => ({ key: c, name: CLASS_DEFS[c].name, color: CLASS_COLOR[c] }));
  const rows = world.companies
    .map((c) => ({ c, levels: world.buildings.filter((b) => b.companyId === c.id).reduce((a, b) => a + b.level, 0), net: c.cash - c.debt }))
    .sort((a, b) => b.net - a.net);

  return (
    <div className="bottom">
      <section className="card" aria-label="계층별 부 단계">
        <div className="card-head">
          <h2>계층별 부 단계 · 왕국 전체 <Info text="부는 1~30 단계입니다. 소득이 다음 단계 소비 묶음 비용을 넘으면 오르고, 지금 단계 비용에 못 미치면 내립니다. 5 아래는 빈곤선입니다." /></h2>
          <ul className="legend">
            {series.map((s) => (
              <li key={s.key}><span className="legend-sp" style={{ color: s.color }}><ClassSprite c={s.key} size={16} /></span>{s.name}</li>
            ))}
          </ul>
        </div>
        <TimeChart data={wealthData} series={series} format={(v) => v.toFixed(0)} height={200} reference={{ y: 5, label: '빈곤선 5', color: 'var(--bad)' }} />
      </section>

      <section className="card" aria-label="상회 순위">
        <h2>상회 순위</h2>
        <table className="ranks">
          <thead><tr><th>상회</th><th>순자산</th><th>건물</th><th>지난주</th></tr></thead>
          <tbody>
            {rows.map(({ c, levels, net }) => (
              <tr key={c.id} className={`${c.isPlayer ? 'me' : ''} ${viewedId === c.id ? 'selected' : ''}`}>
                <td>
                  <button className="name-link" onClick={() => onViewCompany(c.id)} aria-current={viewedId === c.id ? 'true' : undefined}>
                    <span className="swatch" style={{ background: c.color }} />{c.isPlayer ? `${c.name} (나)` : c.name}
                  </button>
                </td>
                <td className={net < 0 ? 'neg' : ''}>{compactMoney(net)}</td>
                <td>{levels}</td>
                <td className={c.lastWeekProfit >= 0 ? 'pos' : 'neg'}>{signedCompactMoney(c.lastWeekProfit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <span className="lbl">상회 이름을 누르면 그 상회의 건물을 볼 수 있습니다.</span>
      </section>

      <section className="card" aria-label="소식">
        <Notifications world={world} lastReadTick={lastReadTick} onRead={onRead} onJump={onJump} />
      </section>
    </div>
  );
}
