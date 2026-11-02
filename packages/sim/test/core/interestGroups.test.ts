// 이익집단 단계 0 (읽기 전용 층, src/interestGroups.ts) 의 공식: 회원 몫 합 1, 영향력 합 1, 승인 한도, 기분 문턱, 법 바꾸기 충격, 선거 보정치, 자본가 지분 끌림, 법이 바뀔 확률.
// 세계를 바꾸지 않는 것은 readonly.test.ts 가 본다. 경제 결과로는 실패하지 않는다.
import { describe, expect, it } from 'vitest';
import {
  IG_APPROVAL_CAP, IG_IDS, IG_MOOD_AT, POP_CLASSES, VOTING_LAWS, IG_FUND_MAX, IG_FUND_WEIGHT, LAW_OPPOSE_MULT, VOTE_LITERACY, VOTE_MOD, createWorld, igChangeShock, igFundAttraction, igMembership, igMood, igVoteMod, interestGroups, lawChance, step,
} from '../../src/index';
import type { Pop } from '../../src/index';

const pop = (prof: Pop['prof'], literacy: number): Pop => ({
  id: 1, regionId: 1, prof, work: 0, size: 100, savings: 0, wealth: 2, literacy, quals: {}, incomeEma: 0, lastIncome: 0, lastSpend: 0,
  fulfillment: 1, food: 1, sol: 2, growth: 0, inKind: {},
});

describe('이익집단 (단계 0)', () => {
  it('회원 몫은 직종마다 합 1', () => {
    for (const c of POP_CLASSES) for (const lit of [0, 0.4, 0.8]) {
      const s = igMembership(pop(c, lit));
      const sum = Object.values(s).reduce((a, x) => a + (x ?? 0), 0);
      expect(sum, `${c} ${lit}`).toBeCloseTo(1, 12);
    }
    // 문해력 0.5 미만이면 지식인 몫 없음, 넘으면 생긴다
    expect(igMembership(pop('peasant', 0.4)).intelligentsia).toBeUndefined();
    expect(igMembership(pop('peasant', 0.8)).intelligentsia).toBeGreaterThan(0);
  });

  it('영향력 합 1, 승인은 한도 안, 기분은 문턱대로', () => {
    const w = createWorld(1, { withPlayer: false });
    for (let d = 0; d < 400; d++) step(w);
    for (const k of w.kingdoms) for (const v of VOTING_LAWS) {
      const st = interestGroups(w, k.id, { votingLaw: v });
      expect(st.groups.map((g) => g.id)).toEqual(IG_IDS);
      expect(st.groups.reduce((a, g) => a + g.clout, 0)).toBeCloseTo(1, 9);
      for (const g of st.groups) {
        expect(Math.abs(g.approval)).toBeLessThanOrEqual(IG_APPROVAL_CAP);
        expect(g.mood).toBe(igMood(g.approval));
      }
    }
    expect(igMood(IG_MOOD_AT.angry)).toBe('angry');
    expect(igMood(IG_MOOD_AT.unhappy)).toBe('unhappy');
    expect(igMood(0)).toBe('neutral');
    expect(igMood(IG_MOOD_AT.happy)).toBe('happy');
    expect(igMood(IG_MOOD_AT.loyal)).toBe('loyal');
  });

  it('법 바꾸기 충격: 칸 수와 입장 방향', () => {
    // 지주: 토지세 +1 → 소득세 −1, 두 칸 → −10. 노동조합: 복지 없음 −2 → 보편 +2, 세 칸 → +20
    expect(igChangeShock('landowners', { kind: 'tax', from: 'land', to: 'income' })).toBe(-10);
    expect(igChangeShock('unions', { kind: 'welfare', from: 'none', to: 'universal' })).toBe(20);
    expect(igChangeShock('intelligentsia', { kind: 'tax', from: 'land', to: 'poll' })).toBe(0);
    // 충격은 5년(1800일) 동안 직선으로 준다
    const w = createWorld(1, { withPlayer: false });
    const k = w.kingdoms[0];
    const at = (age: number) => interestGroups(w, k.id, { lawHist: [{ kind: 'tax', from: 'land', to: 'income', tick: w.tick - age }] }).groups[0].parts.change;
    expect(at(0)).toBe(-10);
    expect(at(900)).toBeCloseTo(-5, 12);
    expect(at(1800)).toBe(0);
  });

  it('선거 보정치: 표의 값, 인구 조사 선거는 문해력을 더한다', () => {
    const p = pop('skilled', 0.6);
    expect(igVoteMod('autocracy', p)).toBe(VOTE_MOD.autocracy.skilled);
    expect(igVoteMod('census', p)).toBeCloseTo(VOTE_MOD.census.skilled + 0.6, 12);
    expect(VOTE_LITERACY.census).not.toContain('peasant');
    expect(igVoteMod('census', pop('peasant', 0.6))).toBe(VOTE_MOD.census.peasant);
  });

  it('자본가 지분 끌림: 1년 생활비만큼 지분이면 IG_FUND_WEIGHT, 상한 IG_FUND_MAX', () => {
    expect(igFundAttraction(0, 100)).toBe(0);
    expect(igFundAttraction(100, 100)).toBeCloseTo(IG_FUND_WEIGHT, 12);
    expect(igFundAttraction(100 * 100, 100)).toBe(IG_FUND_MAX);
    expect(igFundAttraction(1, 0)).toBe(IG_FUND_MAX);
    const s = igMembership(pop('unskilled', 0), 100, 100);
    expect(s.industrialists).toBeCloseTo(IG_FUND_WEIGHT / (100 + IG_FUND_WEIGHT), 12);
  });

  it('법이 바뀔 확률: 0..1, 지금 법이면 1, 찬성 ÷ (찬성 + 반대)', () => {
    const w = createWorld(2, { withPlayer: false });
    for (let d = 0; d < 400; d++) step(w);
    for (const k of w.kingdoms) {
      expect(lawChance(w, k.id, 'tax', k.taxLaw).chance).toBe(1);
      for (const to of ['none', 'poor', 'wage', 'universal']) {
        const c = lawChance(w, k.id, 'welfare', to);
        expect(c.chance).toBeGreaterThanOrEqual(0);
        expect(c.chance).toBeLessThanOrEqual(1);
        let sup = c.crown, opp = 0;
        for (const r of c.groups) {
          if (r.side === 'for') sup += r.clout;
          if (r.side === 'against') { opp += r.clout * LAW_OPPOSE_MULT[r.mood]; expect(r.weight).toBeCloseTo(r.clout * LAW_OPPOSE_MULT[r.mood], 12); }
        }
        expect(c.support).toBeCloseTo(sup, 12);
        expect(c.oppose).toBeCloseTo(opp, 12);
        if (to !== k.welfareLaw) expect(c.chance).toBeCloseTo(opp > 0 ? sup / (sup + opp) : 1, 12);
      }
    }
  });
});
