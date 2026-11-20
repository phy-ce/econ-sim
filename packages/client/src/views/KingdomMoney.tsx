import { Button as UIButton } from '../ui/controls';
import { creditLimit } from '@econ/sim';
import type { World } from '@econ/sim';
import { kingdomStats } from '../kingdomStats';
import { useT } from '../i18n';
import { NumericValue } from '../NumericValue';
import { MetricRow } from '../system-02/blocks';
import { Coins, Landmark, House, Wallet } from 'lucide-react';

export function KingdomMoney({
  world,
  id,
  includePrivate = false,
  onFinance,
}: {
  world: World;
  id: number;
  includePrivate?: boolean;
  onFinance?: () => void;
}) {
  const T = useT(),
    d = kingdomStats(world, id),
    government = d.government;
  if (!government) return null;
  const reserve = d.production.filter((b) => !b.stateOwned).reduce((n, b) => n + (b.reserve ?? 0), 0);
  const manor = d.buildings.filter((b) => b.typeId === 'manor').reduce((n, b) => n + (b.cash ?? 0), 0),
    finance = d.buildings.filter((b) => b.typeId === 'finance').reduce((n, b) => n + (b.cash ?? 0), 0);
  return (
    <div className="kingdom-money es-metric-list">
      <MetricRow
        label={
          <>
            {T.treasury}
            {government.isPlayer && onFinance ? ' ↗' : ''}
          </>
        }
        icon={<Wallet />}
        value={
          <>
            <span className={d.treasury < 0 ? 'neg' : undefined}>
              <NumericValue value={d.treasury} format="compactMoney" />
            </span>{' '}
            / <NumericValue value={creditLimit(world, government)} format="compactMoney" />
          </>
        }
        onSelect={government.isPlayer ? onFinance : undefined}
      />
      <MetricRow
        label={T.lastWeekPL}
        icon={<Coins />}
        value={
          <span className={government.lastWeekProfit < 0 ? 'neg' : 'pos'}>
            <NumericValue value={government.lastWeekProfit} format="signedCompactMoney" />
          </span>
        }
      />
      {includePrivate && (
        <>
          <MetricRow
            label={T.privateOwner}
            icon={<Wallet />}
            value={<NumericValue value={d.privateFunds} format="compactMoney" />}
          />
          <MetricRow
            label={T.system.reserve}
            icon={<Coins />}
            value={<NumericValue value={reserve} format="compactMoney" />}
            help={T.reserveIncludedInPrivateCash}
          />
          <MetricRow
            label={T.system.manor}
            icon={<House />}
            value={<NumericValue value={manor} format="compactMoney" />}
          />
          <MetricRow
            label={T.system.finance}
            icon={<Landmark />}
            value={<NumericValue value={finance} format="compactMoney" />}
          />
        </>
      )}
    </div>
  );
}
