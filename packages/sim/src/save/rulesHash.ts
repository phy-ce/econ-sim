import { BUILDING_TYPES, GOODS, INDUSTRIES, NEEDS, TECHS, TUNE } from '../data';
import type { World } from '../types';
import golden from '../../golden.json';

/**
 * 규칙 식별 (오버홀 0a, docs/overhaul/10_ARCHITECTURE.md 3.9).
 * - rulesHash: 규칙 표(TUNE 전 키 + 건물·상품·기술·산업·필요 표)를 키 정렬 JSON 으로 만든 해시. 플레이어에게 보이지 않고, 재생·공유의 '일치' 판정에만 쓴다.
 *   sweep·worldtune 이 표를 직접 고치므로 부를 때마다 계산한다 (data.ts 표가 모듈 평가 때 만들어지므로 모듈 평가 때는 계산하지 않는다).
 *   AI 판단·식 같은 코드 변경은 이 해시에 안 잡힌다: 그것은 골든 이력(cli/golden.ts)이 맡는다.
 * - RULES_REV: 골든 이력(packages/sim/golden.json, 덧붙이기만 하는 [{hash, date, commit}])의 길이. 플레이어에게 보이는 규칙 판 라벨.
 *   사람이 올리지 않는다: premerge 마지막 단계의 npm run golden:update 가 골든 해시가 바뀌었을 때만 항목을 덧붙인다.
 * 브라우저 워커에서도 돌므로 node:crypto 를 쓰지 않는다.
 */

export interface GoldenEntry { hash: string; date: string; commit: string }
export const GOLDEN_HISTORY: readonly GoldenEntry[] = golden as GoldenEntry[];
export const RULES_REV = GOLDEN_HISTORY.length;

/** 키를 정렬한 JSON (undefined 칸은 빠진다) */
function sortedJson(v: unknown): string {
  return JSON.stringify(v, (_k, x: unknown) => {
    if (!x || typeof x !== 'object' || Array.isArray(x)) return x;
    const o = x as Record<string, unknown>;
    return Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
  });
}

/** 문자열 → 16자리 16진수 (32비트 해시 둘: FNV-1a 와 다른 곱수의 변형) */
export function hash64(s: string): string {
  let a = 0x811c9dc5, b = 0x9747b28c;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ c, 0x5bd1e995);
    b ^= b >>> 15;
  }
  a = Math.imul(a ^ (a >>> 16), 0x85ebca6b); a ^= a >>> 13;
  b = Math.imul(b ^ (b >>> 16), 0xc2b2ae35); b ^= b >>> 16;
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}

/** 지금 규칙 표의 해시 */
export function rulesHash(): string {
  return hash64(sortedJson({ TUNE, BUILDING_TYPES, GOODS, TECHS, INDUSTRIES, NEEDS }));
}

/** 새 세계에 지금 규칙 판·해시를 단다 (index.ts createWorld) */
export function stampRules(w: World): World {
  w.config.rulesRev = RULES_REV;
  w.config.rulesHash = rulesHash();
  return w;
}
