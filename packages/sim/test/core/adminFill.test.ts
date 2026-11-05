// 행정청 한도는 원료 충족률을 따른다 (DESIGN 9.1): 하루 순서가 노동 → 세금 → 생산이라 세금 때는 그날 충족률이 아직 없고,
// 노동 단계가 b.last 를 새로 만들 때 어제 충족률을 넘긴다 (labor.ts payWages). 전에는 늘 1 로 지워져 종이 없는 전문 관료제도 한도가 그대로였다.
import { afterAll, describe, expect, it } from 'vitest';
import { step } from '../../src/index';
import { taxCapacity } from '../../src/finance';
import { createMicroWorld, restoreMicroScale } from '../../src/lab/micro';

afterAll(() => restoreMicroScale());

/** 마이크로 세계 (AI 끔, 시드 1): 행정청을 전문 관료제로 두고 120일. 종이는 시장에 없고, paper 이면 날마다 건물 재고에 넣어 준다 */
function run(paper: boolean) {
  const w = createMicroWorld({ seed: 1, ai: false });
  const admin = w.buildings.find((b) => b.typeId === 'admin')!;
  admin.methodId = 'admin_professional';
  for (let d = 0; d < 120; d++) {
    if (paper) admin.stock.paper = 1e6;
    step(w);
  }
  const k = w.kingdoms[0];
  return { fill: admin.last.inputFill, cap: k.taxCapacity ?? 0, now: taxCapacity(w, k.id), staffing: admin.last.staffing };
}

describe('행정청 한도와 원료', () => {
  it('종이가 없으면 한도를 잃고 종이가 있으면 지킨다', () => {
    const without = run(false), withPaper = run(true);
    expect(withPaper.staffing).toBeGreaterThan(0);
    expect(withPaper.fill).toBe(1);
    expect(withPaper.cap).toBeGreaterThan(0);
    expect(without.fill).toBe(0);
    expect(without.cap).toBe(0);
    expect(without.now).toBe(0);
  });
});
