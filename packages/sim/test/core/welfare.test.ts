import { describe, expect, it } from 'vitest';
import { TUNE, applyCommandMsg, budgetPreview, createWorld, moneyIdentity, roundingDrift, step, welfareCovers, welfareGroup } from '../../src/index';
import type { World } from '../../src/index';
import { payWelfare } from '../../src/welfare';
import { firstDiff } from '../helpers';

const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };
const reload = (w: World): World => JSON.parse(JSON.stringify(w));

/** 모든 왕국에 복지법을 바로 켠다 (180일 기다리지 않는 시험용) */
function withWelfare(seed: number, law: World['kingdoms'][number]['welfareLaw'], stepNo = 5): World {
  const w = createWorld(seed);
  for (const k of w.kingdoms) { k.welfareLaw = law; k.budget.welfare = stepNo; }
  return w;
}

describe('복지', () => {
  it('돈이 보존되고, 국고에서 대상 pop 으로 간다', () => {
    const w = withWelfare(7, 'universal');
    const m0 = moneyIdentity(w);
    let worst = 0, paid = 0;
    for (let i = 0; i < 120; i++) {
      step(w);
      worst = Math.max(worst, Math.abs(moneyIdentity(w) - m0));
      for (const c of w.companies) if (c.state) paid += c.ledger.welfare;
    }
    expect(paid).toBeGreaterThan(0);
    expect(worst).toBeLessThan(1e-3);
    expect(roundingDrift(w)).toBeLessThan(1e-5);
  });

  it('저장/불러오기를 해도 같은 결과', () => {
    const a = withWelfare(42, 'poor', 4);
    runTo(a, 120);
    const want = JSON.stringify(a);
    let b = withWelfare(42, 'poor', 4);
    runTo(b, 53);
    b = reload(b);
    runTo(b, 120);
    const got = JSON.stringify(b);
    if (got !== want) expect.fail(firstDiff(JSON.parse(got), JSON.parse(want)) ?? 'diff');
  });

  it('국고 현금보다 많이 주지 않는다 (같은 비율로 줄인다)', () => {
    const w = withWelfare(3, 'universal', 5);
    runTo(w, 30);
    const gov = w.companies.find((c) => c.state)!;
    const k = w.kingdoms.find((x) => x.governmentId === gov.id)!;
    const extra = gov.cash - 1000;
    gov.cash -= extra; w.fund += extra; // 돈을 주인 없는 돈으로 옮겨 보존을 지킨다
    const before = new Map(w.pops.map((p) => [p.id, p.savings]));
    payWelfare(w);
    expect(gov.cash).toBeGreaterThanOrEqual(-1e-9);
    let got = 0;
    for (const p of w.pops) if (w.regions.find((r) => r.id === p.regionId)!.kingdomId === k.id) got += p.savings - (before.get(p.id) ?? 0);
    expect(got).toBeLessThanOrEqual(1000 + 1e-6);
    expect(got).toBeGreaterThan(0);
  });

  it('귀족·자본가는 받지 않고, 법이 덮는 무리만 받는다', () => {
    const w = withWelfare(5, 'wage', 5);
    runTo(w, 14);
    const before = new Map(w.pops.map((p) => [p.id, p.lastIncome]));
    payWelfare(w);
    for (const p of w.pops) {
      const g = welfareGroup(p);
      const d = p.lastIncome - (before.get(p.id) ?? 0);
      if (!g || !welfareCovers('wage', g)) expect(d, `${p.prof} ${p.work}`).toBe(0);
    }
  });

  it('복지법은 명령 뒤 lawDays 일이 지나야 바뀐다', () => {
    const w = createWorld(9);
    const me = w.companies.find((c) => c.isPlayer)!;
    const crown = w.companies.find((c) => c.state && c.kingdomId === me.kingdomId)!;
    const k = w.kingdoms.find((x) => x.governmentId === crown.id)!;
    expect(applyCommandMsg(w, crown.id, { type: 'setWelfareLaw', law: 'poor' })).toBeNull();
    expect(k.lawChange?.welfare?.to).toBe('poor');
    runTo(w, TUNE.lawDays - 1);
    expect(k.welfareLaw).toBe('none');
    runTo(w, TUNE.lawDays + 1);
    expect(k.welfareLaw).toBe('poor');
  });

  it('예산 미리보기: 복지 줄은 단계가 오를수록 커진다', () => {
    const w = withWelfare(42, 'universal', 3);
    runTo(w, 70);
    const kid = w.kingdoms[0].id;
    const line = budgetPreview(w, kid).lines.find((l) => l.key === 'welfare')!;
    expect(line.knob).toBe('welfare');
    expect(line.byLevel).toHaveLength(5);
    expect(line.byLevel![4]).toBeLessThanOrEqual(line.byLevel![0]);
    expect(line.byLevel![4]).toBeLessThan(0);
  });
});
