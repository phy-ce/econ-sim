import type { GoodId, Kingdom, World } from './types';

/** 관세율 기본값 (도착 왕국이 따로 정하지 않은 상품) */
export const DEFAULT_TARIFF = 0.1;
export function kingdomById(w: World, id: number): Kingdom {
  const k = w.kingdoms.find((x) => x.id === id);
  if (!k) throw new Error(`unknown kingdom ${id}`);
  return k;
}

/** 지역이 속한 왕국 id (없는 지역은 0) */
export function kingdomOf(w: World, regionId: number): number {
  return w.regions.find((r) => r.id === regionId)?.kingdomId ?? 0;
}

/**
 * 화물이 from 에서 to 로 갈 때 붙는 관세율 (화물가 대비). 같은 왕국이면 0.
 * 도착 왕국의 상품별 관세율을 쓴다.
 */
export function borderCost(w: World, from: number, to: number, good: GoodId): number {
  const a = kingdomOf(w, from), b = kingdomOf(w, to);
  if (a === b || b === 0) return 0;
  return kingdomById(w, b).tariff[good] ?? DEFAULT_TARIFF;
}

/** 투자 풀에 넣는다. regionId 가 있으면 그 지역 몫으로도 적는다 (지역 우선 투자) */
export function addToPool(w: World, kingdomId: number, regionId: number | null, amount: number) {
  if (amount <= 0) return;
  const k = kingdomById(w, kingdomId);
  k.investmentPool += amount;
  if (regionId != null) (k.poolByRegion ??= {})[regionId] = (k.poolByRegion[regionId] ?? 0) + amount;
}

/** 관세 수입을 받는 곳: 도착 왕국의 국고 (국영 회사 현금) */
export function payTariff(w: World, to: number, amount: number) {
  if (amount <= 0) return;
  const k = w.kingdoms.find((x) => x.id === kingdomOf(w, to));
  const gov = k && w.companies.find((c) => c.id === k.governmentId);
  if (gov) { gov.cash += amount; k!.revenueWeek += amount; k!.tariffWeek = (k!.tariffWeek ?? 0) + amount; }
  else w.fund += amount;
}
