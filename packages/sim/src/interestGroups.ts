// 이익집단 (단계 0: 읽기 전용 층, docs/overhaul/INTEREST_GROUPS.md, DESIGN 9.6, DECISIONS 7-45).
// 세계를 바꾸지 않는다. sim 은 이 파일을 부르지 않는다 (화면·사전·진단 CLI 만 부른다). 그래서 이 층이 있어도 결과는 비트까지 같다.
//
// 한 줄 규칙:
// - 회원: pop 은 끌림 가중치(직종별 IG_ATTRACT + 지식인은 문해력 + 자본가는 금융가 지분) 비율대로 이익집단을 나눠 지지한다.
// - 영향력: 이익집단의 정치 힘 = Σ pop (인구 × 부 단계 × 선거 보정치(VOTE_MOD) × 그 집단 몫). 영향력 = 정치 힘 ÷ 모든 집단의 합.
// - 승인: 지금 법 입장의 합(±5까지) + 제안 중이거나 최근에 바뀐 법(5년 동안 줄어듦, ±20까지) + 1년 생활수준 변화(±15까지), 합 ±20까지.
// - 법이 바뀔 확률 (단계 2 규칙의 읽기용 값, lawChance): 찬성 ÷ (찬성 + 반대).
// 투표법은 아직 법이 아니다 (단계 0): 모든 왕국이 DEFAULT_VOTING_LAW 이고, 진단은 opts.votingLaw 로 바꿔 본다.
import { basketCostAt } from './market';
import { INVEST_LAWS, POP_CLASSES, TAX_LAWS, WELFARE_LAWS } from './types';
import type { InvestLaw, Pop, PopClass, Region, TaxLaw, WelfareLaw, World } from './types';

export type IgId = 'landowners' | 'industrialists' | 'petite' | 'rural' | 'unions' | 'intelligentsia';
export const IG_IDS: IgId[] = ['landowners', 'industrialists', 'petite', 'rural', 'unions', 'intelligentsia'];
export const IG_NAMES: Record<IgId, { ko: string; en: string }> = {
  landowners: { ko: '지주', en: 'Landowners' },
  industrialists: { ko: '자본가', en: 'Industrialists' },
  petite: { ko: '소시민', en: 'Petite bourgeoisie' },
  rural: { ko: '농민', en: 'Rural folk' },
  unions: { ko: '노동조합', en: 'Trade unions' },
  intelligentsia: { ko: '지식인', en: 'Intelligentsia' },
};

/**
 * 직종별 끌림 가중치 (빅토리아3 Interest_groups 의 직종 가중치를 우리 직종에 옮김, 근거는 INTEREST_GROUPS.md 3장).
 * pop 은 (이 가중치 + 지식인 끌림 + 자본가 지분 끌림) 의 비율대로 지지를 나눈다
 */
export const IG_ATTRACT: Record<PopClass, Partial<Record<IgId, number>>> = {
  peasant: { rural: 100 },
  farmer: { rural: 100, landowners: 25 },
  unskilled: { unions: 100 },
  skilled: { unions: 100, petite: 50 },
  expert: { industrialists: 100, petite: 50 },
  gentry: { landowners: 50, petite: 50 },
  capitalist: { industrialists: 250 },
  aristocrat: { landowners: 250 },
};
/** 지식인 끌림 = IG_LITERACY_WEIGHT × 문해력(0..1), 문해력이 IG_LITERACY_MIN 미만이면 0 (빅토리아3: 문해력 1%당 +0.2, 50% 미만 0) */
export const IG_LITERACY_WEIGHT = 20;
export const IG_LITERACY_MIN = 0.5;
/**
 * 자본가 지분 끌림 (사용자 결정 7-45: "금융가 지분 가진 사람에게 끌림") = IG_FUND_WEIGHT × (금융가 지분 가치 ÷ 1년 생활비), IG_FUND_MAX 까지.
 * 1년 생활비 = 그 지역 값으로 그 pop 의 부 단계 묶음을 1년 사는 비용 (basketCostAt × 360).
 * 1년 생활비만큼 지분을 가지면 빅토리아3 기술자(Engineers)의 자본가 +50 만큼, 상한은 자본가 직종 가중치 250
 */
