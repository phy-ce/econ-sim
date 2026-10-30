import type { World } from './types';

/** mulberry32. 상태를 world에 저장해서 저장/불러오기 후에도 결과가 같다. 오버홀 0a 뒤 sim 은 쓰지 않는다 (AI 난수는 rng/aiRand.ts, w.rngState 는 저장 호환으로 남는다) */
export function rand(world: World): number {
  let t = (world.rngState = (world.rngState + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function clamp(x: number, lo: number, hi: number): number {
  return x < lo ? lo : x > hi ? hi : x;
}

/** 소수 둘째 자리 (화면에 그대로 나가는 기록·임금에만 쓴다, round.ts) */
export const round2 = (x: number) => Math.round(x * 100) / 100;
