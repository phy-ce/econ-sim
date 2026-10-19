import type { World } from './types';

/** mulberry32. 상태를 world에 저장해서 저장/불러오기 후에도 결과가 같다 */
export function rand(world: World): number {
  let t = (world.rngState = (world.rngState + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

/** 숫자는 소수 둘째 자리까지 */
export const round2 = (x: number) => Math.round(x * 100) / 100;

/** 소수 둘째 자리 아래를 버린다 (0 이하는 0). 상한 화물처럼 줄기만 하는 양에 쓴다: 반올림하면 작은 양이 줄지 않고 남는다 */
export const floor2 = (x: number) => (x > 0 ? Math.floor(x * 100 + 1e-7) / 100 : 0);
