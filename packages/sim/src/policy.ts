import { GOODS, TICKS_PER_WEEK, TUNE } from './data';
import { logEvent } from './economy';
import { weeklyOutputValue } from './finance';
import { INVEST_LAWS, TAX_LAWS, WELFARE_LAWS } from './types';
import type { GoodId, InvestLaw, Kingdom, LawChange, PopClass, TaxLaw, WelfareLaw, World } from './types';
import { welfareWeekly } from './welfare';

// 세법·투자법·복지법 (DECISIONS 7-18·7-19): 법은 하나씩, 바꾸는 데 TUNE.lawDays 일. 넓은 세법·투자법은 금융가 자산 비율이 기준을 넘어야 고를 수 있다.
// 복지법은 조건 없이 고른다.

/** 투자법마다 금융가 지분을 살 수 있는 계층 (소작농은 열지 않는다) */
export const INVEST_CLASSES: Record<InvestLaw, PopClass[]> = {
  nobles: ['aristocrat', 'gentry'],
  upper: ['aristocrat', 'gentry', 'expert'],
  middle: ['aristocrat', 'gentry', 'expert', 'skilled'],
  lower: ['aristocrat', 'gentry', 'expert', 'skilled', 'unskilled', 'farmer'],
};

/** 법을 고를 수 있는 금융가 자산 비율 (null = 늘 고를 수 있다) */
export function taxThreshold(law: TaxLaw): number | null {
  return law === 'poll' ? TUNE.lawPoll : law === 'income' ? TUNE.lawIncome : null;
}
export function investThreshold(law: InvestLaw): number | null {
  return law === 'upper' ? TUNE.investUpper : law === 'middle' ? TUNE.investMiddle : law === 'lower' ? TUNE.investLower : null;
}

export interface AssetRow { manor: number; finance: number; ratio: number }

/**
 * 저택 대 금융가 자산 (주간, 기본가, 100 단위): 가진 레벨 × 레벨당 주간 산출 가치 + 저택은 그 지역 소작지 수확의 주간 가치.
 * 지역은 주인(저택·금융가)이 있는 지역. ratio = 금융가 ÷ (저택 + 금융가)
 */
export function ownershipAssets(w: World): { kingdoms: (AssetRow & { kingdomId: number })[]; regions: (AssetRow & { regionId: number; kingdomId: number })[] } {
  const byOwner = new Map<number, number>();
  for (const b of w.buildings) {
    if (b.owners) for (const [id, n] of Object.entries(b.owners)) byOwner.set(Number(id), (byOwner.get(Number(id)) ?? 0) + n * weeklyOutputValue(b.typeId, b.methodId));
    if (b.typeId === 'subsistence') {
      const manor = w.buildings.find((x) => x.regionId === b.regionId && x.typeId === 'manor');
      let v = 0;
      for (const [g, q] of Object.entries(b.last.output)) v += (q ?? 0) * GOODS[g as GoodId].basePrice * TICKS_PER_WEEK;
      if (manor) byOwner.set(manor.id, (byOwner.get(manor.id) ?? 0) + v);
    }
  }
  const round = (x: number) => Math.round(x / 100) * 100;
  const row = (m: number, f: number): AssetRow => ({ manor: round(m), finance: round(f), ratio: m + f > 0 ? Math.round((f / (m + f)) * 100) / 100 : 0 });
  const regions = w.regions.map((r) => {
    let m = 0, f = 0;
    for (const b of w.buildings) if (b.regionId === r.id && (b.typeId === 'manor' || b.typeId === 'finance')) { if (b.typeId === 'manor') m += byOwner.get(b.id) ?? 0; else f += byOwner.get(b.id) ?? 0; }
    return { regionId: r.id, kingdomId: r.kingdomId, ...row(m, f), m, f };
  });
  const kingdoms = w.kingdoms.map((k) => {
    const mine = regions.filter((x) => x.kingdomId === k.id);
    return { kingdomId: k.id, ...row(mine.reduce((a, x) => a + x.m, 0), mine.reduce((a, x) => a + x.f, 0)) };
  });
  return { kingdoms, regions: regions.map(({ m: _m, f: _f, ...x }) => x) };
}

/** 왕국의 금융가 자산 비율 (0..1) */
export function financeRatio(w: World, kingdomId: number): number {
  return ownershipAssets(w).kingdoms.find((x) => x.kingdomId === kingdomId)?.ratio ?? 0;
}

export interface LawStatus<L> { current: L; pending?: LawChange<L>; options: { id: L; threshold: number | null; eligible: boolean }[] }

