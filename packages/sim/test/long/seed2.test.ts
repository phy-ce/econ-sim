import { describe, it } from 'vitest';
import { LONG_TIMEOUT, longRun } from './longRun';

describe('장기 20년: 완주·화폐 보존·상태 값 범위 (경제 지표는 데이터로)', () => {
  it('시드 2', () => longRun(2), LONG_TIMEOUT);
});
