import { describe, it, expect } from 'vitest';
import { createWorld, type GameEvent } from '@econ/sim';
import { ownNewsFilter, unreadNewsCount } from '../src/news';
describe('news badge', () => {
  it('counts own kingdom and shared information as well as warnings', () => {
    const w = createWorld(42),
      me = w.companies.find((c) => c.isPlayer)!,
      other = w.companies.find((c) => c.kingdomId !== me.kingdomId)!;
    const own = w.companies.find((c) => c.kingdomId === me.kingdomId && c.id !== me.id)!;
    w.events = [me.id, own.id, null, other.id].map(
      (companyId) => ({ companyId, tick: 10, kind: 'info', text: 'test' }) as GameEvent,
    );
    expect(w.events.filter(ownNewsFilter(w))).toHaveLength(3);
    expect(unreadNewsCount(w, 9)).toBe(3);
    expect(unreadNewsCount(w, 10)).toBe(0);
  });
});
