import { describe, expect, it } from 'vitest';
import { createWorld } from '../../src/world';
import { weeklyAlerts } from '../../src/alerts';
import { BUILDING_BY_ID } from '../../src/data';

// 2026-11-20 사용자: 건물마다 따로 내던 투입재 알림은 회사마다 하나로 묶고, 풀린 알림은 소식에서 지운다. 2026-11-21: 일손 부족·투입재 가격 급등 알림은 없앴다
describe('weekly alerts', () => {
  it('groups input-short buildings per company, drops the alert once resolved, never alerts understaffing', () => {
    const w = createWorld(42);
    const c = w.companies.find((x) => x.isPlayer)!;
    const mine = w.buildings.filter((b) => b.companyId === c.id && b.active && !BUILDING_BY_ID[b.typeId].auto).slice(0, 2);
    expect(mine.length).toBe(2);
    for (const b of w.buildings) { b.last.staffing = 1; b.last.inputFill = 1; b.idle = false; }
    for (const b of mine) b.last.inputFill = 0.3;
    w.buildings.find((b) => !mine.includes(b) && b.companyId === c.id && !BUILDING_BY_ID[b.typeId].auto)!.last.staffing = 0.2;
    weeklyAlerts(w);
    const short = w.events.filter((e) => e.key === `inputs:${c.id}`);
    expect(short.length).toBe(1);
    expect(short[0].text).toContain('2곳');
    expect(w.events.some((e) => e.key?.startsWith('staff:') || e.key?.startsWith('spike:'))).toBe(false);
    for (const b of mine) b.last.inputFill = 1;
    w.tick += 7;
    weeklyAlerts(w);
    expect(w.events.some((e) => e.key === `inputs:${c.id}`)).toBe(false);
    expect(w.alertState[`inputs:${c.id}`]).toBeUndefined();
  });
});
