// 기준 임금(SKILL_DEFS.baseWage)을 바꿀 때 생산 방식 숫자를 건물 숫자 규칙으로 다시 세는 도구 (2026-11-01 기준 임금 재계산에 썼다).
//   npx tsx packages/sim/cli/rebasewage.ts '{"unskilled":3.5,...}'   (인자가 없으면 data.ts 의 지금 baseWage 를 새 값으로 본다)
// 옛 임금 = OLD (아래 상수, 재계산 전 값). 일꾼 수는 그대로 두고 (산업 유형 규칙), 방식마다
//   원료 = 옛 원료 × (새 인건비 ÷ 옛 인건비) 근처의 둥근 값, 산출 = 규칙 목표(기본 방식 이익률 20%, k단계 이익 = 1단계 × 2^k)를 맞추는 둥근 값
// 을 후보 몇 개 중에서 고른다 (원료 비중 범위, 상위 원료·산출이 단계마다 느는 것, 기본 방식 공구 10~30 을 지키는 것 중 목표에 가장 가깝고 옛 조리법 비율에 가까운 것).
// 출력: 방식마다 새 inputs/outputs 와 이익률, 끝에 JSON (data.ts 에 옮길 값). 공사 포인트는 methods_audit 이 보는 식(기본 이익 × BUILD_POINT_FACTOR, 50 단위)으로 같이 낸다.
import { BUILDING_TYPES, BUILD_POINT_FACTOR, GOODS, INDUSTRIES, INDUSTRY_UPPER_INPUT_TOL, SKILL_DEFS, STEP_PROFIT_MULT, TRADING_POST, industryOf } from '../src/data';
import type { GoodId, MethodDef, Skill } from '../src/types';

const OLD: Record<Skill, number> = { unskilled: 10, farmer: 10, skilled: 15, expert: 40, gentry: 30, capitalist: 40, aristocrat: 40 };
const NEW: Record<Skill, number> = process.argv[2] ? JSON.parse(process.argv[2]) : Object.fromEntries(Object.entries(SKILL_DEFS).map(([s, d]) => [s, d.baseWage])) as Record<Skill, number>;
const ADVANCED: GoodId[] = ['tools', 'fuel', 'metal', 'electronics'];
const wage = (m: MethodDef, t: Record<Skill, number>) => (Object.entries(m.workers) as [Skill, number][]).reduce((a, [s, n]) => a + n * t[s], 0);
const val = (b: Partial<Record<GoodId, number>>) => (Object.entries(b) as [GoodId, number][]).reduce((a, [g, q]) => a + q * GOODS[g].basePrice, 0);
const adv = (b: Partial<Record<GoodId, number>>) => ADVANCED.reduce((a, g) => a + (b[g] ?? 0) * GOODS[g].basePrice, 0);
const roundQ = (q: number) => (q >= 1000 ? Math.round(q / 50) * 50 : Math.max(10, Math.round(q / 10) * 10));
const okQ = (q: number) => q > 0 && (q >= 1000 ? q % 50 === 0 : q % 10 === 0);
/** q 근처 둥근 값 후보 (n 단계 위아래) */
function near(q: number, n: number): number[] {
  const out = new Set<number>();
  const c = roundQ(q);
  for (let d = -n; d <= n; d++) {
    for (const step of [10, 50]) { const x = c + d * step; if (okQ(x)) out.add(x); }
  }
  return [...out].filter((x) => Math.abs(x - c) <= n * (c >= 1000 ? 50 : 10) + 1e-9);
}

type Res = { id: string; inputs: Partial<Record<GoodId, number>>; outputs: Partial<Record<GoodId, number>> };
const result: Res[] = [];
const points: Record<string, number> = {};

