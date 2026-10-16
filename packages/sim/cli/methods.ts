// 생산 방식 점검표: 건물 1레벨, 기본가 기준. 임금 두 가지(AI 시작 0.6/1.6/3.5, 시장 1/2/4)로 하루 손익과 마진,
// 노동자 1인당 부가가치, 기술 방식이 대체하는 방식 대비 단위 원가·인력 변화를 보여 준다.
// 사용: npx tsx packages/sim/cli/methods.ts
import { BUILDING_TYPES, GOOD_IDS, GOODS, POINT_VALUE } from '../src';
import type { MethodDef, Skill } from '../src/types';

const WAGES: Record<string, Record<Skill, number>> = {
  start: { unskilled: 0.6, skilled: 1.6, expert: 3.5 },
  market: { unskilled: 1, skilled: 2, expert: 4 },
};
/** 기술 방식 → 그것이 대체하는 기본 방식 */
const REPLACES: Record<string, string> = {
  farm_grain_tools: 'farm_grain', farm_fiber_tools: 'farm_fiber', farm_grain_mech: 'farm_grain', farm_fiber_mech: 'farm_fiber',
  lumber_axe: 'lumber_manual', lumber_saw: 'lumber_manual', mine_pick: 'mine_manual', mine_mech: 'mine_manual',
  food_frozen: 'food_basic', fuel_ore: 'fuel_wood', textile_power: 'textile_hand', rail_steam: 'rail_horse',
  build_scaffold: 'build_manual', build_steel: 'build_manual',
};
const all = new Map<string, MethodDef>();
for (const t of BUILDING_TYPES) for (const m of t.methods) all.set(m.id, m);

const bag = (b: Partial<Record<string, number>>) => Object.entries(b).filter(([, v]) => v).map(([k, v]) => `${k} ${+(v as number).toFixed(2)}`).join(', ') || '-';
const val = (b: Partial<Record<string, number>>) => GOOD_IDS.reduce((a, g) => a + (b[g] ?? 0) * GOODS[g].basePrice, 0);
const wage = (m: MethodDef, w: Record<Skill, number>) => (['unskilled', 'skilled', 'expert'] as Skill[]).reduce((a, s) => a + (m.workers[s] ?? 0) * w[s], 0);
const heads = (m: MethodDef) => (m.workers.unskilled ?? 0) + (m.workers.skilled ?? 0) + (m.workers.expert ?? 0);
const r1 = (v: number) => +v.toFixed(1);
const outValue = (m: MethodDef) => val(m.outputs) + (m.construction ?? 0) * POINT_VALUE + (m.grant ? m.grant * wage(m, WAGES.market) : 0);
const mainQty = (m: MethodDef) => GOOD_IDS.reduce((a, g) => a + (m.outputs[g] ?? 0), 0) || (m.construction ?? 0);
/** 산출 1단위당 원가 (시장 임금) */
const unitCost = (m: MethodDef) => (val(m.inputs) + wage(m, WAGES.market)) / mainQty(m);

const rows: string[][] = [['method', 'workers U/S/E', 'inputs', 'outputs', 'outVal', 'inCost', 'wage s/m', 'profit s/m', 'margin s/m', 'VA/worker', 'vs replaced']];
for (const [id, m] of all) {
  const ov = outValue(m), ic = val(m.inputs);
  const ws = wage(m, WAGES.start), wm = wage(m, WAGES.market);
  const ps = ov - ic - ws, pm = ov - ic - wm;
  const pct = (p: number, c: number) => `${Math.round((p / c) * 100)}%`;
  let vs = '';
  const base = REPLACES[id] && all.get(REPLACES[id]);
  if (base) {
    const du = (m.workers.unskilled ?? 0) / (base.workers.unskilled ?? 1) - 1;
    const ds = (m.workers.skilled ?? 0) / (base.workers.skilled ?? 1);
    vs = `unitCost ${Math.round((unitCost(m) / unitCost(base) - 1) * 100)}%, U ${Math.round(du * 100)}%, S x${ds.toFixed(1)}, E +${+((m.workers.expert ?? 0) - (base.workers.expert ?? 0)).toFixed(2)}`;
  }
  rows.push([id, `${r1(m.workers.unskilled ?? 0)}/${r1(m.workers.skilled ?? 0)}/${r1(m.workers.expert ?? 0)}`, bag(m.inputs),
    m.construction ? `${m.construction} pts` : m.grant ? `grant x${m.grant}` : bag(m.outputs),
    ov.toFixed(0), ic.toFixed(0), `${ws.toFixed(0)}/${wm.toFixed(0)}`, `${ps.toFixed(0)}/${pm.toFixed(0)}`,
    `${pct(ps, ic + ws)}/${pct(pm, ic + wm)}`, ((ov - ic) / heads(m)).toFixed(2), vs]);
}
const widths = rows[0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
for (const r of rows) console.log(r.map((c, i) => c.padEnd(widths[i])).join(' | '));
