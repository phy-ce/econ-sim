import { describe, it } from 'vitest';
import { LONG_TIMEOUT, longRun } from './longRun';

describe('장기 20년: 화폐 보존과 노동자 식량', () => {
  it('시드 2', () => longRun(2), LONG_TIMEOUT);
});
