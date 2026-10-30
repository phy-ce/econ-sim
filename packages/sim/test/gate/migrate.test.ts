import { describe, expect, it } from 'vitest';
import { moneyIdentity, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';
import { fixtureFiles, loadFixture, readFixtureRaw } from '../fixtures/a0';

// T11 (docs/overhaul/10_ARCHITECTURE.md 3.4·8.1): 고정 저장 파일(test/fixtures/save-v<판>-<기간>-<커밋>.json.gz)을 화면과 같은 길
// (sim.worker.ts 'load' → migrateWorld)로 불러와 30일 돌린다. 화폐 보존과 예외 없음을 본다.
// 18판 파일은 A0 에서 0a 이전 코드(9b46c2d)로 cli/makefixtures.ts 가 만들었다. 다시 만들지 않는다 (0a 가 더하는 선택 칸이 없는 진짜 옛 저장이어야 한다).

/** money.test.ts 와 같은 허용 오차: 화폐 총량 × 1e-12 (근거는 그 파일의 주석) */
const MONEY_TOLERANCE = 1e-12;
const moneyDrift = (w: World, m0: number) => Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w));
const DAYS = 30;

describe('T11 고정 저장 파일 불러오기', () => {
  const files = fixtureFiles();

  it('18판 고정 저장 파일이 둘 (100일, 8년) 있다', () => {
    expect(fixtureFiles('100d').some((f) => f.startsWith('save-v18-'))).toBe(true);
    expect(fixtureFiles('8y').some((f) => f.startsWith('save-v18-'))).toBe(true);
  });

  for (const file of files) {
    it(`${file}: 불러와 ${DAYS}일 돌려도 예외가 없고 화폐가 보존된다`, () => {
      const raw = readFixtureRaw(file);
      const ver = Number(file.match(/^save-v(\d+)-/)![1]);
      expect(raw.version, '파일 이름의 판').toBe(ver);
      const w = loadFixture(file);
      // 0a 에서 더할 자리: 불러온 뒤 선택 칸(config.aiSalt·rulesRev·rulesHash)이 기본값으로 채워졌는지 단언한다
      const tick0 = w.tick;
      const m0 = moneyIdentity(w);
      let worst = 0, worstTick = tick0;
      for (let d = 0; d < DAYS; d++) {
        step(w);
        const drift = moneyDrift(w, m0);
        if (drift > worst) { worst = drift; worstTick = w.tick; }
      }
      expect(w.tick).toBe(tick0 + DAYS);
      expect(worst, `가장 큰 어긋남 (화폐 총량 대비): ${worstTick}일`).toBeLessThan(MONEY_TOLERANCE);
    });
  }
});