export const IG_FUND_WEIGHT = 50;
export const IG_FUND_MAX = 250;

/** 투표법 (단계 0 에서는 읽기용 값, 플레이어 명령 없음). 빅토리아3 권력 분배법의 순서 */
export type VotingLaw = 'autocracy' | 'oligarchy' | 'landed' | 'wealth' | 'census' | 'universal';
export const VOTING_LAWS: VotingLaw[] = ['autocracy', 'oligarchy', 'landed', 'wealth', 'census', 'universal'];
export const VOTING_NAMES: Record<VotingLaw, { ko: string; en: string }> = {
  autocracy: { ko: '전제', en: 'Autocracy' },
  oligarchy: { ko: '과두정', en: 'Oligarchy' },
  landed: { ko: '지주 투표', en: 'Landed voting' },
  wealth: { ko: '재산 투표', en: 'Wealth voting' },
  census: { ko: '인구 조사 선거', en: 'Census suffrage' },
  universal: { ko: '보통 선거', en: 'Universal suffrage' },
};
/** 지금 상황에 가장 가까운 투표법 (모든 왕국): 왕실 하나가 법을 정하고 선거가 없다 (오버홀 05 SD6) */
export const DEFAULT_VOTING_LAW: VotingLaw = 'autocracy';
/**
 * 선거 보정치 (사용자 결정 7-45: "총 부에 선거 보정치를 곱한다"). 값 = 계층 지위 (하층 0.05, 중층 0.2, 상층 1) × 빅토리아3 정치 힘 배율 + 표.
 * 근거는 INTEREST_GROUPS.md 5.2. 인구 조사 선거는 VOTE_LITERACY 의 직종에 문해력을 더한다 (표 × 문해력)
 */
export const VOTE_MOD: Record<VotingLaw, Record<PopClass, number>> = {
  autocracy: { peasant: 0.05, unskilled: 0.05, farmer: 0.05, skilled: 0.2, expert: 0.2, gentry: 0.3, capitalist: 1, aristocrat: 1.5 },
  oligarchy: { peasant: 0.05, unskilled: 0.05, farmer: 0.05, skilled: 0.2, expert: 0.2, gentry: 0.3, capitalist: 1.25, aristocrat: 1.5 },
  landed: { peasant: 0.05, unskilled: 0.05, farmer: 0.05, skilled: 0.2, expert: 0.2, gentry: 1.2, capitalist: 2, aristocrat: 3 },
  wealth: { peasant: 0.05, unskilled: 0.05, farmer: 0.05, skilled: 1.2, expert: 1.2, gentry: 1.2, capitalist: 2, aristocrat: 2 },
  census: { peasant: 0.05, unskilled: 0.05, farmer: 0.05, skilled: 0.2, expert: 0.2, gentry: 0.2, capitalist: 1, aristocrat: 1 },
  universal: { peasant: 1.05, unskilled: 1.05, farmer: 1.05, skilled: 1.2, expert: 1.2, gentry: 1.2, capitalist: 2, aristocrat: 2 },
};
/** 표가 문해력만큼인 투표법과 직종 (빅토리아3 인구 조사 선거: 표당 정치 힘 × 문해력. 부 문턱 10 을 소작농 제외로 옮김) */
export const VOTE_LITERACY: Partial<Record<VotingLaw, PopClass[]>> = {
  census: ['unskilled', 'farmer', 'skilled', 'expert', 'gentry', 'capitalist', 'aristocrat'],
};

