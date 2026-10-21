import { TICKS_PER_WEEK, TUNE } from './data';
import { companyById } from './economy';
import { basketCostAt } from './market';
import { round2 } from './rng';
import type { Kingdom, Pop, Region, WelfareLaw, World } from './types';

// ---------------------------------------------------------------- 복지 (최저 생활수준 보장)
//
// 규칙 (한 줄): 매일 왕실은 복지법이 덮는 pop 중 생활수준이 목표(복지 수준 단계)보다 낮은 pop 에게, 그날 소득이 목표 소득에 모자란 만큼을 준다.
// - 목표 소득 = 그 지역 가격으로 (목표 + 1) 부 단계 묶음을 사는 하루 비용 × 인구. 부 단계는 소득이 다음 단계 묶음 비용을 넘어야 오르므로
//   (market.ts updateWealth) 목표 부 단계에 닿으려면 한 단계 위 묶음 비용만큼 벌어야 한다
// - 그날 소득 = 그날 들어온 현금(임금·판매·배당, 세금을 뺀 것) + 먹고 쓴 현물의 시장가
// - 왕실 현금이 모자라면 가진 현금만큼 같은 비율로 나눠 준다 (복지로 빚을 지지 않는다). 돈은 국고에서 pop 저축으로 옮겨 간다 (화폐 보존)
// - 덮는 무리: 'poor' 소작농과 일자리 없는 사람, 'wage' 임금 일자리에서 일하는 사람, 'universal' 둘 다. 상급·하급 귀족과 자본가는 받지 않는다

/** 복지를 받을 수 있는 무리: 'poor' 소작농·실업자, 'wage' 임금 일자리. 귀족·자본가는 null */
export type WelfareGroup = 'poor' | 'wage';

export function welfareGroup(p: Pop): WelfareGroup | null {
  if (p.prof === 'aristocrat' || p.prof === 'gentry' || p.prof === 'capitalist') return null;
  return p.prof === 'peasant' || p.work === 0 ? 'poor' : 'wage';
}

/** 그 법이 그 무리를 덮는가 */
export function welfareCovers(law: WelfareLaw, g: WelfareGroup): boolean {
  return law === 'universal' || law === g;
}

/** 복지 수준 단계(1~5)의 목표 생활수준 */
export function welfareTarget(step: number): number {
  return TUNE.welfareLevels[step - 1];
}

/** 목표 생활수준에 닿는 1인당 하루 소득: (목표 + 1) 부 단계 묶음의 하루 비용 (그 지역 가격) */
export function welfareIncome(r: Region, target: number): number {
  return basketCostAt(r, 1, target + 1);
}

/** pop 의 그날 소득: 현금 소득(세금을 뺀 것) + 먹고 쓴 현물의 시장가 */
function dayIncome(p: Pop, r: Region): number {
  let v = p.lastIncome;
  for (const g in p.inKind) v += (p.inKind[g as keyof typeof p.inKind] ?? 0) * r.market[g as keyof typeof r.market].price;
  return v;
}

const STEPS = 5;

/**
 * 매일: 복지를 주고, 무리·단계별 필요액(Kingdom.welfareNeed)을 갱신한다. 하루 소득 이동평균을 갱신하기 전에 부른다 (tick.ts)
 */
