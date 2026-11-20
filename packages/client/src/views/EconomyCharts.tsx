import { POP_CLASSES, type World } from '@econ/sim';
import { className, useLang, useT } from '../i18n';
import { compact, compactMoney, exactNumber } from '../format';
import { CLASS_COLOR } from '../ui';
import { TimeChart, type Series } from './Chart';
type Metric = 'gdp' | 'perHead' | 'pop' | 'sol' | 'treasury' | 'debt' | 'savings';
export function EconomyCharts({
  world,
  group = 'economy',
  period = 0,
  kingdomId,
}: {
  world: World;
  group?: 'economy' | 'living' | 'finance';
  period?: number;
  kingdomId?: number;
}) {
  const T = useT(),
    S = T.screenText,
    ko = useLang() === 'ko',
    labels = T.screenLists.metricLabels;
  const members = world.kingdoms.filter((k) => kingdomId === undefined || k.id === kingdomId);
  const records = world.metrics.filter((p) => !period || p.tick >= world.tick - period);
  const series = members.map((k) => ({ key: String(k.id), name: ko ? k.name : k.nameEn, color: k.color }));
  const data = (metric: Metric) =>
    records.map((p) => {
      const row: Record<string, number> = { tick: p.tick };
      for (const k of members) {
        const m = p.kingdoms[k.id];
        if (!m) continue;
        const value =
          metric === 'perHead'
            ? m.pop > 0
              ? m.gdp / m.pop
              : NaN
            : metric === 'sol'
              ? m.pop > 0
                ? POP_CLASSES.reduce((s, c) => s + (m.popBy[c] > 0 ? m.popBy[c] * m.solBy[c] : 0), 0) / m.pop
                : NaN
              : m[metric];
        if (Number.isFinite(value)) row[String(k.id)] = value;
      }
      return row;
    });
  const chart = (
    id: string,
    title: string,
    rows: Record<string, number>[],
    lines: Series[],
    format: (v: number) => string,
    help = title,
    reference?: { y: number; label: string; color: string },
    tooltipFormat = exactNumber,
  ) => (
    <section className="economic-chart" data-chart={id} key={id}>
      <h3 tabIndex={0} data-help={help}>
        {title}
      </h3>
      <ul className="legend">
        {lines.map((s) => (
          <li key={s.key}>
            <i className={s.dashed ? 'chart-line-key dashed' : 'chart-line-key'} style={{ borderColor: s.color }} />
            {s.name}
          </li>
        ))}
      </ul>
      {rows.length < 2 ? (
        <p className="chart-pending" tabIndex={0} data-help={S.chartsAppearAfterTwoMonthlyRecords}>
          —
        </p>
      ) : (
        <TimeChart
          data={rows}
          series={lines}
          format={format}
          tooltipFormat={tooltipFormat}
          height={150}
          axisWidth={54}
          reference={reference}
        />
      )}
    </section>
  );
  const metric = (m: Metric) => {
    const money = ['gdp', 'perHead', 'treasury', 'debt', 'savings'].includes(m);
    return chart(
      m,
      labels[m],
      data(m),
      series,
      money ? compactMoney : m === 'sol' ? exactNumber : compact,
      m === 'gdp' || m === 'perHead'
        ? S.estimatedAsTheSumOfDailyHousehold
        : m === 'treasury'
          ? S.treasuryCashBeforeSubtractingGovernmentDebt
          : m === 'sol'
            ? S.populationWeightedMeanOfClassLivingStandards
            : labels[m],
      undefined,
      (v) => (money ? 'ƒ' : '') + exactNumber(v),
    );
  };
  const classes = POP_CLASSES.filter((c) => c !== 'capitalist');
  const classData = records.map((p) => {
    const row: Record<string, number> = { tick: p.tick };
    for (const c of classes) {
      let count = 0,
        sum = 0;
      for (const k of members) {
        const m = p.kingdoms[k.id];
        if (m && m.popBy[c] > 0) {
          count += m.popBy[c];
          sum += m.popBy[c] * m.solBy[c];
        }
      }
      if (count > 0) row[c] = sum / count;
    }
    return row;
  });
  const rateSeries = members.flatMap((k) => [
    { key: k.id + ':jobs', name: (ko ? k.name : k.nameEn) + ' · ' + labels.unemployment, color: k.color },
    { key: k.id + ':literacy', name: (ko ? k.name : k.nameEn) + ' · ' + labels.literacy, color: k.color, dashed: true },
  ]);
  const rates = records.map((p) => {
    const row: Record<string, number> = { tick: p.tick };
    for (const k of members) {
      const m = p.kingdoms[k.id];
      if (m) {
        row[k.id + ':jobs'] = m.joblessShare;
        row[k.id + ':literacy'] = m.literacy;
      }
    }
    return row;
  });
  return (
    <div className="economy-charts">
      {group === 'economy' && (
        <>
          {metric('gdp')}
          {metric('perHead')}
          {chart(
            'harvest',
            T.weatherRegions,
            records.map((p) => ({ tick: p.tick, affected: p.harvestRegions ?? 0 })),
            [{ key: 'affected', name: T.weatherRegions, color: 'var(--bad)' }],
            compact,
            S.harvestWorld,
          )}
        </>
      )}
      {group === 'living' && (
        <>
          {metric('pop')}
          {metric('sol')}
          {chart(
            'classes',
            T.wealthByClassTitle,
            classData,
            classes.map((c) => ({ key: c, name: className(c), color: CLASS_COLOR[c] })),
            exactNumber,
            S.populationWeightedMeanOfClassLivingStandards,
            { y: 5, label: T.povertyLine, color: 'var(--bad)' },
          )}
          {chart(
            'rates',
            labels.unemployment + ' · ' + labels.literacy,
            rates,
            rateSeries,
            (v) => exactNumber(v * 100) + '%',
            undefined,
            undefined,
            (v) => exactNumber(v * 100) + '%',
          )}
        </>
      )}
      {group === 'finance' && (
        <>
          {metric('treasury')}
          {metric('debt')}
          {metric('savings')}
        </>
      )}
    </div>
  );
}