for (const t of BUILDING_TYPES) {
  if (t.auto || t.stateOnly || t.id === 'builder' || t.id === TRADING_POST) continue;
  const ladders = new Map<string, MethodDef[]>();
  for (const m of t.methods) { const k = Object.keys(m.outputs)[0]; if (!ladders.has(k)) ladders.set(k, []); ladders.get(k)!.push(m); }
  for (const [, ms] of ladders) {
    let p1 = 0, prevAdv = -1, prevRev = -1;
    ms.forEach((m, k) => {
      const def = INDUSTRIES[industryOf(t.id, m.id)!];
      const W = wage(m, NEW), kW = W / wage(m, OLD);
      const goods = Object.keys(m.inputs) as GoodId[];
      const opts = goods.map((g) => {
        const s = m.inputs[g]! * kW;
        let c = near(s, 3);
        if (k === 0 && g === 'tools') c = [10, 20, 30];
        return c;
      });
      const [og] = Object.keys(m.outputs) as GoodId[];
      const lo = k === 0 ? def.inputShare[0] : Math.max(0, def.inputShare[0] - INDUSTRY_UPPER_INPUT_TOL);
      const hi = k === 0 ? def.inputShare[1] : def.inputShare[1] + INDUSTRY_UPPER_INPUT_TOL;
      let best: { score: number; ins: Partial<Record<GoodId, number>>; out: number } | null = null;
      const combo = (i: number, cur: Partial<Record<GoodId, number>>) => {
        if (i < goods.length) { for (const q of opts[i]) combo(i + 1, { ...cur, [goods[i]]: q }); return; }
        const I = val(cur);
        const target = k === 0 ? null : p1 * STEP_PROFIT_MULT ** k;
        const ideal = k === 0 ? (W + I) / 0.8 / GOODS[og].basePrice : (target! + W + I) / GOODS[og].basePrice;
        for (const q of near(ideal, 3)) {
          const R = q * GOODS[og].basePrice, p = R - W - I, share = I / R;
          if (share < lo - 1e-9 || share > hi + 1e-9) continue;
          if (k > 0 && (adv(cur) <= prevAdv || R <= prevRev)) continue;
          const err = k === 0 ? Math.abs(p / R - 0.2) / 0.015 : Math.abs(p / target! - 1) / 0.1;
          if (err > 1) continue;
          // 옛 조리법 비율에서 벗어난 정도 (원료 사이의 비율)
          let drift = 0;
          for (const g of goods) {
            // 기본 방식 공구는 옛 값(10~30)을 되도록 지킨다. 나머지 원료는 옛 원료 × 인건비 비율에서 벗어난 만큼
            if (k === 0 && g === 'tools') drift += Math.abs(cur[g]! - m.inputs[g]!) / 10;
            else { const s = m.inputs[g]! * kW; drift += Math.abs(cur[g]! - s) / Math.max(s, 10); }
          }
          const score = err + drift * 0.5;
          if (!best || score < best.score) best = { score, ins: cur, out: q };
        }
      };
      combo(0, {});
      if (!best) { console.log(`! ${t.id}/${m.id}: 후보 없음`); return; }
      const b = best as { score: number; ins: Partial<Record<GoodId, number>>; out: number };
      const R = b.out * GOODS[og].basePrice, I = val(b.ins), p = R - W - I;
      if (k === 0) p1 = p;
      prevAdv = adv(b.ins); prevRev = R;
      result.push({ id: m.id, inputs: b.ins, outputs: { [og]: b.out } });
      const old = `${JSON.stringify(m.inputs)} → ${JSON.stringify(m.outputs)}`;
      console.log(`${t.id}/${m.id} 임금 ${W} (×${kW.toFixed(3)}) | ${old}  ⇒  ${JSON.stringify(b.ins)} → ${og} ${b.out} | 원료 ${(I / R * 100).toFixed(1)}% 이익 ${p.toFixed(0)} (${k === 0 ? (p / R * 100).toFixed(1) + '%' : '×' + (p / p1).toFixed(2)})`);
    });
    if (ms[0] === t.methods[0] && t.industry) points[t.id] = Math.round((p1 * BUILD_POINT_FACTOR) / 50) * 50;
  }
}
console.log('\n공사 포인트', JSON.stringify(points));
console.log('\nJSON', JSON.stringify(result));
