import { describe, expect, it } from 'vitest';
import { TICKS_PER_WEEK, applyCommandMsg, budgetPreview, createWorld, playerCompany, step } from '../../src/index';
import type { BudgetPreview, World } from '../../src/index';

const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };
const lineOf = (p: BudgetPreview, key: string) => p.lines.find((l) => l.key === key)!.weekly;

describe('예산 미리보기', () => {
  const w = createWorld(42);
  runTo(w, 140);
  const me = playerCompany(w)!;
  const kid = me.kingdomId;

  it('세계를 바꾸지 않는다', () => {
    const before = JSON.stringify(w);
    budgetPreview(w, kid);
    budgetPreview(w, kid, { tax: 5, wages: 1, research: 5 });
    expect(JSON.stringify(w)).toBe(before);
  });

  it('단계를 바꾸면 틱 없이 바로 바뀐다', () => {
    const a = budgetPreview(w, kid);
    expect(a.lines.find((l) => l.key === 'tax')!.byLevel).toHaveLength(5);
    for (const item of ['tax', 'wages', 'research'] as const) {
      const now = w.kingdoms.find((k) => k.id === kid)!.budget[item];
      const next = now === 5 ? 4 : now + 1;
      expect(applyCommandMsg(w, me.id, { type: 'setBudget', item, value: next })).toBeNull();
      const b = budgetPreview(w, kid);
      expect(b.steps[item]).toBe(next);
      expect(b.net).toBe(a.netByLevel[item][next - 1]);
      expect(applyCommandMsg(w, me.id, { type: 'setBudget', item, value: now })).toBeNull();
      expect(budgetPreview(w, kid).net).toBe(a.net);
    }
    // 단계가 오르면 세입은 늘고, 임금·연구비 지출은 커진다 (음수가 더 작아진다)
    const tax = a.lines.find((l) => l.key === 'tax')!.byLevel!;
    expect(tax[4]).toBeGreaterThan(tax[0]);
    const wages = a.lines.find((l) => l.key === 'wages')!.byLevel!;
    expect(wages[4]).toBeLessThan(wages[0]);
  });

  it('주초 미리보기가 그 주 실제 국정 수지와 크게 다르지 않다 (8주, 모든 왕국)', () => {
    const v = createWorld(42);
    runTo(v, 21 * TICKS_PER_WEEK);
    const errs: string[] = [];
    const sums: { pIn: number; rIn: number; pOut: number; rOut: number; gross: number; k: World['kingdoms'][number] }[] = [];
    for (const k of v.kingdoms) sums.push({ pIn: 0, rIn: 0, pOut: 0, rOut: 0, gross: 0, k });
    for (let wk = 0; wk < 8; wk++) {
      const pre = sums.map((s) => budgetPreview(v, s.k.id));
      runTo(v, v.tick + TICKS_PER_WEEK);
      sums.forEach((s, i) => {
        const p = pre[i], b = s.k.lastBudget!;
        s.pIn += lineOf(p, 'tax') + lineOf(p, 'tariffs') + lineOf(p, 'mint');
        s.pOut += lineOf(p, 'fees') + lineOf(p, 'wages') + lineOf(p, 'goods') + lineOf(p, 'research') + lineOf(p, 'interest');
        s.rIn += b.revenue;
        s.rOut += b.fees - b.wages - b.goods - b.research - b.interest;
        s.gross += b.revenue + b.fees + b.wages + b.goods + b.research + b.interest;
      });
    }
    const pct = (a: number, b: number) => Math.round((a / Math.abs(b)) * 1000) / 10;
    for (const s of sums) {
      const e = { income: pct(s.pIn - s.rIn, s.rIn), expense: pct(s.pOut - s.rOut, s.rOut), netOfGross: pct(s.pIn + s.pOut - s.rIn - s.rOut, s.gross) };
      errs.push(`왕국 ${s.k.id} ${JSON.stringify(e)}`);
      expect(Math.abs(e.income), `왕국 ${s.k.id} 수입`).toBeLessThan(15);
      expect(Math.abs(e.expense), `왕국 ${s.k.id} 지출`).toBeLessThan(15);
      expect(Math.abs(e.netOfGross), `왕국 ${s.k.id} 순수지`).toBeLessThan(10);
    }
    console.log(`budgetPreview 8주 오차 %: ${errs.join(' / ')}`);
  });
});