export function payWelfare(w: World) {
  const nk = w.kingdoms.length;
  const kIndex = new Map<number, number>();
  w.kingdoms.forEach((k, i) => kIndex.set(k.id, i));
  // 왕국별 오늘 필요액: [무리][단계]
  const need = w.kingdoms.map(() => ({ poor: new Array(STEPS).fill(0), wage: new Array(STEPS).fill(0), poorShort: new Array(STEPS).fill(0), wageShort: new Array(STEPS).fill(0) }));
  // 화면 전용: 지역·무리별 필요액 ('지역|무리' → 단계별 [필요액, 모자란 사람])
  const needBy = w.kingdoms.map(() => new Map<string, { need: number[]; short: number[] }>());
  const due: { p: Pop; amt: number }[][] = w.kingdoms.map(() => []);
  const total = new Array(nk).fill(0);
  const regionCost = new Map<number, number[]>();
  const regionOf = new Map(w.regions.map((r) => [r.id, r] as const));
  for (const p of w.pops) {
    const g = welfareGroup(p);
    if (!g || p.size <= 0) continue;
    const r = regionOf.get(p.regionId);
    const ki = r && kIndex.get(r.kingdomId);
    if (!r || ki === undefined) continue;
    const k = w.kingdoms[ki];
    let cost = regionCost.get(r.id);
    if (!cost) regionCost.set(r.id, (cost = TUNE.welfareLevels.map((t) => welfareIncome(r, t))));
    const income = dayIncome(p, r);
    const n = need[ki];
    const key = `${r.id}|${g}`;
    let nb = needBy[ki].get(key);
    if (!nb) needBy[ki].set(key, (nb = { need: new Array(STEPS).fill(0), short: new Array(STEPS).fill(0) }));
    for (let s = 0; s < STEPS; s++) {
      const want = p.size * cost[s];
      const gap = Math.max(0, want - income);
      if (gap <= 0) continue;
      // 필요액은 지급 규칙대로 생활수준이 그 단계 목표 아래인 pop 만, 모자란 사람은 생활수준과 상관없이 소득으로 센다
      if (p.sol < TUNE.welfareLevels[s]) { n[g][s] += gap; nb.need[s] += gap; }
      const short = p.size * (want > 0 ? gap / want : 0);
      n[g === 'poor' ? 'poorShort' : 'wageShort'][s] += short;
      nb.short[s] += short;
    }
    if (!welfareCovers(k.welfareLaw, g)) continue;
    const step = k.budget.welfare;
    if (!(p.sol < welfareTarget(step))) continue;
    const amt = Math.max(0, p.size * cost[step - 1] - income);
    if (amt <= 0) continue;
    due[ki].push({ p, amt });
    total[ki] += amt;
  }
  w.kingdoms.forEach((k, ki) => {
    // 필요액 이동평균 (AI 판단과 예산 미리보기용)
    const old = k.welfareNeed;
    const n = need[ki];
    const ema = (a: number[] | undefined, x: number[]) => x.map((v, i) => round2(a?.[i] == null ? v : a[i] * 0.9 + v * 0.1));
    k.welfareNeed = { poor: ema(old?.poor, n.poor), wage: ema(old?.wage, n.wage), poorShort: ema(old?.poorShort, n.poorShort), wageShort: ema(old?.wageShort, n.wageShort) };
    // 지역·무리별 (같은 이동평균. 처음 보는 열쇠는 0 에서 따라간다. 둘 다 거의 0 이면 지운다)
    const ob = k.welfareNeedBy, zero = new Array(STEPS).fill(0), by: Record<string, { need: number[]; short: number[] }> = {};
    for (const key of new Set([...Object.keys(ob ?? {}), ...needBy[ki].keys()])) {
      const x = needBy[ki].get(key) ?? { need: zero, short: zero };
      const prev = ob ? ob[key] ?? { need: zero, short: zero } : undefined;
      const e = { need: ema(prev?.need, x.need), short: ema(prev?.short, x.short) };
      if (e.need.some((v) => v >= 0.01) || e.short.some((v) => v >= 0.01)) by[key] = e;
    }
    k.welfareNeedBy = by;
    if (total[ki] <= 0) return;
    const gov = companyById(w, k.governmentId);
    if (!gov) return;
    const f = Math.min(1, Math.max(0, gov.cash) / total[ki]);
    if (f <= 0) return;
    let paid = 0;
    for (const { p, amt } of due[ki]) {
      const x = amt * f;
      p.savings += x;
      p.lastIncome += x;
      paid += x;
    }
    gov.cash -= paid;
    gov.weekProfit -= paid;
    gov.ledger.welfare += paid;
    const sw = (k.spentWeek ??= { wages: 0, goods: 0 });
    sw.welfare = (sw.welfare ?? 0) + paid;
  });
}

/** 그 법·단계의 하루 복지 필요액 (이동평균) */
export function welfareNeedOf(k: Kingdom, law: WelfareLaw, step: number): number {
  const n = k.welfareNeed;
  if (!n || law === 'none') return 0;
  return (welfareCovers(law, 'poor') ? n.poor[step - 1] ?? 0 : 0) + (welfareCovers(law, 'wage') ? n.wage[step - 1] ?? 0 : 0);
}

/** 그 법·단계에서 목표 소득에 모자란 사람 (모자란 비율로 가중, 이동평균) */
export function welfareShortOf(k: Kingdom, law: WelfareLaw, step: number): number {
  const n = k.welfareNeed;
  if (!n || law === 'none') return 0;
  return (welfareCovers(law, 'poor') ? n.poorShort[step - 1] ?? 0 : 0) + (welfareCovers(law, 'wage') ? n.wageShort[step - 1] ?? 0 : 0);
}

/**
 * 그 법·단계의 주간 복지 예상액 = 하루 필요액(이동평균) × 7. 필요액은 지급 규칙(생활수준이 목표 아래인 pop, 그날 소득과 목표 소득의 차)대로 센다.
 * 지금 법·단계면 실제 지급(현금이 모자라 줄인 몫 전)과 같고, 덮지 않는 무리는 복지를 받기 전 생활수준으로 센다
 */
export function welfareWeekly(k: Kingdom, law: WelfareLaw, step: number): number {
  return welfareNeedOf(k, law, step) * TICKS_PER_WEEK;
}
