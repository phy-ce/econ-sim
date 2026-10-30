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
/** 0a 가 더한 config 선택 칸과 불러올 때 채우는 기본값 (compat.ts migrateWorld) */
const OPTIONAL_DEFAULTS = { aiSalt: 0, rulesRev: 0, rulesHash: '' } as const;

describe('T11 고정 저장 파일 불러오기', () => {
  const files = fixtureFiles();

  it('18판 고정 저장 파일이 둘 (100일, 8년) 있다', () => {
    expect(fixtureFiles('100d').some((f) => f.startsWith('save-v18-'))).toBe(true);
    expect(fixtureFiles('8y').some((f) => f.startsWith('save-v18-'))).toBe(true);
  });

  it('0a 이전 코드로 만든 고정 저장에는 선택 칸(config.aiSalt·rulesRev·rulesHash)이 없다 (채움을 시험할 수 있다)', () => {
    const old = files.filter((f) => {
      const c = readFixtureRaw(f).config as Record<string, unknown>;
      return Object.keys(OPTIONAL_DEFAULTS).every((k) => c[k] === undefined);
    });
    expect(old.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file}: 불러와 ${DAYS}일 돌려도 예외가 없고 화폐가 보존된다`, () => {
      const raw = readFixtureRaw(file);
      const ver = Number(file.match(/^save-v(\d+)-/)![1]);
      expect(raw.version, '파일 이름의 판').toBe(ver);
      const w = loadFixture(file);
      // 0a 선택 칸: 옛 저장에는 없고, 불러오면 기본값(소금 0, 규칙 판 0 = 이력 전, 규칙 해시 '' = 모름)으로 채워진다. 판은 그대로다
      // (0a 뒤에 만든 파일에 칸이 있으면 그 값이 그대로 남는다)
      const rawConfig = raw.config as Record<string, unknown>;
      expect(w.version).toBe(18);
      for (const [k, def] of Object.entries(OPTIONAL_DEFAULTS)) expect(w.config[k as keyof typeof OPTIONAL_DEFAULTS], `config.${k}`).toBe(rawConfig[k] ?? def);
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
