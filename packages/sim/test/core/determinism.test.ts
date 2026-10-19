import { describe, expect, it } from 'vitest';
import { BUILDING_BY_ID, TICKS_PER_WEEK, applyCommandMsg, createWorld, isGovernment, step } from '../../src/index';
import type { QueuedCommand, World } from '../../src/index';
import { firstDiff } from '../helpers';

/** 저장/불러오기 (게임이 쓰는 것과 같은 JSON 왕복) */
const reload = (w: World): World => JSON.parse(JSON.stringify(w));

/** w 를 tick 까지 진행한다 */
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };

/** 두 세계가 같은지: 문자열로 비교하고, 다르면 처음 갈라진 경로를 알려 준다 */
function expectSame(got: World, want: string, label: string) {
  const s = JSON.stringify(got);
  if (s === want) return;
  expect.fail(`${label}: ${firstDiff(JSON.parse(s), JSON.parse(want))}`);
}

describe('결정성', () => {
  // a 는 끊김 없이, b 는 두 번 저장/불러오기 하며 같은 시드로 돌린다.
  // 첫 저장은 주 중간(100일), 둘째는 주 경계 직후(147일 = 21주, 주간 처리·장부 이월 바로 뒤)다.
  // 비교는 첫 주간 처리 직후(105일)와 4주 정책 점검·지표 기록을 지난 끝(200일)에서 한다
  it('같은 시드는 같은 결과를 낸다 (저장/불러오기 포함)', () => {
    expect(147 % TICKS_PER_WEEK).toBe(0);
    expect(105 % TICKS_PER_WEEK).toBe(0);
    const a = createWorld(42);
    runTo(a, 105);
    const a105 = JSON.stringify(a);
    runTo(a, 200);
    const a200 = JSON.stringify(a);

    let b = createWorld(42);
    runTo(b, 100);
    b = reload(b);
    runTo(b, 105);
    expectSame(b, a105, '105일 (100일 저장 후 첫 주 경계)');
    runTo(b, 147);
    b = reload(b);
    runTo(b, 200);
    expectSame(b, a200, '200일 (147일 주 경계 저장 후)');
  });

  // 같은 명령은 틱 사이(applyCommandMsg, 지금 화면)로 넣든 step 의 명령 목록(나중의 서버·재생)으로 넣든 같은 세계가 된다.
  // 명령이 소수 셋째 자리 이상의 값을 써도 두 길 모두 명령마다 저장값을 맞춘다
  it('명령은 틱 사이로 넣든 step 의 명령 목록으로 넣든 결과가 같다', () => {
    const w = createWorld(2);
    runTo(w, 3);
    const firm = w.companies.find((c) => !c.state)!;
    const b = w.buildings.find((x) => x.companyId === firm.id && x.active && !BUILDING_BY_ID[x.typeId].auto && !isGovernment(x.typeId))!;
    const cmds: QueuedCommand[] = [
      { actor: firm.id, cmd: { type: 'setWageOffset', skill: 'unskilled', offset: 0.123456 } },
      { actor: firm.id, cmd: { type: 'setUtilization', buildingId: b.id, utilization: 0.3333333 } },
    ];
    const a = reload(w), q = reload(w);
    for (const c of cmds) expect(applyCommandMsg(a, c.actor, c.cmd)).toBeNull();
    step(a);
    expect(step(q, cmds)).toEqual([]);
    expectSame(q, JSON.stringify(a), '명령 다음 날');
    runTo(a, 40);
    runTo(q, 40);
    expectSame(q, JSON.stringify(a), '40일');
  });
});
