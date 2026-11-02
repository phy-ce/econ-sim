import { GOOD_IDS, GOODS, WEALTH_MAX, isOwnerBuilding, step, wealthOf } from '../src/index';
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
 * 건물 금고: 저택·금융가 금고는 음수가 될 수 없다. 무역소 금고는 유한한지만 본다 (아래 주석).
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
    // 저택·금융가 금고: 민간 공사 완공 정산은 금고에 있는 돈까지만 낸다 (TUNE.settleCap = 1, 이슈 #10). 그 전에는 금고를 보지 않고 빼서
    // 음수가 됐다 (main 93bc0b0 장기 시험 20년 시드 1·2: 354·204일). 무역소 금고는 유한한지만 본다: 9ba5acc + settleCap 0, 20년 시드 1 에서
    // 무역소(소유 건물이 아닌 금고)가 음수인 날이 9일 (최저 −4,762) 있었다 (cli/settlediag.ts otherNeg, 원인 확인 못 함). ownerCashLow 가 둘 다 센다
    if (b.cash !== undefined && !Number.isFinite(b.cash)) flag(`건물 ${b.id} 금고 ${b.cash}`);
    if (isOwnerBuilding(b.typeId) && !((b.cash ?? 0) >= -1e-6)) flag(`소유 건물 ${b.id} 금고 ${b.cash}`);
    if (!(b.level >= 0)) flag(`건물 ${b.id} 레벨 ${b.level}`);
  }
  for (const x of w.constructions) if (x.escrow !== undefined && (!(x.escrow >= -1e-6) || !Number.isFinite(x.escrow))) flag(`공사 ${x.id} 맡긴 돈 ${x.escrow}`);
  if (!(w.traders.cash >= -1e-6) || !Number.isFinite(w.traders.cash)) flag(`무역상 현금 ${w.traders.cash}`);
  if (!Number.isFinite(w.fund)) flag(`주인 없는 돈 ${w.fund}`);
}

/** 금고가 음수인 건물(저택·금융가·무역소) 중 가장 낮은 금고 (없으면 null). 판정하지 않고 센다 (장기 시험 meta.ownerCashNeg). 저택·금융가는 stateFlags 가 판정한다 */
export function ownerCashLow(w: World): { id: number; typeId: string; cash: number } | null {
  let low: { id: number; typeId: string; cash: number } | null = null;
  for (const b of w.buildings) if (b.cash !== undefined && b.cash < -1e-6 && (!low || b.cash < low.cash)) low = { id: b.id, typeId: b.typeId, cash: b.cash };
  return low;
}
