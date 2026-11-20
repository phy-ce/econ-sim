import { describe, it, expect } from 'vitest';
import { createWorld, type GameEvent } from '@econ/sim';
import { eventKey, isPlayerResearchDone, unreadNewsCount } from '../src/news';
import { eventDestination } from '../src/eventDestination';
import { dangerPause } from '../src/dangerPause';
const event: GameEvent = { tick: 10, companyId: 100, kind: 'info', text: 'done', topic: 'researchDone' };
describe('alert identity and research completion', () => {
  it('routes explicit research completion before attached region/building links', () => {
    const w = createWorld(42);
    expect(eventDestination(w, { ...event, regionId: w.regions[0].id, buildingId: w.buildings[0].id })).toEqual({
      kind: 'research',
    });
    expect(isPlayerResearchDone(event)).toBe(true);
    expect(isPlayerResearchDone({ ...event, companyId: 101 })).toBe(false);
    expect(isPlayerResearchDone({ ...event, topic: undefined })).toBe(false);
  });
  it('preserves keyed identity through edited text and destinations, but distinguishes new episodes', () => {
    const a = { ...event, key: 'inputs:100' },
      b = { ...a, text: 'updated', regionId: 2, buildingId: 3 };
    expect(eventKey(a)).toBe(eventKey(b));
    expect(eventKey(a)).not.toBe(eventKey({ ...a, tick: 11 }));
    expect(eventKey(a)).not.toBe(eventKey({ ...a, companyId: 101 }));
    expect(eventKey(event)).not.toBe(eventKey({ ...event, text: 'another' }));
  });
  it('preserves read state through removal, reordering and text updates', () => {
    const w = createWorld(42),
      a = { ...event, key: 'staff:100' },
      b = { ...event, key: 'inputs:100', tick: 11 };
    w.events = [a, b];
    expect(unreadNewsCount(w, 10)).toBe(1);
    w.events = [{ ...b, text: 'updated' }];
    expect(unreadNewsCount(w, 10)).toBe(1);
    expect(unreadNewsCount(w, 11)).toBe(0);
  });
  it('uses the simulation key for danger episodes despite changed destinations', () => {
    const seen = new Map(),
      a = { ...event, kind: 'danger' as const, key: 'unpaid:3' };
    expect(dangerPause(seen, a, true)).toBe(true);
    expect(dangerPause(seen, { ...a, tick: 11, text: 'changed', buildingId: 8 }, true)).toBe(false);
  });
});
