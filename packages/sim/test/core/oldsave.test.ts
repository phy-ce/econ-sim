import { describe, expect, it } from 'vitest';
import { createWorld, step } from '../../src/index';
import type { World } from '../../src/index';

// 상품을 더해도 저장 형식(version)은 그대로다: 옛 저장에 없는 상품의 시장은 step 이 기본가로 채운다
describe('옛 저장', () => {
  it('술 시장이 없는 저장을 불러와도 그대로 돌아간다', () => {
    const w = createWorld(3);
    for (let d = 0; d < 30; d++) step(w);
    const old: World = JSON.parse(JSON.stringify(w));
    for (const r of old.regions) delete (r.market as Partial<World['regions'][number]['market']>).liquor;
    for (let d = 0; d < 30; d++) step(old);
    for (const r of old.regions) {
      expect(r.market.liquor.price).toBeGreaterThan(0);
      for (const g of Object.values(r.market)) expect(Number.isFinite(g.price)).toBe(true);
    }
    for (const p of old.pops) expect(Number.isFinite(p.wealth) && Number.isFinite(p.savings)).toBe(true);
  });
});