export type IgLawKind = 'tax' | 'invest' | 'welfare' | 'voting';
export interface IgStanceTable { tax: Record<TaxLaw, number>; invest: Record<InvestLaw, number>; welfare: Record<WelfareLaw, number>; voting: Record<VotingLaw, number> }
/** 법 입장: +2 강하게 찬성, +1 찬성, 0 중립, −1 반대, −2 강하게 반대 (근거는 INTEREST_GROUPS.md 4장) */
export const IG_STANCES: Record<IgId, IgStanceTable> = {
  landowners: {
    tax: { land: 1, poll: 0, income: -1 },
    invest: { nobles: 1, upper: 0, middle: -1, lower: -1 },
    welfare: { none: 1, poor: 0, wage: -1, universal: -1 },
    voting: { autocracy: 2, oligarchy: 1, landed: 2, wealth: 0, census: -1, universal: -2 },
  },
  industrialists: {
    tax: { land: 0, poll: 1, income: 0 },
    invest: { nobles: -1, upper: 1, middle: 1, lower: 0 },
    welfare: { none: 0, poor: 1, wage: -1, universal: -2 },
    voting: { autocracy: -1, oligarchy: 1, landed: 0, wealth: 1, census: 0, universal: -2 },
  },
  petite: {
    tax: { land: -1, poll: 1, income: 1 },
    invest: { nobles: -1, upper: 0, middle: 1, lower: 0 },
    welfare: { none: 0, poor: 0, wage: 0, universal: 0 },
    voting: { autocracy: -1, oligarchy: -1, landed: -1, wealth: 0, census: 1, universal: -1 },
  },
  rural: {
    tax: { land: -1, poll: 0, income: 0 },
    invest: { nobles: 0, upper: 0, middle: 0, lower: 1 },
    welfare: { none: -1, poor: 1, wage: 0, universal: 1 },
    voting: { autocracy: 0, oligarchy: 0, landed: 0, wealth: 0, census: 0, universal: 0 },
  },
  unions: {
    tax: { land: 0, poll: -1, income: 0 },
    invest: { nobles: 0, upper: 0, middle: 0, lower: 1 },
    welfare: { none: -2, poor: 0, wage: 1, universal: 2 },
    voting: { autocracy: -2, oligarchy: -2, landed: -1, wealth: -1, census: 0, universal: 2 },
  },
  intelligentsia: {
    tax: { land: 0, poll: 0, income: 0 },
    invest: { nobles: 0, upper: 0, middle: 0, lower: 0 },
    welfare: { none: 0, poor: 0, wage: 0, universal: 0 },
    voting: { autocracy: -1, oligarchy: -1, landed: 0, wealth: 1, census: 2, universal: 2 },
  },
};
/** 법 순서 (바꾸기 충격의 칸 수) */
export const IG_LAW_ORDER: Record<IgLawKind, readonly string[]> = { tax: TAX_LAWS, invest: INVEST_LAWS, welfare: WELFARE_LAWS, voting: VOTING_LAWS };

/** 승인 한도 (빅토리아3 Interest_groups: 법 입장 합 ±5, 법 바꾸기 ±20, 충성·급진 ±15, 합 ±20) */
export const IG_STANCE_CAP = 5;
export const IG_CHANGE_CAP = 20;
export const IG_SOL_CAP = 15;
export const IG_APPROVAL_CAP = 20;
/**
 * 법 바꾸기 충격: 1칸 / 2칸 / 3칸 이상 (빅토리아3 ±5 / ±10 / ±20). 제안 중에는 그대로, 바뀐 뒤 IG_CHANGE_DAYS 동안 0 으로 줄어든다
 * (빅토리아3 "Proposed or recent changes", 5년. 줄어드는 모양은 확인 못 함: 직선)
 */
