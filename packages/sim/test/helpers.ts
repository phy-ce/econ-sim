import { step } from '../src/index';
import type { World } from '../src/index';

export const run = (w: World, ticks: number) => { for (let i = 0; i < ticks; i++) step(w); };

/** 노동자의 식량 충족률 (인구 가중). 기아는 부가 아니라 이것으로 판정한다 */
export function laborerFood(w: World): number {
  let pop = 0, fed = 0;
  for (const p of w.pops) if (p.prof === 'unskilled') { pop += p.size; fed += p.size * p.food; }
  return pop > 0 ? fed / pop : 1;
}

/** 두 값이 처음 갈라지는 경로 (같으면 null). 결정성 실패를 큰 JSON diff 대신 한 줄로 보여 준다 */
export function firstDiff(a: unknown, b: unknown, path = '$'): string | null {
  if (a === b) return null;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return `${path}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array vs object`;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  if (Array.isArray(a) && a.length !== (b as unknown[]).length) return `${path}.length: ${a.length} != ${(b as unknown[]).length}`;
  for (const k of keys) {
    const d = firstDiff((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], `${path}.${k}`);
    if (d) return d;
  }
  return null;
}
