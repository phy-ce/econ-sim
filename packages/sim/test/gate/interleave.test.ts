import { describe, expect, it } from 'vitest';
import { createWorld, recordHistory, step } from '../../src/index';
import type { World } from '../../src/index';
import { firstDiff } from '../helpers';
import { loadScript, runScript } from '../fixtures/a0';

// T9 (docs/overhaul/10_ARCHITECTURE.md 3.4·8.1): 두 세계를 하루씩 번갈아 돌린 결과가 각각 따로 돌린 결과와 같다.
// 모듈 전역 캐시·상태를 세계끼리 나눠 쓰면 여기서 갈라진다 (한 워커가 여러 세계를 다루는 실험 워커·분기의 전제).
// 실험 슬롯(덮어쓴 config.tune)을 불러온 뒤 기본 슬롯을 불러오면 기본 값만 남는지 보는 경우는 applyRules 가 생기면(3.9) 여기에 더한다.

const DAYS = 360;
const script = loadScript();

/** A: 시드 2, AI 만 (플레이어 없음) */
const makeA = () => createWorld(2, { withPlayer: false });
/** B: 시드 1, 플레이어 왕실 + 고정 명령열(commands-a0.json)의 첫 해. 화면처럼 새 게임에 기록 한 점을 찍는다 */
const makeB = () => { const w = createWorld(1); recordHistory(w); return w; };
const dayB = (w: World) => runScript(w, w.tick + 1, script);

function expectSame(got: World, want: string, label: string) {
  const s = JSON.stringify(got);
  if (s === want) return;
  expect.fail(`${label}: ${firstDiff(JSON.parse(s), JSON.parse(want))}`);
}

describe('T9 번갈아 돌리기', () => {
  it(`두 세계를 하루씩 번갈아 ${DAYS}일 돌려도 따로 돌린 것과 같다`, () => {
    const a = makeA();
    for (let d = 0; d < DAYS; d++) step(a);
    const aAlone = JSON.stringify(a);
    const b = makeB();
    for (let d = 0; d < DAYS; d++) dayB(b);
    const bAlone = JSON.stringify(b);

    const a2 = makeA(), b2 = makeB();
    for (let d = 0; d < DAYS; d++) { step(a2); dayB(b2); }
    expectSame(a2, aAlone, 'A (시드 2, AI)');
    expectSame(b2, bAlone, 'B (시드 1, 명령열)');
    // 두 세계가 실제로 다르다 (같은 세계 둘을 비교한 것이 아니다)
    expect(aAlone).not.toBe(bAlone);
  });
});