export const IG_CHANGE_STEPS = [5, 10, 20];
export const IG_CHANGE_DAYS = 1800;
/** 생활수준 항 = IG_SOL_PER × (지금 ÷ 1년 전 − 1), 회원 수 가중 (근거 없음: 빅토리아3 는 생활수준이 오르면 충성, 내리면 급진. 크기는 확인 못 함) */
export const IG_SOL_PER = 25;
/** 영향력 문턱 (사용자 결정 7-45: 힘센 20% 이상, 빅토리아3 는 20% 넘으면 힘셈 · 4% 아래면 소외, 되돌아가는 18%·5% 는 단계 1 에서) */
export const IG_POWERFUL = 0.2;
export const IG_MARGINAL = 0.04;
/** 기분 문턱 (빅토리아3: 성남 −10 이하, 불만 −5 이하, 만족 +5 이상, 충성 +10 이상) */
export const IG_MOOD_AT = { angry: -10, unhappy: -5, happy: 5, loyal: 10 } as const;
/** 법이 바뀔 확률의 반대 배율: 중립 이상 0.5, 불만 1, 성남 1.5 (빅토리아3 정체 확률), 왕실 찬성 = 칸당 5% (빅토리아3 통치자 ±5%/칸) */
export const LAW_OPPOSE_MULT: Record<IgMood, number> = { angry: 1.5, unhappy: 1, neutral: 0.5, happy: 0.5, loyal: 0.5 };
export const LAW_CROWN_PER_STEP = 0.05;

export type IgMood = 'angry' | 'unhappy' | 'neutral' | 'happy' | 'loyal';
export type IgStatusLevel = 'powerful' | 'influential' | 'marginal';

/** 지난 법 바꾸기 (단계 0 에서는 세계가 기록하지 않는다: 진단 CLI 가 날마다 법을 보고 넘겨 준다. 단계 1 에서 Kingdom 에 기록) */
export interface IgLawChange { kind: IgLawKind; from: string; to: string; tick: number }
export interface IgOptions {
  /** 투표법 (없으면 DEFAULT_VOTING_LAW) */
  votingLaw?: VotingLaw;
  /** 이 왕국의 지난 법 바꾸기 (없으면 충격 0) */
  lawHist?: IgLawChange[];
}

export interface IgRow {
  id: IgId;
  name: string;
  nameEn: string;
  /** 회원 수 (끌림 몫 × 인구, 부양가족 포함) */
  members: number;
  /** 정치 힘 = Σ 인구 × 부 단계 × 선거 보정치 × 몫 */
  strength: number;
  /** 영향력 0..1 (모든 집단 합 1) */
  clout: number;
  status: IgStatusLevel;
  /** 승인 −20..20 = stances + change + sol (합 한도) */
  approval: number;
  parts: { stances: number; change: number; sol: number };
  /** change 중 지금 제안 중인(바뀌는 중인) 법의 몫 */
  pending: number;
  mood: IgMood;
  /** 지금 법 입장 */
  stance: Record<IgLawKind, number>;
}
export interface IgStatus { kingdomId: number; votingLaw: VotingLaw; groups: IgRow[] }

const clamp = (x: number, cap: number) => Math.max(-cap, Math.min(cap, x));

/** pop 이 가진 금융가 지분 가치 = Σ 지분 수 × 그 금융가 지분 값 (저택 지분 등 금융가가 아닌 건물은 세지 않는다) */
export function igFundValue(p: Pop, nav: Map<number, number>): number {
  const f = p.fund;
  if (!f) return 0;
  let v = 0;
  for (let i = 0; i < f.id.length; i++) { const n = nav.get(f.id[i]); if (n !== undefined) v += f.u[i] * n; }
  return v;
}

/** 금융가 건물 id → 지분 값 */
export function igNavs(w: World): Map<number, number> {
  const m = new Map<number, number>();
  for (const b of w.buildings) if (b.typeId === 'finance') m.set(b.id, b.nav ?? 1);
  return m;
}

/** pop 의 1년 생활비 = 그 지역 값으로 부 단계 묶음을 1년 사는 비용 (pop 전체) */
export function igYearCost(r: Region, p: Pop): number {
  return basketCostAt(r, p.size, p.wealth) * 360;
}

