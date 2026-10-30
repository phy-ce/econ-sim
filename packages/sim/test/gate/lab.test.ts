import { describe, expect, it } from 'vitest';
import { createWorld, moneyIdentity, step } from '../../src/index';
import { drain, runSpec } from '../../src/lab/run';
import type { LabSpec } from '../../src/lab/run';
import { worldHash } from '../fixtures/a0';

// 0b 측정 도구 (src/lab, docs/overhaul/10_ARCHITECTURE.md 3.1·3.8): 관측이 세계를 바꾸지 않고, 같은 명세는 같은 줄을 낸다.
// 1) 명령 없는 lab 실행 = 그냥 step 의 세계 (해시). 2) 관측을 켠 실행 = 끈 실행 (고정 연구·처방 매크로 포함). 3) 같은 명세 두 번 = 같은 jsonl 줄.

const YEAR = 360;

describe('lab 실행기', () => {
  it('명령 없는 lab 실행(관측 켬)과 그냥 step 의 세계 해시가 같다 (1년, 시드 1)', () => {
    const lab = runSpec({ name: 't', seed: 1, years: 1, research: 'none' }).world;
    const w = createWorld(1);
    while (w.tick < YEAR) step(w);
    expect(worldHash(lab)).toBe(worldHash(w));
  });

  const spec: LabSpec = {
    name: 't', seed: 2, years: 1, budget: { tax: 4 },
    script: [{ t: 0, cmd: { macro: 'schools', n: 2 } }, { t: 0, cmd: { macro: 'methodStep' } }, { t: 30, cmd: { macro: 'buildPrivatize', wait: 30 } }],
  };

  it('관측을 켠 실행과 끈 실행의 세계 해시가 같다 (고정 연구·예산·매크로, 1년, 시드 2)', () => {
    const on = runSpec(spec), off = runSpec(spec, { observe: false });
    expect(on.rows.length).toBe(4);
    expect(off.rows.length).toBe(0);
    expect(worldHash(on.world)).toBe(worldHash(off.world));
    expect(on.log).toEqual(off.log);
  });

  it('같은 명세 두 번은 같은 줄을 낸다', () => {
    const a = runSpec(spec), b = runSpec(spec);
    expect(JSON.stringify(a.rows)).toBe(JSON.stringify(b.rows));
    expect(a.log).toEqual(b.log);
    // 처방이 실제로 들어갔다 (학교 2레벨 착공, 고정 연구)
    expect(a.log.filter((l) => l.what.startsWith('school@') && l.err === null).length).toBe(2);
    expect(a.log.some((l) => l.what.startsWith('research '))).toBe(true);
  });

  it('고갈 처방(drain)은 화폐 항등식을 지킨다', () => {
    const w = createWorld(1);
    for (let d = 0; d < 30; d++) step(w);
    const before = moneyIdentity(w);
    for (const k of w.kingdoms) drain(w, k.id);
    expect(Math.abs(moneyIdentity(w) - before)).toBeLessThan(1e-6);
    expect(w.companies.filter((c) => c.state).every((c) => c.cash === 0 && c.debt > 0)).toBe(true);
  });
});
