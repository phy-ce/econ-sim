import { describe, expect, it } from 'vitest';
import { BUDGET_GROUPS, TICKS_PER_WEEK, TUNE, applyCommandMsg, budgetDrill, budgetLineRaw, budgetPreview, createWorld, playerCompany, step } from '../../src/index';
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

  it('국영 임금 단계의 순수지 변화에 공사 수수료 증가가 들어간다', () => {
    const v = createWorld(42);
    runTo(v, 20 * TICKS_PER_WEEK);
    const pid = playerCompany(v)!;
    const k0 = v.kingdoms.find((y) => y.id === pid.kingdomId)!;
    const now = k0.budget.wages, next = now >= 4 ? now - 2 : now + 2;
    const a = budgetPreview(v, pid.kingdomId);
    const fees = a.lines.find((l) => l.key === 'fees')!;
    expect(fees.knob).toBe('wages');
    const predicted = a.netByLevel.wages[next - 1] - a.net;
    const realNet = (x: World) => {
      const b = x.kingdoms.find((y) => y.id === pid.kingdomId)!.lastBudget!;
      return b.revenue + b.fees - b.wages - b.goods - b.interest;
    };
    const ctl = structuredClone(v), chg = structuredClone(v);
    expect(applyCommandMsg(chg, pid.id, { type: 'setBudget', item: 'wages', value: next })).toBeNull();
    runTo(ctl, ctl.tick + TICKS_PER_WEEK); runTo(chg, chg.tick + TICKS_PER_WEEK);
    const real = realNet(chg) - realNet(ctl);
    console.log(`budgetPreview 임금 ${now}→${next}: 순수지 변화 예상 ${predicted} 실제 ${Math.round(real)}`);
    // 민간 공사 수수료는 저택·금융가 금고가 낼 수 있는 만큼만 들어오므로(레벨 소유 1단계) 순수지 변화가 작을 때 비율 오차가 커진다:
    // 오차를 임금 줄 변화 크기에 견준다
    const wageDelta = Math.abs(a.lines.find((l) => l.key === 'wages')!.byLevel![next - 1] - a.lines.find((l) => l.key === 'wages')!.weekly);
    expect(Math.abs(predicted - real) / wageDelta).toBeLessThan(0.2);
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
        r += b.revenue + b.fees - b.wages - b.goods - b.interest + (b.firms ?? 0);
        gross += b.revenue + b.fees + b.wages + b.goods + b.interest + Math.abs(b.firms ?? 0);
      });
    }
    const e = Math.round(((p - r) / gross) * 1000) / 10;
    out.push(`순수지 오차 ${e}% (총 흐름 대비)`);
    console.log(`budgetPreview 2~9주: ${out.join(' ')}`);
    expect(Math.abs(e)).toBeLessThan(10);
  });

  it('주초 미리보기가 그 주 실제 국정 수지와 크게 다르지 않다 (8주, 모든 왕국)', () => {
    // 기상 조건이 끝나는 날 소작지 판매(토지세)가 몇 배로 뛴다 (소작농은 먹고 남는 만큼만 판다). 미리보기는 계절을 내다보지 않으므로 기상 조건 없이 잰다
    const chance = TUNE.harvestChance;
    TUNE.harvestChance = 0;
    const v = createWorld(42);
    runTo(v, 21 * TICKS_PER_WEEK);
    const errs: string[] = [];
    const sums: { pIn: number; rIn: number; pOut: number; rOut: number; gross: number; spend: number; k: World['kingdoms'][number] }[] = [];
    for (const k of v.kingdoms) sums.push({ pIn: 0, rIn: 0, pOut: 0, rOut: 0, gross: 0, spend: 0, k });
    for (let wk = 0; wk < 8; wk++) {
      const pre = sums.map((s) => budgetPreview(v, s.k.id));
      runTo(v, v.tick + TICKS_PER_WEEK);
      sums.forEach((s, i) => {
        const p = pre[i], b = s.k.lastBudget!;
        s.pIn += lineOf(p, 'tax') + lineOf(p, 'tariffs') + lineOf(p, 'mint');
        s.pOut += lineOf(p, 'fees') + lineOf(p, 'wages') + lineOf(p, 'goods') + lineOf(p, 'interest');
        s.rIn += b.revenue;
        s.rOut += b.fees - b.wages - b.goods - b.interest;
        s.gross += b.revenue + b.fees + b.wages + b.goods + b.interest;
        s.spend += b.wages + b.goods + b.interest;
      });
    }
    TUNE.harvestChance = chance;
    const pct = (a: number, b: number) => Math.round((a / Math.abs(b)) * 1000) / 10;
    for (const s of sums) {
      // 지출은 공사 수수료를 뺀 순액이라 0 가까이 갈 수 있다 (행정청 임금이 작은 판). 오차는 총 지출(임금·원료·이자)에 대한 비율로 잰다
      const e = { income: pct(s.pIn - s.rIn, s.rIn), expense: pct(s.pOut - s.rOut, s.spend), netOfGross: pct(s.pIn + s.pOut - s.rIn - s.rOut, s.gross) };
      errs.push(`왕국 ${s.k.id} ${JSON.stringify(e)}`);
      expect(Math.abs(e.income), `왕국 ${s.k.id} 수입`).toBeLessThan(15);
      expect(Math.abs(e.expense), `왕국 ${s.k.id} 지출`).toBeLessThan(15);
      expect(Math.abs(e.netOfGross), `왕국 ${s.k.id} 순수지`).toBeLessThan(10);
    }
    console.log(`budgetPreview 8주 오차 %: ${errs.join(' / ')}`);
  });

  it('줄 묶음: 손잡이별 묶음 합이 순수지이고, 국영 사업 손익은 국영 임금 손잡이를 따른다', () => {
    const a = budgetPreview(w, kid);
    expect(a.groups.map((g) => g.knob)).toEqual(BUDGET_GROUPS.map((g) => g.knob));
    expect(a.groups.reduce((x, g) => x + g.weekly, 0)).toBe(a.net);
    expect(a.lines.find((l) => l.key === 'stateFirms')!.knob).toBe('wages');
    for (const g of a.groups) if (g.knob !== 'fixed') g.byLevel!.forEach((v, i) => expect(a.netByLevel[g.knob as 'tax'][i] - a.net).toBeCloseTo(v - g.weekly, 6));
  });

  it('자세히 보기: 행 합 + 보정 = 줄 값, 임금·국영 사업·이자는 보정 없이 맞는다', () => {
    for (const k of w.kingdoms) for (const steps of [{}, { wages: 5, tax: 1, welfare: 2 }]) {
      const p = budgetPreview(w, k.id, steps);
      for (const l of p.lines) {
        const d = budgetDrill(w, k.id, l.key, steps);
        const rows = (d.rows as { weekly: number }[]).reduce((x, r) => x + r.weekly, 0);
        expect(d.weekly).toBeCloseTo(budgetLineRaw(w, k.id, l.key, steps), 6);
        expect(rows + d.smoothing).toBeCloseTo(d.weekly, 6);
        expect(Math.abs(d.weekly - l.weekly), l.key).toBeLessThanOrEqual(50);
        if (l.key === 'wages' || l.key === 'stateFirms' || l.key === 'interest') expect(Math.abs(d.smoothing), l.key).toBeLessThan(1e-6);
      }
      const wd = budgetDrill(w, k.id, 'wages', steps);
      if (wd.key !== 'wages') throw new Error('wages');
      for (const r of wd.rows) for (const j of r.jobsBy) expect(j.perHead).toBeCloseTo(j.baseWage * j.wageIndex * j.stepMult, 9);
    }
  });

  it('국영 사업 손익: 왕실 생산 건물이 있으면 실제 장부(lastBudget.firms)와 크게 다르지 않다', () => {
    // 100·150·200주에서 4주씩. 매출 이동평균은 늘거나 주는 사업을 늦게 따라가 한 구간의 오차는 ±25%까지 간다: 세 구간을 합쳐 치우침을 본다
    const v = createWorld(2);
    let p = 0, r = 0, scale = 0;
    for (const start of [100, 150, 200]) {
      runTo(v, start * TICKS_PER_WEEK);
      for (let wk = 0; wk < 4; wk++) {
        const pre = v.kingdoms.map((k) => budgetPreview(v, k.id).lines.find((l) => l.key === 'stateFirms')!.weekly);
        runTo(v, v.tick + TICKS_PER_WEEK);
        v.kingdoms.forEach((k, i) => {
          const d = budgetDrill(v, k.id, 'stateFirms');
          if (d.key === 'stateFirms') for (const x of d.rows) scale += x.sales;
          p += pre[i]; r += k.lastBudget!.firms ?? 0;
        });
      }
    }
    console.log(`국영 사업 3×4주: 예상 ${p} 장부 ${Math.round(r)} (매출 규모 ${Math.round(scale)})`);
    expect(scale).toBeGreaterThan(0);
    expect(Math.abs(p - r) / scale).toBeLessThan(0.1);
  });
});
