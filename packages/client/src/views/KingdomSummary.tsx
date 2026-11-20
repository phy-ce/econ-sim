import { POP_CLASSES, isOwnerBuilding } from '@econ/sim';
import type { Company, GoodId, World } from '@econ/sim';
import { MetricRow, SectionHeading } from '../system-02/blocks';
import { NumericValue } from '../NumericValue';
import { ClassSprite, GoodSprite } from '../sprites';
import { Bar, CLASS_COLOR, Waterfall } from '../ui';
import { int, marginText, one } from '../format';
import { className, goodName, useT } from '../i18n';
import { KingdomTotals } from './KingdomTotals';
import { KingdomMoney } from './KingdomMoney';
import { rowOf, type Row } from './buildingRow';

const qty = (v: number) => (v < 10 ? one(v) : int(v));

function ShortBadge({ gap }: { gap: number }) {
  return gap >= 0.5 ? (
    <span className="badge-bad pxnum">
      −<NumericValue value={gap} format="compact" />
    </span>
  ) : (
    <span />
  );
}

function Summary({ rows }: { rows: Row[] }) {
  const T = useT();
  const staff = POP_CLASSES.map((s) => {
    let emp = 0,
      jobs = 0;
    for (const r of rows)
      for (const p of r.staff)
        if (p.s === s) {
          emp += p.emp;
          jobs += p.jobs;
        }
    return { s, emp, jobs };
  }).filter((x) => x.jobs > 0);
  const short = new Map<GoodId, { cur: number; max: number }>();
  for (const r of rows)
    if (r.inShort)
      for (const f of r.inputs) {
        const x = short.get(f.g) ?? { cur: 0, max: 0 };
        x.cur += f.cur;
        x.max += f.max;
        short.set(f.g, x);
      }
  const shortList = [...short]
    .filter(([, x]) => x.cur < x.max * 0.99)
    .sort((a, b) => a[1].cur / a[1].max - b[1].cur / b[1].max);
  const rev = rows.reduce((a, r) => a + r.rev, 0),
    raw = rows.reduce((a, r) => a + r.raw, 0),
    wage = rows.reduce((a, r) => a + r.wage, 0);
  const profit = rev - raw - wage;

  return (
    <div className="hsum">
      <section className="htile" aria-label={T.hStaff}>
        <SectionHeading>
          <span>{T.hStaff}</span>
        </SectionHeading>
        {staff.map((x) => (
          <MetricRow
            key={x.s}
            label={className(x.s)}
            icon={<ClassSprite c={x.s} size={24} />}
            value={
              <>
                <NumericValue value={x.emp} format="compact" /> / <NumericValue value={x.jobs} format="compact" />
                <ShortBadge gap={x.jobs - x.emp} />
              </>
            }
            track={<Bar value={x.emp / x.jobs} color={CLASS_COLOR[x.s]} vac label={className(x.s)} />}
          />
        ))}
      </section>
      <section className="htile" aria-label={T.fInput}>
        <SectionHeading>
          <span>{T.fInput}</span>
          <span className={`pxnum ${shortList.length ? 'badge-bad' : 'badge-ok'}`}>{shortList.length}</span>
        </SectionHeading>
        {shortList.map(([g, x]) => (
          <MetricRow
            key={g}
            label={goodName(g)}
            icon={<GoodSprite g={g} size={24} />}
            value={
              <>
                {qty(x.cur)} / {qty(x.max)}
              </>
            }
            track={<Bar value={x.cur / x.max} tone="in" vac label={goodName(g)} />}
          />
        ))}
      </section>
      <section className="htile" aria-label={T.balance}>
        <SectionHeading>
          <span>{T.balance}</span>
          <span className="es-heading-value">
            <span className={`pxnum ${profit >= 0 ? 'pos' : 'neg'}`}>
              <NumericValue value={profit} format="signedMoney" />
            </span>
            <span className="lbl" tabIndex={0} data-help={marginText(rev > 0 ? profit / rev : null, { detail: true })}>
              {T.margin}{' '}
              <b className={`pxnum ${profit >= 0 ? 'pos' : 'neg'}`}>
                {marginText(rev > 0 ? profit / rev : null, { signed: true })}
              </b>
            </span>
          </span>
        </SectionHeading>
        <Waterfall rev={rev} raw={raw} wage={wage} labels={[T.wfRev, T.wfRaw, T.wfWage, T.wfProfit]} />
      </section>
    </div>
  );
}

export function KingdomSummary({
  world,
  government,
  onFinance,
  includePrivate = false,
}: {
  world: World;
  government: Company;
  onFinance?: () => void;
  includePrivate?: boolean;
}) {
  const T = useT(),
    regions = new Set(world.regions.filter((r) => r.kingdomId === government.kingdomId).map((r) => r.id));
  const buildings = world.buildings.filter((b) => regions.has(b.regionId));
  const rows = buildings.map((b) => {
    const row = rowOf(world, b);
    return isOwnerBuilding(b.typeId) ? { ...row, rev: 0, raw: 0, wage: 0, profit: 0 } : row;
  });
  return (
    <>
      <KingdomTotals world={world} id={government.kingdomId} />
      <KingdomMoney world={world} id={government.kingdomId} onFinance={onFinance} includePrivate={includePrivate} />
      <Summary rows={rows} />
    </>
  );
}
