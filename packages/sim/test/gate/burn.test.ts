import { describe, expect, it } from 'vitest';
import { createWorld, step } from '../../src/index';
import type { World } from '../../src/index';
import { rand } from '../../src/rng';
import { firstDiff } from '../helpers';

// T5b (docs/overhaul/10_ARCHITECTURE.md 3.4·3.8·8.1): 효과 없이 id 하나와 공유 난수 하나를 소비한 세계(burn)와 원본의 지표 궤적이 비트까지 같다.
// 0a 이전에는 AI 가 공유 난수열(rng.ts rand)을 써서 이것만으로 궤적이 갈라졌다. 0a 뒤 AI 난수는 키의 해시라(rng/aiRand.ts) 같아야 한다.
// 측정이 아니라 단언이다. burn 은 3.8 의 개발 훅과 같은 것(lab/ 이 아직 없어 여기에 둔다).

const YEARS = 5;

/** 효과 없이 w.nextId 를 ids 만큼 올리고 rand(w) 를 rands 번 소비한다 */
function burn(w: World, { ids, rands }: { ids: number; rands: number }) {
  w.nextId += ids;
  for (let i = 0; i < rands; i++) rand(w);
}

describe('T5b burn 쌍', () => {
  it(`id 하나·공유 난수 하나를 더 쓴 세계도 ${YEARS}년 지표 궤적이 같다 (시드 1)`, () => {
    const a = createWorld(1), b = createWorld(1);
    burn(b, { ids: 1, rands: 1 });
    expect(b.nextId).toBe(a.nextId + 1);
    expect(b.rngState).not.toBe(a.rngState);
    for (let d = 0; d < YEARS * 360; d++) { step(a); step(b); }
    expect(a.metrics.length).toBeGreaterThan(YEARS * 10);
    // 지표 기록(w.metrics)에는 id 가 없다. 건물·pop 수도 같아야 한다 (id 값 자체는 하나씩 밀려 있다)
    const d = firstDiff(JSON.parse(JSON.stringify(b.metrics)), JSON.parse(JSON.stringify(a.metrics)));
    expect(d).toBeNull();
    expect([b.buildings.length, b.pops.length, b.constructions.length]).toEqual([a.buildings.length, a.pops.length, a.constructions.length]);
    expect(b.nextId - a.nextId).toBe(1);
  });
});
