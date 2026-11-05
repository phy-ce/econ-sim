// 잠재 수요 새 투자 (AI 판단, DESIGN 10, ai.ts latentWants): 수요가 0 이라 값이 기본가에 머무는 상품도, 기술로 열린 더 나은 방식이 그 원료만 없어 막혀 있으면 AI 가 공급을 짓는다.
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { TUNE, overrideTune } from '../../src/data';
import { step } from '../../src/index';
import { createMicroWorld, restoreMicroScale } from '../../src/lab/micro';

const saved = TUNE.aiLatentInput;
afterEach(() => { overrideTune({ aiLatentInput: saved }); });
afterAll(() => restoreMicroScale());

/** 마이크로 세계: 건축사무소가 목재 비계를 알고 철광맥이 있지만 철광석 공급은 0 이다. 2년 뒤 철광산 레벨 (공사 중 포함) */
function mineLevels(mode: number) {
  overrideTune({ aiLatentInput: mode });
  const w = createMicroWorld({ seed: 1, plot: 30 });
  const r = w.regions[0];
  r.deposits.iron = 5; r.land.ore = 5;
  for (const c of w.companies) for (const t of ['guilds', 'scaffolding']) if (!c.research.known.includes(t)) c.research.known.push(t);
  let peak = 0;
  for (let d = 0; d < 720; d++) {
    step(w);
    const n = w.buildings.filter((b) => b.typeId === 'mine').reduce((a, b) => a + b.level, 0) + w.constructions.filter((k) => k.typeId === 'mine').length;
    peak = Math.max(peak, n);
  }
  return peak;
}

describe('잠재 수요 새 투자', () => {
  it('끄면 값 신호가 없어 철광산을 짓지 않고, 켜면 짓는다', () => {
    expect(mineLevels(0)).toBe(0);
    expect(mineLevels(3)).toBeGreaterThan(0);
  });
});