/** 자본가 지분 끌림 = IG_FUND_WEIGHT × 지분 가치 ÷ 1년 생활비 (IG_FUND_MAX 까지. 생활비가 0 이하이고 지분이 있으면 상한) */
export function igFundAttraction(fundValue: number, yearCost: number): number {
  if (fundValue <= 0) return 0;
  return yearCost > 0 ? Math.min(IG_FUND_MAX, (IG_FUND_WEIGHT * fundValue) / yearCost) : IG_FUND_MAX;
}

/** pop 의 이익집단 몫 (합 1, 끌림이 모두 0 이면 빈 값). fundValue = 금융가 지분 가치 (igFundValue), yearCost = 1년 생활비 (igYearCost) */
export function igMembership(p: Pop, fundValue = 0, yearCost = 0): Partial<Record<IgId, number>> {
  const base = IG_ATTRACT[p.prof];
  const lit = p.literacy >= IG_LITERACY_MIN ? IG_LITERACY_WEIGHT * p.literacy : 0;
  const fund = igFundAttraction(fundValue, yearCost);
  let total = lit + fund;
  for (const g of IG_IDS) total += base[g] ?? 0;
  const out: Partial<Record<IgId, number>> = {};
  if (total <= 0) return out;
  for (const g of IG_IDS) {
    const v = (base[g] ?? 0) + (g === 'intelligentsia' ? lit : 0) + (g === 'industrialists' ? fund : 0);
    if (v > 0) out[g] = v / total;
  }
  return out;
}

/** 선거 보정치 (투표법·직종, 인구 조사 선거는 + 문해력) */
export function igVoteMod(law: VotingLaw, p: Pop): number {
  return VOTE_MOD[law][p.prof] + (VOTE_LITERACY[law]?.includes(p.prof) ? p.literacy : 0);
}

/** 정치 힘에 쓰는 부 = 인구 × 부 단계 */
export function igWealth(p: Pop): number {
  return p.size * p.wealth;
}

/** 기분 단계 */
export function igMood(approval: number): IgMood {
  if (approval <= IG_MOOD_AT.angry) return 'angry';
  if (approval <= IG_MOOD_AT.unhappy) return 'unhappy';
  if (approval < IG_MOOD_AT.happy) return 'neutral';
  if (approval < IG_MOOD_AT.loyal) return 'happy';
  return 'loyal';
}

/** 영향력 단계 */
export function igStatus(clout: number): IgStatusLevel {
  return clout >= IG_POWERFUL ? 'powerful' : clout < IG_MARGINAL ? 'marginal' : 'influential';
}

/** 집단의 법 입장 */
export function igStance(g: IgId, kind: IgLawKind, law: string): number {
  return (IG_STANCES[g][kind] as Record<string, number>)[law] ?? 0;
}

/** 법 바꾸기의 칸 수 */
export function igLawSteps(kind: IgLawKind, from: string, to: string): number {
  const order = IG_LAW_ORDER[kind];
  return Math.abs(order.indexOf(to) - order.indexOf(from));
}

/** 법 바꾸기 하나의 충격 크기 (칸 수로, 방향 부호 없음) */
export function igChangeSize(kind: IgLawKind, from: string, to: string): number {
  const steps = igLawSteps(kind, from, to);
  return steps <= 0 ? 0 : IG_CHANGE_STEPS[Math.min(steps, IG_CHANGE_STEPS.length) - 1];
}

/** 법 바꾸기가 집단에 주는 충격 (입장이 오르면 +, 내리면 −, 같으면 0) */
export function igChangeShock(g: IgId, ch: { kind: IgLawKind; from: string; to: string }): number {
  const d = igStance(g, ch.kind, ch.to) - igStance(g, ch.kind, ch.from);
  return d === 0 ? 0 : Math.sign(d) * igChangeSize(ch.kind, ch.from, ch.to);
}