/** 복지법 상태: 법마다 지금 복지 수준 단계의 주간 예상액 (weekly, 지출이라 0 이하. 'none' 은 0) */
export interface WelfareStatus { current: WelfareLaw; pending?: LawChange<WelfareLaw>; options: { id: WelfareLaw; threshold: null; eligible: true; weekly: number }[] }

/** 정책 창용: 금융가 자산 비율, 세법·투자법·복지법의 지금 값·바뀌는 중인 값·고를 수 있는 법 */
export function policyStatus(w: World, kingdomId: number): { financeRatio: number; tax: LawStatus<TaxLaw>; invest: LawStatus<InvestLaw>; welfare: WelfareStatus } {
  const k = w.kingdoms.find((x) => x.id === kingdomId)!;
  const ratio = financeRatio(w, kingdomId);
  const ok = (t: number | null, cur: boolean) => cur || t === null || ratio >= t;
  return {
    financeRatio: ratio,
    tax: { current: k.taxLaw, pending: k.lawChange?.tax, options: TAX_LAWS.map((id) => ({ id, threshold: taxThreshold(id), eligible: ok(taxThreshold(id), id === k.taxLaw) })) },
    // 좁히기는 조건 없이 고를 수 있다
    invest: {
      current: k.investLaw, pending: k.lawChange?.invest,
      options: INVEST_LAWS.map((id) => ({ id, threshold: investThreshold(id), eligible: INVEST_LAWS.indexOf(id) <= INVEST_LAWS.indexOf(k.investLaw) || ok(investThreshold(id), false) })),
    },
    welfare: {
      current: k.welfareLaw, pending: k.lawChange?.welfare,
      options: WELFARE_LAWS.map((id) => ({ id, threshold: null, eligible: true as const, weekly: -roundWeekly(welfareWeekly(k, id, k.budget.welfare)) })),
    },
  };
}

/** 화면에 보일 둥근 주간 금액 (budget.ts roundBudget 과 같은 규칙: 1,000 이상 100 단위, 그 아래 10 단위) */
function roundWeekly(x: number): number {
  const unit = Math.abs(x) >= 1000 ? 100 : 10;
  return Math.round(x / unit) * unit + 0;
}

/** 바꾸기를 시작한다 (같은 법이면 바뀌는 중인 것을 취소). 고를 수 없으면 false */
export function startLawChange(w: World, k: Kingdom, kind: 'tax' | 'invest' | 'welfare', to: TaxLaw | InvestLaw | WelfareLaw): boolean {
  const cur = kind === 'tax' ? k.taxLaw : kind === 'invest' ? k.investLaw : k.welfareLaw;
  if (to === cur) { if (k.lawChange) { delete k.lawChange[kind]; if (!Object.keys(k.lawChange).length) delete k.lawChange; } return true; }
  if (kind === 'welfare') {
    if (!WELFARE_LAWS.includes(to as WelfareLaw)) return false;
  } else {
    const st = policyStatus(w, k.id);
    const opt = (kind === 'tax' ? st.tax.options : st.invest.options).find((o) => o.id === to);
    if (!opt || !opt.eligible) return false;
  }
  const ch = { to, startTick: w.tick, endTick: w.tick + TUNE.lawDays };
  (k.lawChange ??= {})[kind] = ch as LawChange<TaxLaw> & LawChange<InvestLaw> & LawChange<WelfareLaw>;
  return true;
}

/** 매일: 기간이 끝난 법을 바꾼다 */
export function updateLaws(w: World) {
  for (const k of w.kingdoms) {
    const ch = k.lawChange;
    if (!ch) continue;
    if (ch.tax && w.tick >= ch.tax.endTick) {
      k.taxLaw = ch.tax.to; k.lawTick = w.tick; delete ch.tax;
      logEvent(w, k.governmentId, `${k.name} 세법이 바뀌었습니다: ${k.taxLaw}`, { en: `${k.nameEn} tax law changed: ${k.taxLaw}` });
    }
    if (ch.invest && w.tick >= ch.invest.endTick) {
      k.investLaw = ch.invest.to; delete ch.invest;
      logEvent(w, k.governmentId, `${k.name} 투자법이 바뀌었습니다: ${k.investLaw}`, { en: `${k.nameEn} investment law changed: ${k.investLaw}` });
    }
    if (ch.welfare && w.tick >= ch.welfare.endTick) {
      k.welfareLaw = ch.welfare.to; k.welfareTick = w.tick; delete ch.welfare;
      logEvent(w, k.governmentId, `${k.name} 복지법이 바뀌었습니다: ${k.welfareLaw}`, { en: `${k.nameEn} welfare law changed: ${k.welfareLaw}` });
    }
    if (!ch.tax && !ch.invest && !ch.welfare) delete k.lawChange;
  }
}
