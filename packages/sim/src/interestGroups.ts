// 이익집단 (단계 0: 읽기 전용 층, docs/overhaul/INTEREST_GROUPS.md, DESIGN 9.6, DECISIONS 7-45).
// 세계를 바꾸지 않는다. sim 은 이 파일을 부르지 않는다 (화면·사전·진단 CLI 만 부른다). 그래서 이 층이 있어도 결과는 비트까지 같다.
//
// 한 줄 규칙:
// - 회원: pop 은 직종별 끌림 가중치(IG_ATTRACT, 지식인은 문해력) 비율대로 이익집단을 나눠 지지한다.
// - 영향력: 이익집단의 정치 힘 = Σ pop (투표법 가중치(VOTE_WEIGHT) × 인구 × 부 단계 × 그 집단 몫). 영향력 = 정치 힘 ÷ 모든 집단의 합.
// - 승인: 지금 법 입장의 합(±5까지) + 최근 법 바꾸기(5년 동안 줄어듦, ±20까지) + 1년 생활수준 변화(±15까지), 합 ±20까지.
// 투표법은 아직 법이 아니다 (단계 0): 모든 왕국이 DEFAULT_VOTING_LAW 이고, 진단은 opts.votingLaw 로 바꿔 본다.
import { INVEST_LAWS, POP_CLASSES, TAX_LAWS, WELFARE_LAWS } from './types';
import type { InvestLaw, Pop, PopClass, TaxLaw, WelfareLaw, World } from './types';

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
 * pop 은 (이 가중치 + 지식인 끌림) 의 비율대로 지지를 나눈다
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

/** 투표법 (단계 0 에서는 읽기용 값, 플레이어 명령 없음): 귀족정 → 재산 투표 → 보통 선거 */
export type VotingLaw = 'nobles' | 'property' | 'universal';
export const VOTING_LAWS: VotingLaw[] = ['nobles', 'property', 'universal'];
/** 지금 상황에 맞춘 기본 투표법 (모든 왕국) */
export const DEFAULT_VOTING_LAW: VotingLaw = 'nobles';
/** 투표법마다 직종의 정치 힘 가중치: 투표권이 있으면 1, 없으면 0 */
export const VOTE_WEIGHT: Record<VotingLaw, Record<PopClass, number>> = {
  nobles: { peasant: 0, unskilled: 0, farmer: 0, skilled: 0, expert: 0, gentry: 1, capitalist: 1, aristocrat: 1 },
  property: { peasant: 0, unskilled: 0, farmer: 0, skilled: 1, expert: 1, gentry: 1, capitalist: 1, aristocrat: 1 },
  universal: { peasant: 1, unskilled: 1, farmer: 1, skilled: 1, expert: 1, gentry: 1, capitalist: 1, aristocrat: 1 },
};

export type IgLawKind = 'tax' | 'invest' | 'welfare' | 'voting';
export interface IgStanceTable { tax: Record<TaxLaw, number>; invest: Record<InvestLaw, number>; welfare: Record<WelfareLaw, number>; voting: Record<VotingLaw, number> }
/** 법 입장: +2 강하게 찬성, +1 찬성, 0 중립, −1 반대, −2 강하게 반대 (근거는 INTEREST_GROUPS.md 4장) */
export const IG_STANCES: Record<IgId, IgStanceTable> = {
  landowners: {
    tax: { land: 1, poll: 0, income: -1 },
    invest: { nobles: 1, upper: 0, middle: -1, lower: -1 },
    welfare: { none: 1, poor: 0, wage: -1, universal: -1 },
    voting: { nobles: 2, property: 0, universal: -2 },
  },
  industrialists: {
    tax: { land: 0, poll: 1, income: 0 },
    invest: { nobles: -1, upper: 1, middle: 1, lower: 0 },
    welfare: { none: 0, poor: 1, wage: -1, universal: -2 },
    voting: { nobles: -1, property: 1, universal: -2 },
  },
  petite: {
    tax: { land: -1, poll: 1, income: 1 },
    invest: { nobles: -1, upper: 0, middle: 1, lower: 0 },
    welfare: { none: 0, poor: 0, wage: 0, universal: 0 },
    voting: { nobles: -1, property: 0, universal: -1 },
  },
  rural: {
    tax: { land: -1, poll: 0, income: 0 },
    invest: { nobles: 0, upper: 0, middle: 0, lower: 1 },
    welfare: { none: -1, poor: 1, wage: 0, universal: 1 },
    voting: { nobles: 0, property: 0, universal: 0 },
  },
  unions: {
    tax: { land: 0, poll: -1, income: 0 },
    invest: { nobles: 0, upper: 0, middle: 0, lower: 1 },
    welfare: { none: -2, poor: 0, wage: 1, universal: 2 },
    voting: { nobles: -2, property: -1, universal: 2 },
  },
  intelligentsia: {
    tax: { land: 0, poll: 0, income: 0 },
    invest: { nobles: 0, upper: 0, middle: 0, lower: 0 },
    welfare: { none: 0, poor: 0, wage: 0, universal: 0 },
    voting: { nobles: -1, property: 1, universal: 2 },
  },
};
/** 법 순서 (바꾸기 충격의 칸 수) */
export const IG_LAW_ORDER: Record<IgLawKind, readonly string[]> = { tax: TAX_LAWS, invest: INVEST_LAWS, welfare: WELFARE_LAWS, voting: VOTING_LAWS };