/** 왕국의 지금 법 (투표법은 opts) */
function lawsOf(w: World, kingdomId: number, votingLaw: VotingLaw): Record<IgLawKind, string> | undefined {
  const k = w.kingdoms.find((x) => x.id === kingdomId);
  return k && { tax: k.taxLaw, invest: k.investLaw, welfare: k.welfareLaw, voting: votingLaw };
}

/** 왕국의 직종별 1년 생활수준 변화율 (매달 지표 w.metrics, 1년 전 점이 없으면 null) */
function solChange(w: World, kingdomId: number): Partial<Record<PopClass, number>> | null {
  const m = w.metrics;
  if (!m?.length) return null;
  const now = m[m.length - 1];
  let prev;
  for (let i = m.length - 2; i >= 0; i--) if (m[i].tick <= now.tick - 360) { prev = m[i]; break; }
  const a = now.kingdoms[kingdomId]?.solBy, b = prev?.kingdoms[kingdomId]?.solBy;
  if (!a || !b) return null;
  const out: Partial<Record<PopClass, number>> = {};
  for (const c of POP_CLASSES) if (b[c] > 0 && a[c] > 0) out[c] = a[c] / b[c] - 1;
  return out;
}

/** 왕국의 이익집단: 회원·정치 힘·영향력·승인·기분. 세계를 바꾸지 않는다 */
export function interestGroups(w: World, kingdomId: number, opts: IgOptions = {}): IgStatus {
  const votingLaw = opts.votingLaw ?? DEFAULT_VOTING_LAW;
  const laws = lawsOf(w, kingdomId, votingLaw);
  const inK = new Map(w.regions.filter((r) => r.kingdomId === kingdomId).map((r) => [r.id, r]));
  const nav = igNavs(w);
  const members = {} as Record<IgId, number>, strength = {} as Record<IgId, number>;
  const byClass = {} as Record<IgId, Partial<Record<PopClass, number>>>;
  for (const g of IG_IDS) { members[g] = 0; strength[g] = 0; byClass[g] = {}; }
  for (const p of w.pops) {
    if (!inK.has(p.regionId) || p.size <= 0) continue;
    const fv = igFundValue(p, nav), share = igMembership(p, fv, fv > 0 ? igYearCost(inK.get(p.regionId)!, p) : 0), power = igVoteMod(votingLaw, p) * igWealth(p);
    for (const g of IG_IDS) {
      const s = share[g];
      if (!s) continue;
      members[g] += p.size * s;
      strength[g] += power * s;
      byClass[g][p.prof] = (byClass[g][p.prof] ?? 0) + p.size * s;
    }
  }
  const total = IG_IDS.reduce((a, g) => a + strength[g], 0);
  const sol = solChange(w, kingdomId);
  const k = w.kingdoms.find((x) => x.id === kingdomId);
  const groups = IG_IDS.map((g): IgRow => {
    const stance = { tax: 0, invest: 0, welfare: 0, voting: 0 } as Record<IgLawKind, number>;
    if (laws) for (const kind of Object.keys(stance) as IgLawKind[]) stance[kind] = igStance(g, kind, laws[kind]);
    const stances = clamp(stance.tax + stance.invest + stance.welfare + stance.voting, IG_STANCE_CAP);
    let pending = 0;
    const lc = k?.lawChange;
    if (laws && lc) for (const kind of ['tax', 'invest', 'welfare'] as const) { const c = lc[kind]; if (c) pending += igChangeShock(g, { kind, from: laws[kind], to: c.to }); }
    let change = pending;
    for (const ch of opts.lawHist ?? []) {
      const age = w.tick - ch.tick;
      if (age < 0 || age >= IG_CHANGE_DAYS) continue;
      change += igChangeShock(g, ch) * (1 - age / IG_CHANGE_DAYS);
    }
    change = clamp(change, IG_CHANGE_CAP);
    let solTerm = 0;
    if (sol) {
      let n = 0, d = 0;
      for (const [c, m] of Object.entries(byClass[g]) as [PopClass, number][]) { const x = sol[c]; if (x !== undefined) { n += m; d += m * x; } }
      if (n > 0) solTerm = clamp(IG_SOL_PER * (d / n), IG_SOL_CAP);
    }
    const approval = clamp(stances + change + solTerm, IG_APPROVAL_CAP);
    const clout = total > 0 ? strength[g] / total : 0;
    return {
      id: g, name: IG_NAMES[g].ko, nameEn: IG_NAMES[g].en, members: members[g], strength: strength[g], clout, status: igStatus(clout),
      approval, parts: { stances, change, sol: solTerm }, pending, mood: igMood(approval), stance,
    };
  });
  return { kingdomId, votingLaw, groups };
}

