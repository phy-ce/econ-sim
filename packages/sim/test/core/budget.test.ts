import { describe, expect, it } from 'vitest';
import { BUDGET_GROUPS, TICKS_PER_WEEK, TUNE, applyCommandMsg, budgetDrill, budgetLineRaw, budgetPreview, createWorld, playerCompany, step } from '../../src/index';
import type { BudgetPreview, World } from '../../src/index';

const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };
const lineOf = (p: BudgetPreview, key: string) => p.lines.find((l) => l.key === key)!.weekly;
type Ledger = NonNullable<World['kingdoms'][number]['lastBudget']>;
/** 장부의 국고 순변화: 세입 − 정부 건물 임금·원료 − 이자 − 복지 − 왕실 공사 + 국영 사업 손익 */
const ledgerNet = (b: Ledger) => b.revenue - b.wages - b.goods - b.interest - (b.welfare ?? 0) - (b.build ?? 0) + (b.firms ?? 0);
const ledgerGross = (b: Ledger) => b.revenue + b.wages + b.goods + b.interest + (b.welfare ?? 0) + (b.build ?? 0) + Math.abs(b.firms ?? 0);

describe('예산 미리보기', () => {
  const w = createWorld(42);
  runTo(w, 140);
  const me = playerCompany(w)!;
  const kid = me.kingdomId;

  it('세계를 바꾸지 않는다', () => {
    const before = JSON.stringify(w);
    budgetPreview(w, kid);
    budgetPreview(w, kid, { tax: 5, wages: 1, welfare: 5 });
    for (const g of BUDGET_GROUPS) for (const key of g.lines) budgetDrill(w, kid, key, { wages: 5 });
    expect(JSON.stringify(w)).toBe(before);
  });

  it('단계를 바꾸면 틱 없이 바로 바뀐다', () => {
    const a = budgetPreview(w, kid);
    expect(a.lines.find((l) => l.key === 'tax')!.byLevel).toHaveLength(5);
    for (const item of ['tax', 'wages', 'welfare'] as const) {
      const now = w.kingdoms.find((k) => k.id === kid)!.budget[item];
      const next = now === 5 ? 4 : now + 1;
      expect(applyCommandMsg(w, me.id, { type: 'setBudget', item, value: next })).toBeNull();
      const b = budgetPreview(w, kid);
      expect(b.steps[item]).toBe(next);
      expect(b.net).toBe(a.netByLevel[item][next - 1]);
      expect(applyCommandMsg(w, me.id, { type: 'setBudget', item, value: now })).toBeNull();
      expect(budgetPreview(w, kid).net).toBe(a.net);
    }
    // 단계가 오르면 세입은 늘고, 임금 지출은 커진다 (음수가 더 작아진다)
    const tax = a.lines.find((l) => l.key === 'tax')!.byLevel!;
    expect(tax[4]).toBeGreaterThan(tax[0]);
    const wages = a.lines.find((l) => l.key === 'wages')!.byLevel!;
    expect(wages[4]).toBeLessThan(wages[0]);
  });

  it('세금 단계별 금액(byLevel)이 그 단계로 바꾼 뒤 실제 세입과 맞는다', () => {
    const v = createWorld(42);
    runTo(v, 20 * TICKS_PER_WEEK);
    const pid = playerCompany(v)!;
    const pre = budgetPreview(v, pid.kingdomId).lines.find((l) => l.key === 'tax')!.byLevel!;
    const out: string[] = [];
    for (const s of [1, 5]) {
      const x = structuredClone(v);
      expect(applyCommandMsg(x, pid.id, { type: 'setBudget', item: 'tax', value: s })).toBeNull();
      runTo(x, x.tick + TICKS_PER_WEEK);
      const k = x.kingdoms.find((y) => y.id === pid.kingdomId)!;
      const gov = x.companies.find((c) => c.id === k.governmentId)!;
      // 관세는 세금 단계와 상관없으므로 뺀다
      const real = k.lastBudget!.revenue - gov.lastLedger.mint - (k.lastBudget!.tariffs ?? 0);
      const err = (pre[s - 1] - real) / real;
      out.push(`단계 ${s}: 예상 ${pre[s - 1]} 실제 ${Math.round(real)} (${(err * 100).toFixed(1)}%)`);
      expect(Math.abs(err), `세금 단계 ${s}`).toBeLessThan(0.08);
    }
    console.log(`budgetPreview 세금 단계: ${out.join(' / ')}`);
  });

  it('첫 주들(2~9주)도 실제 수지와 크게 다르지 않다', () => {
    const v = createWorld(42);
    runTo(v, 2 * TICKS_PER_WEEK);
    const out: string[] = [];
    let p = 0, r = 0, gross = 0;
    for (let wk = 0; wk < 8; wk++) {
      const pre = v.kingdoms.map((k) => budgetPreview(v, k.id).net);
      runTo(v, v.tick + TICKS_PER_WEEK);
      v.kingdoms.forEach((k, i) => {
        const b = k.lastBudget!;
        p += pre[i];
        r += ledgerNet(b);
        gross += ledgerGross(b);
      });
    }
    const e = Math.round(((p - r) / gross) * 1000) / 10;
    out.push(`순수지 오차 ${e}% (총 흐름 대비)`);
    console.log(`budgetPreview 2~9주: ${out.join(' ')}`);
    expect(Math.abs(e)).toBeLessThan(10);
  });

  it('지금 단계의 미리보기는 지난주 확정 장부와 같다 (8주, 모든 왕국)', () => {
    // 줄 값은 지난주 실제 값에서 시작하고, 지난주 단계로 보면 모형 차이가 0이다: 줄마다 장부 값과 반올림 단위(100) 안에서 맞는다
    const v = createWorld(42);
    runTo(v, 21 * TICKS_PER_WEEK);
    for (let wk = 0; wk < 8; wk++) {
      runTo(v, v.tick + TICKS_PER_WEEK);
      for (const k of v.kingdoms) {
        const b = k.lastBudget!, p = budgetPreview(v, k.id, b.steps); // AI 는 주가 끝난 뒤 단계를 바꾸므로 지난주 단계로 본다
        const want = { tax: b.revenue - (b.tariffs ?? 0) - (b.mint ?? 0), tariffs: b.tariffs ?? 0, mint: b.mint ?? 0, wages: -b.wages, stateFirms: b.firms ?? 0, build: -(b.build ?? 0), goods: -b.goods, interest: -b.interest, welfare: -(b.welfare ?? 0) };
        for (const [key, x] of Object.entries(want)) expect(Math.abs(lineOf(p, key) - x), `주 ${wk} 왕국 ${k.id} ${key}`).toBeLessThanOrEqual(50);
        expect(Math.abs(p.net - ledgerNet(b)), `주 ${wk} 왕국 ${k.id} 순수지`).toBeLessThanOrEqual(300);
      }
    }
  });

  it('줄 묶음: 손잡이별 묶음 합이 순수지이고, 국영 사업 손익은 국영 임금 손잡이를 따른다', () => {
    const a = budgetPreview(w, kid);
    expect(a.groups.map((g) => g.knob)).toEqual(BUDGET_GROUPS.map((g) => g.knob));
    expect(a.groups.reduce((x, g) => x + g.weekly, 0)).toBe(a.net);
    expect(a.lines.find((l) => l.key === 'stateFirms')!.knob).toBe('wages');
    for (const g of a.groups) if (g.knob !== 'fixed') g.byLevel!.forEach((v, i) => expect(a.netByLevel[g.knob as 'tax'][i] - a.net).toBeCloseTo(v - g.weekly, 6));
  });

  it('자세히 보기: 행 합 + 보정 = 줄 값 (보정 = 지난주 확정 장부와 지금 고용 기준 행 합의 차이)', () => {
    for (const k of w.kingdoms) for (const steps of [{}, { wages: 5, tax: 1, welfare: 2 }]) {
      const p = budgetPreview(w, k.id, steps);
      for (const l of p.lines) {
        const d = budgetDrill(w, k.id, l.key, steps);
        const rows = (d.rows as { weekly: number }[]).reduce((x, r) => x + r.weekly, 0);
        expect(d.weekly).toBeCloseTo(budgetLineRaw(w, k.id, l.key, steps), 6);
        expect(rows + d.smoothing).toBeCloseTo(d.weekly, 6);
        expect(Math.abs(d.weekly - l.weekly), l.key).toBeLessThanOrEqual(50);
        // 줄 값은 지난주 확정 장부에서 시작하므로 행 합(지금 고용 기준)과의 차이가 보정으로 남는다: 보정 없음을 요구하지 않는다
      }
      const wd = budgetDrill(w, k.id, 'wages', steps);
      if (wd.key !== 'wages') throw new Error('wages');
      for (const r of wd.rows) for (const j of r.jobsBy) expect(j.perHead).toBeCloseTo(j.baseWage * j.wageIndex * j.stepMult, 9);
    }
  });

  it('국영 사업 손익: 왕실 생산 건물이 있으면 실제 장부(lastBudget.firms)와 크게 다르지 않다', () => {
    // 100·150·200주에서 4주씩. 매출 이동평균은 늘거나 주는 사업을 늦게 따라가 한 구간의 오차는 ±25%까지 간다: 세 구간을 합쳐 치우침을 본다.
    // 오차는 줄의 총 흐름(매출 + 원료 + 임금)에 견준다: 적자 국영 사업은 매출이 작아 매출에만 견주면 비율이 커진다
    const v = createWorld(2);
    let p = 0, r = 0, scale = 0, gross = 0;
    for (const start of [100, 150, 200]) {
      runTo(v, start * TICKS_PER_WEEK);
      for (let wk = 0; wk < 4; wk++) {
        const pre = v.kingdoms.map((k) => budgetPreview(v, k.id).lines.find((l) => l.key === 'stateFirms')!.weekly);
        runTo(v, v.tick + TICKS_PER_WEEK);
        v.kingdoms.forEach((k, i) => {
          const d = budgetDrill(v, k.id, 'stateFirms');
          if (d.key === 'stateFirms') for (const x of d.rows) { scale += x.sales; gross += Math.abs(x.sales) + Math.abs(x.inputs) + Math.abs(x.wages); }
          p += pre[i]; r += k.lastBudget!.firms ?? 0;
        });
      }
    }
    console.log(`국영 사업 3×4주: 예상 ${p} 장부 ${Math.round(r)} (매출 ${Math.round(scale)}, 총 흐름 ${Math.round(gross)})`);
    expect(scale).toBeGreaterThan(0);
    expect(Math.abs(p - r) / gross).toBeLessThan(0.1);
  });
});
