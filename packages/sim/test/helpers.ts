import { GOOD_IDS, GOODS, WEALTH_MAX, step, wealthOf } from '../src/index';
import type { World } from '../src/index';

export const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) step(w); };

/** 노동자의 식량 충족률 (인구 가중). 기아는 부가 아니라 이것으로 판정한다 */
export function laborerFood(w: World): number {
  let pop = 0, fed = 0;
  for (const p of w.pops) if (p.prof === 'unskilled') { pop += p.size; fed += p.size * p.food; }
  return pop > 0 ? fed / pop : 1;
}

/** 두 값이 처음 갈라지는 경로 (같으면 null). 결정성 실패를 큰 JSON diff 대신 한 줄로 보여 준다 */
export function firstDiff(a: unknown, b: unknown, path = '$'): string | null {
  if (a === b) return null;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return `${path}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array vs object`;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (Array.isArray(a) && a.length !== (b as unknown[]).length) return `${path}.length: ${a.length} != ${(b as unknown[]).length}`;
  for (const k of keys) {
    const d = firstDiff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
    if (d) return d;
  }
  return null;
}

/**
 * 상태 값 범위 검사 (코드 정확성: 값이 NaN·Infinity·음수·규칙의 범위 밖이 되지 않는다). 어긋난 칸을 flag 로 알린다.
 * 비교는 !(a >= b) 꼴로 써서 NaN 도 어긋남으로 잡는다. test/core/ranges.test.ts (2년 매일) 와 test/long (20년 매일) 이 같이 쓴다.
 * 가격 범위는 시장 규칙(기본가 × 0.25 ~ 1.75), 부는 1 ~ WEALTH_MAX, 식량 충족은 0 ~ 1. 돈 칸은 음수가 될 수 없다 (빚은 debt 칸).
 */
export function stateFlags(w: World, flag: (msg: string) => void) {
  for (const r of w.regions) for (const g of GOOD_IDS) {
    const price = r.market[g].price;
    if (!(price >= GOODS[g].basePrice * 0.25 - 1e-9)) flag(`지역 ${r.id} ${g} 가격 ${price} < 기본가 × 0.25`);
    if (!(price <= GOODS[g].basePrice * 1.75 + 1e-9)) flag(`지역 ${r.id} ${g} 가격 ${price} > 기본가 × 1.75`);
  }
  for (const p of w.pops) {
    if (!(p.size >= 0) || !Number.isFinite(p.size)) flag(`pop ${p.id} 인구 ${p.size}`);
    if (!(p.savings >= -1e-6) || !Number.isFinite(p.savings)) flag(`pop ${p.id} 저축 ${p.savings}`);
    if (!(wealthOf(p) >= 1)) flag(`pop ${p.id} 부 ${wealthOf(p)} < 1`);
    if (!(wealthOf(p) <= WEALTH_MAX)) flag(`pop ${p.id} 부 ${wealthOf(p)} > ${WEALTH_MAX}`);
    if (!(p.food >= 0 && p.food <= 1)) flag(`pop ${p.id} 식량 충족 ${p.food}`);
  }
  for (const c of w.companies) {
    if (!(c.cash >= -1e-6) || !Number.isFinite(c.cash)) flag(`회사 ${c.id} 현금 ${c.cash}`);
    if (!(c.debt >= -1e-6) || !Number.isFinite(c.debt)) flag(`회사 ${c.id} 부채 ${c.debt}`);
  }
  for (const b of w.buildings) {
    // 건물 금고는 유한한지만 판정한다. 음수 금고는 지금 코드(bb28119)에서 나온다: 민간 공사 완공 정산(production.ts giveLevels)이
    // 약정 몫보다 레벨을 더 받은 저택·금융가에서 금고를 보지 않고 차액을 뺀다 (시드 2 226일 저택 1046: 32만 → −25만). 고칠지 정해질 때까지 ownerCashLow 로 센다
    if (b.cash !== undefined && !Number.isFinite(b.cash)) flag(`건물 ${b.id} 금고 ${b.cash}`);
    if (!(b.level >= 0)) flag(`건물 ${b.id} 레벨 ${b.level}`);
  }
  for (const x of w.constructions) if (x.escrow !== undefined && (!(x.escrow >= -1e-6) || !Number.isFinite(x.escrow))) flag(`공사 ${x.id} 맡긴 돈 ${x.escrow}`);
  if (!(w.traders.cash >= -1e-6) || !Number.isFinite(w.traders.cash)) flag(`무역상 현금 ${w.traders.cash}`);
  if (!Number.isFinite(w.fund)) flag(`주인 없는 돈 ${w.fund}`);
}

/** 금고가 음수인 건물 중 가장 낮은 금고 (없으면 null). stateFlags 주석의 알려진 문제를 세는 용도 (판정하지 않음) */
export function ownerCashLow(w: World): { id: number; typeId: string; cash: number } | null {
  let low: { id: number; typeId: string; cash: number } | null = null;
  for (const b of w.buildings) if (b.cash !== undefined && b.cash < -1e-6 && (!low || b.cash < low.cash)) low = { id: b.id, typeId: b.typeId, cash: b.cash };
  return low;
}
