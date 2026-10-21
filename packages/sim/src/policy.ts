import { GOODS, LAW_TECH, TICKS_PER_WEEK, TUNE } from './data';
import { logEvent } from './economy';
import { weeklyOutputValue } from './finance';
import { INVEST_LAWS, TAX_LAWS, WELFARE_LAWS } from './types';
import type { GoodId, InvestLaw, Kingdom, LawChange, PopClass, TaxLaw, WelfareLaw, World } from './types';
import { welfareWeekly } from './welfare';

// 세법·투자법·복지법 (DECISIONS 7-18·7-19): 법은 하나씩. 세법·투자법은 1) 기술로 열리고(LAW_TECH) 2) 금융가 자산 비율이 기준을 넘어야 바꾸기를 시작하고
// 3) TUNE.lawDays 일 동안 바뀌며 4) 끝날 때 조건이 아직 맞아야 바뀐다 (아니면 실패, 지금 법 그대로). 복지법은 조건 없이 TUNE.lawDays 일 뒤 바뀐다.

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

/** 법을 여는 기술을 그 왕국 왕실이 알고 있는가 */
export function lawUnlocked(w: World, k: Kingdom, law: TaxLaw | InvestLaw): boolean {
  const tech = LAW_TECH[law];
  return !tech || !!w.companies.find((c) => c.id === k.governmentId)?.research.known.includes(tech);
}

/** 법의 조건이 지금 맞는가: 기준이 없거나 금융가 비율이 기준 이상. 투자법을 좁히는 쪽(지금 단계 이하)은 늘 맞다 */
function lawConditionMet(k: Kingdom, kind: 'tax' | 'invest', to: TaxLaw | InvestLaw, ratio: number): boolean {
  if (kind === 'invest' && INVEST_LAWS.indexOf(to as InvestLaw) <= INVEST_LAWS.indexOf(k.investLaw)) return true;
  const t = kind === 'tax' ? taxThreshold(to as TaxLaw) : investThreshold(to as InvestLaw);
  return t === null || ratio >= t;
}

export interface LawOption<L> {
  id: L;
  /** 이 법을 여는 기술 (null = 처음부터) */
  tech: string | null;
  /** 기술이 열렸는가 */
  unlocked: boolean;
  /** 조건: 금융가 자산 비율 기준 (null = 조건 없음) */
  threshold: number | null;
  /** 지금 바꾸기를 시작할 수 있는가 (지금 법이면 true) */
  eligible: boolean;
}
export interface LawStatus<L> {
  current: L;
  pending?: LawChange<L>;
  /** 바뀌는 중인 법이 지금 끝나면 바뀌는가 (끝날 때 조건이 맞아야 한다) */
  pendingOk?: boolean;
  options: LawOption<L>[];
}

/** 복지법 상태: 법마다 지금 복지 수준 단계의 주간 예상액 (weekly, 지출이라 0 이하. 'none' 은 0) */
export interface WelfareStatus { current: WelfareLaw; pending?: LawChange<WelfareLaw>; options: { id: WelfareLaw; threshold: null; eligible: true; weekly: number }[] }

/** 정책 창용: 금융가 자산 비율(조건의 지금 값), 세법·투자법의 지금 값·바뀌는 중인 값·선택지마다 여는 기술·조건·고를 수 있는지, 복지법 */
export function policyStatus(w: World, kingdomId: number): { financeRatio: number; tax: LawStatus<TaxLaw>; invest: LawStatus<InvestLaw>; welfare: WelfareStatus } {
  const k = w.kingdoms.find((x) => x.id === kingdomId)!;
  const ratio = financeRatio(w, kingdomId);
  const opt = <L extends TaxLaw | InvestLaw>(kind: 'tax' | 'invest', id: L, cur: L): LawOption<L> => {
    const unlocked = lawUnlocked(w, k, id);
    return { id, tech: LAW_TECH[id], unlocked, threshold: kind === 'tax' ? taxThreshold(id as TaxLaw) : investThreshold(id as InvestLaw), eligible: id === cur || (unlocked && lawConditionMet(k, kind, id, ratio)) };
  };
  const pt = k.lawChange?.tax, pi = k.lawChange?.invest;
  return {
    financeRatio: ratio,
    tax: { current: k.taxLaw, pending: pt, ...(pt ? { pendingOk: lawConditionMet(k, 'tax', pt.to, ratio) } : {}), options: TAX_LAWS.map((id) => opt('tax', id, k.taxLaw)) },
    invest: { current: k.investLaw, pending: pi, ...(pi ? { pendingOk: lawConditionMet(k, 'invest', pi.to, ratio) } : {}), options: INVEST_LAWS.map((id) => opt('invest', id, k.investLaw)) },
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

/** 바꾸기를 시작한다 (같은 법이면 바뀌는 중인 것을 취소). 기술이 안 열렸거나 조건이 안 맞으면 false */
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

const LAW_NAME: Record<TaxLaw | InvestLaw, [string, string]> = {
  land: ['토지세', 'Land tax'], poll: ['인두세', 'Poll tax'], income: ['소득세', 'Income tax'],
  nobles: ['귀족만', 'Nobles only'], upper: ['전문가까지', 'Up to experts'], middle: ['기술자까지', 'Up to skilled'], lower: ['노동자·농부까지', 'Up to labourers and farmers'],
};

/** 매일: 기간이 끝난 법을 바꾼다. 끝날 때 조건이 안 맞으면 실패하고 지금 법이 남는다 (k.lawFail 에 그 틱, 소식 'lawFailed') */
export function updateLaws(w: World) {
  for (const k of w.kingdoms) {
    const ch = k.lawChange;
    if (!ch) continue;
    let ratio: number | undefined;
    for (const kind of ['tax', 'invest'] as const) {
      const c = ch[kind];
      if (!c || w.tick < c.endTick) continue;
      delete ch[kind];
      const [ko, en] = kind === 'tax' ? ['세법', 'tax law'] : ['투자법', 'investment law'];
      const [nk, ne] = LAW_NAME[c.to];
      ratio ??= financeRatio(w, k.id);
      if (!lawConditionMet(k, kind, c.to, ratio)) {
        (k.lawFail ??= {})[kind] = w.tick;
        const t = Math.round(((kind === 'tax' ? taxThreshold(c.to as TaxLaw) : investThreshold(c.to as InvestLaw)) ?? 0) * 100), r = Math.round(ratio * 100);
        logEvent(w, k.governmentId, `${k.name} ${ko} 바꾸기 실패: ${nk} (금융가 ${r}% / 필요 ${t}%)`, { kind: 'warn', topic: 'lawFailed', en: `${k.nameEn} ${en} change failed: ${ne} (financial ${r}% / needs ${t}%)` });
        continue;
      }
      if (kind === 'tax') { k.taxLaw = c.to as TaxLaw; k.lawTick = w.tick; } else k.investLaw = c.to as InvestLaw;
      logEvent(w, k.governmentId, `${k.name} ${ko}이 바뀌었습니다: ${nk}`, { topic: 'lawChanged', en: `${k.nameEn} ${en} changed: ${ne}` });
    }
    if (ch.welfare && w.tick >= ch.welfare.endTick) {
      k.welfareLaw = ch.welfare.to; k.welfareTick = w.tick; delete ch.welfare;
      logEvent(w, k.governmentId, `${k.name} 복지법이 바뀌었습니다: ${k.welfareLaw}`, { topic: 'lawChanged', en: `${k.nameEn} welfare law changed: ${k.welfareLaw}` });
    }
    if (!ch.tax && !ch.invest && !ch.welfare) delete k.lawChange;
  }
}
