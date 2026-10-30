import { TICKS_PER_WEEK } from '../data';
import type { World } from '../types';

/**
 * AI 난수 (오버홀 0a, docs/overhaul/10_ARCHITECTURE.md 3.2·4.1).
 * 공유 난수열(rng.ts rand) 대신 (시드, 소금, 태그, 키들)의 해시로 0..1 을 낸다. 같은 키면 언제 몇 번째로 불러도 같은 값이라,
 * 플레이어 명령이 건물·공사를 하나 더해도 다른 후보가 받는 난수가 밀리지 않는다.
 * 키는 시작 때 고정이거나 데이터 id 인 것만 쓴다 (회사 id, 지역 id, 종류·방식·기술 id 문자열, 주, 묶음 안 순번).
 * 건물·공사·pop id 는 w.nextId 로 정해져 명령 하나에 밀리므로 못 쓴다: 키 도우미 다섯 개가 만든 AiKey 만 받으므로 컴파일에서 막힌다.
 * 저장 상태를 바꾸지 않는다 (w.rngState 를 쓰지 않는다).
 */

declare const aiKeyBrand: unique symbol;
/** 키 도우미(keyCompany·keyRegion·keyStr·keyWeek·keyIdx)로만 만드는 정수 */
export type AiKey = number & { readonly [aiKeyBrand]: true };

/** 쓰는 곳마다 태그 하나 (3.2 키 규칙 표) */
export type AiTag = 'research' | 'least' | 'pick' | 'pickDev' | 'grow';

/** 문자열 → 32비트 정수 (FNV-1a) */
export function strKey(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h | 0;
}

/** 마무리 섞기 (economy.ts hash01 의 마무리 단계와 같은 상수) */
function mix(h: number): number {
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h;
}

/** 회사 id (시작 때 고정, world.ts) */
export const keyCompany = (id: number) => id as AiKey;
/** 지역 id (데이터) */
export const keyRegion = (id: number) => id as AiKey;
/** 데이터 id 문자열 (건물 종류·방식·기술) */
export const keyStr = (s: string) => strKey(s) as AiKey;
/** 틱 → 주 번호 */
export const keyWeek = (tick: number) => Math.floor(tick / TICKS_PER_WEEK) as AiKey;
/** 같은 키 묶음 안의 순번 (배열 순서·호출 순번으로 센 0, 1, 2 …. id 가 아니다) */
export const keyIdx = (n: number) => n as AiKey;

/** 식 그대로 (4.1). 소금은 0 이어도 섞인다: 소금 없는 해시와 값이 다르다 */
export function aiHash(seed: number, salt: number, tag: AiTag, keys: readonly AiKey[]): number {
  let h = mix(seed ^ 0x9e3779b9);
  h = mix(h ^ Math.imul(salt + 0x632be59b, 0xc2b2ae35));
  h = mix(h ^ strKey(tag));
  for (const k of keys) h = mix(h ^ Math.imul(k + 0x27d4eb2f, 0x165667b1));
  return (h >>> 0) / 4294967296;
}

/**
 * 진단·시험용 (aiTrace 와 같은 개발 훅): aiRand 가 불릴 때마다 (태그, 키, 값)을 넘긴다.
 * 기본은 비어 있고 저장하지 않는다. 시뮬레이션 상태를 바꾸지 않는다
 */
export const aiRandTrace: { on?: (w: World, tag: AiTag, keys: readonly AiKey[], value: number) => void } = {};

/** AI 판단용 0..1. 소금은 w.config.aiSalt (없으면 0) */
export function aiRand(w: World, tag: AiTag, ...keys: AiKey[]): number {
  const v = aiHash(w.seed, w.config.aiSalt ?? 0, tag, keys);
  aiRandTrace.on?.(w, tag, keys, v);
  return v;
}
