import { useMemo } from 'react';
import { POP_CLASSES } from '@econ/sim';
import type { HistoryPoint, World } from '@econ/sim';
import { TimeChart } from './Chart';
import { Notifications } from './Notifications';
import { ClassSprite } from '../sprites';
import { CLASS_COLOR, Info } from '../ui';
import { compactMoney, signedCompactMoney } from '../format';
import { className, companyName, useT } from '../i18n';

export function BottomPanel({ world, history, lastReadTick, onRead, onJump, viewedId, onViewCompany }: {
  world: World; history: HistoryPoint[];
  lastReadTick: number; onRead: () => void; onJump: (regionId: number) => void;
  viewedId: number | null; onViewCompany: (companyId: number) => void;
}) {
  const T = useT();
  const wealthData = useMemo(() => history.map((p) => ({ tick: p.tick, ...p.sol })), [history]);
  const series = POP_CLASSES.map((c) => ({ key: c, name: className(c), color: CLASS_COLOR[c] }));
  const rows = world.companies
    .map((c) => ({ c, levels: world.buildings.filter((b) => b.companyId === c.id).reduce((a, b) => a + b.level, 0), net: c.cash - c.debt }))
    .sort((a, b) => b.net - a.net);

  return (
    <div className="bottom">
      <section className="card" aria-label={T.wealthByClass}>
        <div className="card-head">
          <h2>{T.wealthByClassTitle} <Info text={T.wealthInfo} /></h2>
          <ul className="legend">
            {series.map((s) => (
              <li key={s.key}><span className="legend-sp" style={{ color: s.color }}><ClassSprite c={s.key} size={16} /></span>{s.name}</li>
            ))}
          </ul>
        </div>
        <TimeChart data={wealthData} series={series} format={(v) => v.toFixed(0)} height={200} reference={{ y: 5, label: T.povertyLine, color: 'var(--bad)' }} />
      </section>

      <section className="card" aria-label={T.rankings}>
        <h2>{T.rankings}</h2>
        <table className="ranks">
          <thead><tr><th>{T.colHouse}</th><th>{T.colNet}</th><th>{T.colBuildings}</th><th>{T.colLastWeek}</th></tr></thead>
          <tbody>
            {rows.map(({ c, levels, net }) => (
              <tr key={c.id} className={`${c.isPlayer ? 'me' : ''} ${viewedId === c.id ? 'selected' : ''}`}>
                <td>
                  <button className="name-link" onClick={() => onViewCompany(c.id)} aria-current={viewedId === c.id ? 'true' : undefined}>
                    <span className="swatch" style={{ background: c.color }} />{c.isPlayer ? T.youSuffix(companyName(c)) : companyName(c)}
                  </button>
                </td>
                <td className={net < 0 ? 'neg' : ''}>{compactMoney(net)}</td>
                <td>{levels}</td>
                <td className={c.lastWeekProfit >= 0 ? 'pos' : 'neg'}>{signedCompactMoney(c.lastWeekProfit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <span className="lbl">{T.rankHint}</span>
      </section>

      <section className="card" aria-label={T.news}>
        <Notifications world={world} lastReadTick={lastReadTick} onRead={onRead} onJump={onJump} />
      </section>
    </div>
  );
}