export interface LawChanceRow { id: IgId; side: 'for' | 'against' | 'none'; clout: number; mood: IgMood; weight: number }
export interface LawChance {
  /** 바뀔 확률 0..1 = support ÷ (support + oppose) (반대가 0 이면 1) */
  chance: number;
  /** 찬성 = 새 법을 더 좋아하는 소외되지 않은 집단의 영향력 합 + 왕실 (칸당 LAW_CROWN_PER_STEP) */
  support: number;
  /** 반대 = 새 법을 덜 좋아하는 소외되지 않은 집단의 영향력 × LAW_OPPOSE_MULT[기분] 합 */
  oppose: number;
  crown: number;
  groups: LawChanceRow[];
}

/**
 * 법이 바뀔 확률 (단계 2 규칙의 읽기용 값, 지금은 아무것도 바꾸지 않는다. 사용자 결정 7-45 "빅토리아처럼 확률"):
 * 바뀔 확률 = 찬성 ÷ (찬성 + 반대). 기분은 이 법을 제안했을 때의 승인으로 잰다 (아직 제안 전이면 제안 충격을 더한다).
 * kind 'voting' 은 opts.votingLaw 를 지금 법으로 본다
 */
export function lawChance(w: World, kingdomId: number, kind: IgLawKind, to: string, opts: IgOptions = {}): LawChance {
  const st = interestGroups(w, kingdomId, opts);
  const laws = lawsOf(w, kingdomId, st.votingLaw);
  const from = laws?.[kind] ?? to;
  const steps = igLawSteps(kind, from, to);
  if (!laws || steps === 0) return { chance: 1, support: 0, oppose: 0, crown: 0, groups: [] };
  const k = w.kingdoms.find((x) => x.id === kingdomId);
  const pendingTo = kind === 'voting' ? undefined : k?.lawChange?.[kind]?.to;
  const crown = LAW_CROWN_PER_STEP * steps;
  let support = crown, oppose = 0;
  const groups = st.groups.map((r): LawChanceRow => {
    const d = igStance(r.id, kind, to) - igStance(r.id, kind, from);
    // 이 법이 이미 제안 중이면 승인에 충격이 들어 있다. 아니면 (다른 법이 제안 중이어도) 이 법의 충격으로 바꿔 잰다
    let approval = r.approval;
    if (pendingTo !== to) {
      const old = pendingTo ? igChangeShock(r.id, { kind, from, to: pendingTo }) : 0;
      approval = clamp(r.parts.stances + clamp(r.parts.change - old + igChangeShock(r.id, { kind, from, to }), IG_CHANGE_CAP) + r.parts.sol, IG_APPROVAL_CAP);
    }
    const mood = igMood(approval);
    const counts = r.status !== 'marginal';
    if (!counts || d === 0) return { id: r.id, side: 'none', clout: r.clout, mood, weight: 0 };
    if (d > 0) { support += r.clout; return { id: r.id, side: 'for', clout: r.clout, mood, weight: r.clout }; }
    const wgt = r.clout * LAW_OPPOSE_MULT[mood];
    oppose += wgt;
    return { id: r.id, side: 'against', clout: r.clout, mood, weight: wgt };
  });
  return { chance: oppose > 0 ? support / (support + oppose) : 1, support, oppose, crown, groups };
}
