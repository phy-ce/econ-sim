import { describe, it } from 'vitest';
import { LONG_TIMEOUT, longRun } from './longRun';

describe('장기: 20년이면 경제가 다 발전한다', () => {
  it('시드 1', () => longRun(1), LONG_TIMEOUT);
});
