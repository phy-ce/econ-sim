import { describe, expect, it } from 'vitest';
import { createWorld, moneyIdentity, step } from '../../src/index';
import { stateFlags } from '../helpers';

describe('경제 불변식: 범위', () => {
  // 매일 모든 값을 본다. expect 를 값마다 부르면 그 비용이 시뮬레이션보다 커서, 어긋난 값을 모아 그날 끝에 한 번에 판정한다.
  // 검사 목록은 helpers.ts stateFlags (장기 시험과 같이 쓴다)
  it('가격·현금·저축·부 단계가 정상 범위를 벗어나지 않는다', () => {
    const w = createWorld(3);
    const m0 = moneyIdentity(w);
    const bad: string[] = [];
    const flag = (msg: string) => { if (bad.length < 20) bad.push(`${w.tick}일 ${msg}`); };
    for (let i = 0; i < 360 * 2 && bad.length === 0; i++) {
      step(w);
      stateFlags(w, flag);
      // 다른 시드에서도 화폐 보존을 매일 본다 (덤, 거의 공짜)
      if (!(Math.abs(moneyIdentity(w) - m0) / m0 < 1e-9)) flag(`화폐 장부 어긋남 ${moneyIdentity(w) - m0}`);
    }
    expect(bad).toEqual([]);
  });
});
