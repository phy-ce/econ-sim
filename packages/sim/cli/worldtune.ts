// 비교 실행용 세계 숫자 바꾸기 (sweep.ts 의 "world" 키). createWorld 전에 한 번 부른다. 기본 실행에는 쓰지 않는다.
// { price: { 상품: 배율 }, wage: { 직종: 배율 }, workMul: 일자리 배율, inputMul: 원료 배율, buildMul: 공사 포인트 배율 }
// 값을 바꾼 뒤 산출 있는 방식마다 지금 이익률(기본가·기본 임금 기준)이 그대로 남도록 산출을 다시 맞춘다 (규칙: 기본 방식 이익률 20%, 단계마다 레벨당 이익 2배).
// 필요량 배율은 TUNE.needMul 로 준다
import { BUILDING_TYPES, GOODS, NEEDS, SKILL_DEFS } from '../src/data';
import type { GoodId, MethodDef, Skill } from '../src/types';

export interface WorldSpec { price?: Partial<Record<GoodId, number>>; wage?: Partial<Record<Skill, number>>; workMul?: number; inputMul?: number; buildMul?: number;
  /** 방식 숫자 직접 바꾸기: { 방식 id: { workers, inputs, taxCapacity } } (workers·inputs 는 통째로 바꾼다) */
  methods?: Record<string, Partial<Pick<MethodDef, 'workers' | 'inputs' | 'taxCapacity'>>> }

const cost = (m: MethodDef) =>
  (Object.entries(m.workers) as [Skill, number][]).reduce((a, [s, n]) => a + (n ?? 0) * SKILL_DEFS[s].baseWage, 0) +
  (Object.entries(m.inputs) as [GoodId, number][]).reduce((a, [g, q]) => a + (q ?? 0) * GOODS[g].basePrice, 0);
const revenue = (m: MethodDef) => (Object.entries(m.outputs) as [GoodId, number][]).reduce((a, [g, q]) => a + (q ?? 0) * GOODS[g].basePrice, 0);

export function applyWorld(spec: WorldSpec | undefined) {
  if (!spec) return;
  for (const [id, o] of Object.entries(spec.methods ?? {})) {
    const m = BUILDING_TYPES.flatMap((t) => t.methods).find((x) => x.id === id);
    if (m) Object.assign(m, o);
  }
  const methods = BUILDING_TYPES.filter((t) => !t.auto).flatMap((t) => t.methods).filter((m) => Object.keys(m.outputs).length > 0);
  // 바꾸기 전 이익률: 매출 / 비용
  const ratio = new Map(methods.map((m) => [m, cost(m) > 0 ? revenue(m) / cost(m) : 0] as const));
  for (const [g, k] of Object.entries(spec.price ?? {}) as [GoodId, number][]) GOODS[g].basePrice *= k;
  for (const [s, k] of Object.entries(spec.wage ?? {}) as [Skill, number][]) SKILL_DEFS[s].baseWage *= k;
  if (spec.buildMul) for (const t of BUILDING_TYPES) if (!t.auto) t.buildPoints *= spec.buildMul;
  // 기본가가 k배면 같은 금액을 채우는 개수는 1/k배 (곡물 fill 같은 예외 비율은 그대로)
  for (const n of NEEDS) for (const o of n.options) o.units /= spec.price?.[o.good] ?? 1;
  for (const m of methods) {
    if (spec.workMul) for (const s of Object.keys(m.workers) as Skill[]) m.workers[s] = (m.workers[s] ?? 0) * spec.workMul;
    if (spec.inputMul) for (const g of Object.keys(m.inputs) as GoodId[]) m.inputs[g] = (m.inputs[g] ?? 0) * spec.inputMul;
    const r = ratio.get(m)!, rev = revenue(m);
    if (r > 0 && rev > 0) {
      const k = (cost(m) * r) / rev;
      for (const g of Object.keys(m.outputs) as GoodId[]) m.outputs[g] = (m.outputs[g] ?? 0) * k;
    }
  }
}
