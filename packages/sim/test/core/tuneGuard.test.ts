// TUNE 덮어쓰기 가드 (2026-11-02 wt-simplify, docs/overhaul/SIMPLIFY_AUDIT.md 3-3): sweep·lab·microcheck·진단 CLI 가 쓰는 data.ts overrideTune 은
// TUNE 에 없는 키(지운 키, 오타)가 있으면 아무것도 바꾸지 않고 멈춘다. 있는 키는 그대로 덮는다.
import { afterEach, describe, expect, it } from 'vitest';
import { TUNE, checkTuneKeys, overrideTune } from '../../src/data';
import { runSpec } from '../../src/lab/run';

const saved = { ...TUNE };
afterEach(() => { Object.assign(TUNE, saved); });

describe('TUNE 덮어쓰기 가드', () => {
  it('없는 키가 하나라도 있으면 멈추고 아무것도 바꾸지 않는다', () => {
    const before = TUNE.shrinkWeeks;
    expect(() => overrideTune({ shrinkWeeks: 4, wageMarket: 1 }, '시험')).toThrow(/wageMarket/);
    expect(TUNE.shrinkWeeks).toBe(before);
    expect(Object.prototype.hasOwnProperty.call(TUNE, 'wageMarket')).toBe(false);
    expect(() => checkTuneKeys({ aiCutSD: 2 })).toThrow(/aiCutSD/);
  });

  it('있는 키는 덮는다', () => {
    overrideTune({ shrinkWeeks: 4 });
    expect(TUNE.shrinkWeeks).toBe(4);
  });

  it('lab 명세(runSpec)도 없는 키면 세계를 만들기 전에 멈추고 TUNE 을 되돌린다', () => {
    expect(() => runSpec({ name: 'guard', seed: 1, years: 1, tune: { wageTarget: 0 } })).toThrow(/wageTarget/);
    expect(TUNE).toEqual(saved);
  });
});
