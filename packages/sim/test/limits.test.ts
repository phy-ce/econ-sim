import { describe, expect, it } from 'vitest';
import { BUILDING_BY_ID, DEPOSITS, LAND_TYPES, SKILLS, createWorld, depositFree, landFree } from '../src/index';
import { run } from './helpers';

describe('경제 불변식: 한도', () => {
  it('고용이 일자리를 넘지 않고, 땅과 매장량 한도를 넘는 건물이 없다', () => {
    const w = createWorld(5);
    run(w, 360 * 3);
    for (const b of w.buildings) {
      if (BUILDING_BY_ID[b.typeId].auto) continue;
      const method = BUILDING_BY_ID[b.typeId].methods.find((m) => m.id === b.methodId)!;
      // 하루 안의 인구 증가만큼은 다음 날 해고로 정리된다
      for (const s of SKILLS) expect(b.employed[s]).toBeLessThanOrEqual((method.workers[s] ?? 0) * b.level * b.utilization * 1.001 + 1e-6);
    }
    for (const r of w.regions) {
      for (const land of LAND_TYPES) expect(landFree(w, r.id, land)).toBeGreaterThanOrEqual(0);
      for (const d of DEPOSITS) expect(depositFree(w, r.id, d)).toBeGreaterThanOrEqual(0);
    }
  });
});