/** 승인 한도 (빅토리아3 Interest_groups: 법 입장 합 ±5, 법 바꾸기 ±20, 충성·급진 ±15, 합 ±20) */
export const IG_STANCE_CAP = 5;
export const IG_CHANGE_CAP = 20;
export const IG_SOL_CAP = 15;
export const IG_APPROVAL_CAP = 20;
/** 법 바꾸기 충격: 1칸 / 2칸 / 3칸 이상 (빅토리아3 ±5 / ±10 / ±20), IG_CHANGE_DAYS 동안 0 으로 줄어든다 (빅토리아3 5년, 줄어드는 모양은 확인 못 함: 직선) */
export const IG_CHANGE_STEPS = [5, 10, 20];
export const IG_CHANGE_DAYS = 1800;
/** 생활수준 항 = IG_SOL_PER × (지금 ÷ 1년 전 − 1), 회원 수 가중 (근거 없음: 빅토리아3 는 생활수준이 오르면 충성, 내리면 급진. 크기는 확인 못 함) */
export const IG_SOL_PER = 25;
/** 영향력 문턱 (사용자 결정 7-45: 힘센 20% 이상, 빅토리아3 는 20% 넘으면 힘셈 · 4% 아래면 소외, 되돌아가는 18%·5% 는 단계 1 에서) */
export const IG_POWERFUL = 0.2;
export const IG_MARGINAL = 0.04;
/** 기분 문턱 (빅토리아3: 성남 −10 이하, 불만 −5 이하, 만족 +5 이상, 충성 +10 이상) */
export const IG_MOOD_AT = { angry: -10, unhappy: -5, happy: 5, loyal: 10 } as const;

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
  /** 정치 힘 = Σ 투표법 가중치 × 인구 × 부 단계 × 몫 */
  strength: number;
  /** 영향력 0..1 (모든 집단 합 1) */
  clout: number;
  status: IgStatusLevel;
  /** 승인 −20..20 = stances + change + sol (합 한도) */
  approval: number;
  parts: { stances: number; change: number; sol: number };
  /** 바뀌는 중인 법이 끝나 바뀌면 생길 충격 (승인에는 넣지 않는다) */
  pending: number;
  mood: IgMood;
  /** 지금 법 입장 */
  stance: Record<IgLawKind, number>;
}
export interface IgStatus { kingdomId: number; votingLaw: VotingLaw; groups: IgRow[] }

const clamp = (x: number, cap: number) => Math.max(-cap, Math.min(cap, x));

/** pop 의 이익집단 몫 (합 1, 끌림이 모두 0 이면 빈 값) */
export function igMembership(p: Pop): Partial<Record<IgId, number>> {
  const base = IG_ATTRACT[p.prof];
  const lit = p.literacy >= IG_LITERACY_MIN ? IG_LITERACY_WEIGHT * p.literacy : 0;
  let total = lit;
  for (const g of IG_IDS) total += base[g] ?? 0;
  const out: Partial<Record<IgId, number>> = {};
  if (total <= 0) return out;
  for (const g of IG_IDS) {
    const v = (base[g] ?? 0) + (g === 'intelligentsia' ? lit : 0);
    if (v > 0) out[g] = v / total;
  }
  return out;
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

/** 법 바꾸기 하나의 충격 크기 (칸 수로, 방향 부호 없음) */
export function igChangeSize(kind: IgLawKind, from: string, to: string): number {
  const order = IG_LAW_ORDER[kind];
  const steps = Math.abs(order.indexOf(to) - order.indexOf(from));
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
  const inK = new Set(w.regions.filter((r) => r.kingdomId === kingdomId).map((r) => r.id));
  const members = {} as Record<IgId, number>, strength = {} as Record<IgId, number>;
  const byClass = {} as Record<IgId, Partial<Record<PopClass, number>>>;
  for (const g of IG_IDS) { members[g] = 0; strength[g] = 0; byClass[g] = {}; }
  for (const p of w.pops) {
    if (!inK.has(p.regionId) || p.size <= 0) continue;
    const share = igMembership(p), power = VOTE_WEIGHT[votingLaw][p.prof] * igWealth(p);
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
    let change = 0;
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
    let pending = 0;
    const lc = k?.lawChange;
    if (laws && lc) for (const kind of ['tax', 'invest', 'welfare'] as const) { const c = lc[kind]; if (c) pending += igChangeShock(g, { kind, from: laws[kind], to: c.to }); }
    const approval = clamp(stances + change + solTerm, IG_APPROVAL_CAP);
    const clout = total > 0 ? strength[g] / total : 0;
    return {
      id: g, name: IG_NAMES[g].ko, nameEn: IG_NAMES[g].en, members: members[g], strength: strength[g], clout, status: igStatus(clout),
      approval, parts: { stances, change, sol: solTerm }, pending, mood: igMood(approval), stance,
    };
  });
  return { kingdomId, votingLaw, groups };
}

/**
 * 법 저항 미리보기 (단계 2 규칙의 읽기용 판정, 지금은 아무것도 막지 않는다):
 * 새 법에 반대하는(입장이 지금 법보다 낮은) 힘센 집단(영향력 IG_POWERFUL 이상)이 모두 만족(승인 IG_MOOD_AT.happy 이상)이면 ok.
 * blockers = 막는 집단
 */
export function igLawCheck(w: World, kingdomId: number, kind: IgLawKind, to: string, opts: IgOptions = {}): { ok: boolean; blockers: IgId[] } {
  const st = interestGroups(w, kingdomId, opts);
  const laws = lawsOf(w, kingdomId, st.votingLaw);
  if (!laws || laws[kind] === to) return { ok: true, blockers: [] };
  const blockers = st.groups
    .filter((r) => r.clout >= IG_POWERFUL && igStance(r.id, kind, to) < igStance(r.id, kind, laws[kind]) && r.approval < IG_MOOD_AT.happy)
    .map((r) => r.id);
  return { ok: blockers.length === 0, blockers };
}
