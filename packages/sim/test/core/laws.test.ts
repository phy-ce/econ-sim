import { afterEach, describe, expect, it } from 'vitest';
import { LAW_TECH, TUNE, applyCommand, createWorld, moneyIdentity, policyStatus, step, unlocksOf } from '../../src/index';
import type { Company, Kingdom, World } from '../../src/index';
import { firstDiff } from '../helpers';

// 법 바꾸기 네 단계: 기술로 열림 → 조건이 맞아야 시작 → TUNE.lawDays 일 → 끝날 때 조건이 맞아야 바뀜 (아니면 실패)

const saved = { lawPoll: TUNE.lawPoll, investUpper: TUNE.investUpper };
afterEach(() => { TUNE.lawPoll = saved.lawPoll; TUNE.investUpper = saved.investUpper; });

function setup(seed = 3): { w: World; k: Kingdom; gov: Company } {
  const w = createWorld(seed);
  const k = w.kingdoms[0];
  const gov = w.companies.find((c) => c.id === k.governmentId)!;
  return { w, k, gov };
}
const learn = (gov: Company, tech: string | null) => { if (tech && !gov.research.known.includes(tech)) gov.research.known.push(tech); };
const forget = (gov: Company, tech: string | null) => { gov.research.known = gov.research.known.filter((t) => t !== tech); };
const runDays = (w: World, n: number) => { for (let i = 0; i < n; i++) step(w); };

describe('법: 기술로 열기와 끝날 때 조건', () => {
  it('기술이 안 열린 법은 조건이 맞아도 시작할 수 없다', () => {
    const { w, k, gov } = setup();
    TUNE.lawPoll = 0; TUNE.investUpper = 0;
    forget(gov, LAW_TECH.poll); forget(gov, LAW_TECH.upper);
    const st = policyStatus(w, k.id);
    expect(st.tax.options.find((o) => o.id === 'poll')).toMatchObject({ unlocked: false, eligible: false, tech: LAW_TECH.poll });
    expect(applyCommand(w, gov.id, { type: 'setTaxLaw', law: 'poll' })).not.toBeNull();
    expect(applyCommand(w, gov.id, { type: 'setInvestLaw', law: 'upper' })).not.toBeNull();
    expect(k.lawChange?.tax).toBeUndefined();
    // 시작 법은 기술이 없다
    expect(LAW_TECH.land).toBeNull();
    expect(LAW_TECH.nobles).toBeNull();
    // 연구하면 열린다
    learn(gov, LAW_TECH.poll);
    expect(applyCommand(w, gov.id, { type: 'setTaxLaw', law: 'poll' })).toBeNull();
    expect(k.lawChange?.tax?.to).toBe('poll');
    // 연구 트리용: 그 기술이 이 법을 연다
    expect(unlocksOf(LAW_TECH.poll!).policies).toContain('poll');
  });

  it('기간이 끝날 때 조건이 안 맞으면 실패하고 지금 법이 남는다', () => {
    const { w, k, gov } = setup();
    learn(gov, LAW_TECH.poll);
    TUNE.lawPoll = 0;
    expect(applyCommand(w, gov.id, { type: 'setTaxLaw', law: 'poll' })).toBeNull();
    const end = k.lawChange!.tax!.endTick;
    // 시작한 뒤 조건이 깨진다 (비율은 1을 넘지 못한다)
    TUNE.lawPoll = 1.01;
    expect(policyStatus(w, k.id).tax.pendingOk).toBe(false);
    while (w.tick <= end) step(w);
    expect(k.taxLaw).toBe('land');
    expect(k.lawChange?.tax).toBeUndefined();
    expect(k.lawFail?.tax).toBeGreaterThanOrEqual(end);
    expect(w.events.some((e) => e.topic === 'lawFailed' && e.companyId === gov.id)).toBe(true);
  });

  it('조건이 끝까지 맞으면 바뀐다 (화폐 장부 그대로)', () => {
    const { w, k, gov } = setup();
    learn(gov, LAW_TECH.poll);
    TUNE.lawPoll = 0;
    const m0 = moneyIdentity(w);
    expect(applyCommand(w, gov.id, { type: 'setTaxLaw', law: 'poll' })).toBeNull();
    expect(policyStatus(w, k.id).tax.pendingOk).toBe(true);
    runDays(w, TUNE.lawDays + 1);
    expect(k.taxLaw).toBe('poll');
    expect(w.events.some((e) => e.topic === 'lawChanged' && e.companyId === gov.id)).toBe(true);
    expect(Math.abs(moneyIdentity(w) - m0)).toBeLessThan(1e-3);
  });

  it('바뀌는 중에 저장/불러오기 해도 같은 결과 (실패 포함)', () => {
    const make = () => {
      const s = setup(5);
      learn(s.gov, LAW_TECH.poll); learn(s.gov, LAW_TECH.upper);
      TUNE.lawPoll = 0; TUNE.investUpper = 0;
      expect(applyCommand(s.w, s.gov.id, { type: 'setTaxLaw', law: 'poll' })).toBeNull();
      expect(applyCommand(s.w, s.gov.id, { type: 'setInvestLaw', law: 'upper' })).toBeNull();
      TUNE.lawPoll = 1.01;
      return s;
    };
    const a = make();
    runDays(a.w, TUNE.lawDays + 10);
    // 규칙 해시(config.rulesHash)는 빼고 비교한다: 둘째 make 는 첫 make 가 바꾼 TUNE.lawPoll 로 세계를 만들어 해시만 다르다 (동작에는 안 쓰이는 라벨)
    const noLabel = (w: typeof a.w) => JSON.stringify({ ...w, config: { ...w.config, rulesHash: '' } });
    const want = noLabel(a.w);
    let b = make().w;
    runDays(b, 90);
    b = JSON.parse(JSON.stringify(b));
    runDays(b, TUNE.lawDays + 10 - 90);
    const got = noLabel(b);
    expect(got === want ? null : firstDiff(JSON.parse(got), JSON.parse(want))).toBeNull();
    // 인두세는 실패, 투자법은 바뀜
    const k = b.kingdoms[0];
    expect(k.taxLaw).toBe('land');
    expect(k.investLaw).toBe('upper');
  });
});
