import { describe, expect, it } from 'vitest';
import { createWorld } from '../../src/world';
import { weeklyAlerts } from '../../src/alerts';
import { BUILDING_BY_ID } from '../../src/data';

// 2026-11-20 사용자: 건물마다 따로 내던 일손·투입재 알림은 회사마다 하나로 묶고, 풀린 알림은 소식에서 지운다
describe('weekly alerts', () => {
  it('groups understaffed buildings per company and drops the alert once resolved', () => {
    const w = createWorld(42);
    const c = w.companies.find((x) => x.isPlayer)!;
    const mine = w.buildings.filter((b) => b.companyId === c.id && b.active && !BUILDING_BY_ID[b.typeId].auto).slice(0, 2);
    expect(mine.length).toBe(2);
    for (const b of w.buildings) b.last.staffing = 1;
    for (const b of mine) b.last.staffing = 0.3;
    weeklyAlerts(w);
    const staff = w.events.filter((e) => e.key === `staff:${c.id}`);
    expect(staff.length).toBe(1);
    expect(staff[0].text).toContain('2곳');
    for (const b of mine) b.last.staffing = 1;
    w.tick += 7;
    weeklyAlerts(w);
    expect(w.events.some((e) => e.key === `staff:${c.id}`)).toBe(false);
    expect(w.alertState[`staff:${c.id}`]).toBeUndefined();
  });
});
