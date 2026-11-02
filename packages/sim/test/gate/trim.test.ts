import { afterEach, describe, expect, it } from 'vitest';
import { TICKS_PER_WEEK, TUNE, createWorld, moneyIdentity, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';
import { aiTrace } from '../../src/ai';
import { canonicalJson } from '../fixtures/a0';
import { firstDiff } from '../helpers';

// 넘침 퇴출 (이슈 #11 F3, TUNE.aiTrimSD·aiTrimFrom·aiTrimPause, ai.ts trimExit)의 불변식: 화폐 보존, 결정성(저장/불러오기 포함, Region.trim 이 저장에 실린다),
// 끔 = 같음 (aiTrimSD 0 이면 aiTrimFrom 을 바꿔도 기본값 세계와 같다). 판정은 코드 문제만 본다 (경제 결과로는 실패하지 않는다).
// 켜는 값은 짓기 1.2 / 헐기 1.25, 듣지 않으면 52주 쉼(기본은 끔이라 그 길도 지나게 켰다)이고, 250일 안에 철거 길을 지나도록 시작 주만 0 으로 당겼다.

/** money.test.ts 와 같은 허용 오차: 화폐 총량 × 1e-12 (근거는 그 파일의 주석) */
const MONEY_TOLERANCE = 1e-12;
const moneyDrift = (w: World, m0: number) => Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w));
const reload = (w: World): World => JSON.parse(JSON.stringify(w));
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };

function expectSame(got: World, want: string, label: string) {
  const s = JSON.stringify(got);
  if (s === want) return;
  expect.fail(`${label}: ${firstDiff(JSON.parse(s), JSON.parse(want))}`);
}

type Over = Partial<Record<keyof typeof TUNE, number>>;
const KEYS = ['aiGlutSD', 'aiTrimSD', 'aiTrimFrom', 'aiTrimPause'] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, TUNE[k]]));
afterEach(() => { Object.assign(TUNE, saved); aiTrace.on = undefined; });
const setTune = (o: Over) => { Object.assign(TUNE, saved); Object.assign(TUNE, o); };

const ON: Over = { aiGlutSD: 1.2, aiTrimSD: 1.25, aiTrimFrom: 0, aiTrimPause: 52 };

describe('넘침 퇴출을 켠 세계', () => {
  const SAVE1 = 100, CMP1 = 147, SAVE2 = 154, CMP2 = 250;
  let snaps: Record<number, string> | null = null;
  const events: Record<string, number> = {};
  let money = { worst: 0, worstTick: 0 };
  function runA() {
    if (snaps) return snaps;
    setTune(ON);
    aiTrace.on = (_w, _c, path) => { if (path === 'trimDemo' || path === 'trimHold' || path === 'trimStop') events[path] = (events[path] ?? 0) + 1; };
    const a = createWorld(1);
    const m0 = moneyIdentity(a);
    const s: Record<number, string> = {};
    while (a.tick < CMP2) {
      step(a);
      const drift = moneyDrift(a, m0);
      if (drift > money.worst) money = { worst: drift, worstTick: a.tick };
      if (a.tick === CMP1 || a.tick === CMP2) s[a.tick] = JSON.stringify(a);
    }
    aiTrace.on = undefined;
    snaps = s;
    return s;
  }

  it('화폐 보존: 250일 동안 매일 장부가 맞는다 (시드 1), 철거 길을 지난다', () => {
    runA();
    expect(money.worst, `가장 큰 어긋남 (화폐 총량 대비): ${money.worstTick}일`).toBeLessThan(MONEY_TOLERANCE);
    expect(events.trimDemo ?? 0, '넘침 퇴출 철거').toBeGreaterThan(0);
  });

  it('결정성: 저장/불러오기 하며 이어 달려도 같다 (시드 1, trim 이 저장에 실린다)', () => {
    expect(SAVE2 % TICKS_PER_WEEK).toBe(0);
    const s = runA();
    setTune(ON);
    let b = createWorld(1);
    runTo(b, SAVE1);
    b = reload(b);
    expect(b.regions.some((r) => r.trim && Object.keys(r.trim).length > 0), `${SAVE1}일 저장에 trim`).toBe(true);
    runTo(b, CMP1);
    expectSame(b, s[CMP1], `${CMP1}일 (${SAVE1}일 저장 후)`);
    runTo(b, SAVE2);
    b = reload(b);
    runTo(b, CMP2);
    expectSame(b, s[CMP2], `${CMP2}일 (${SAVE2}일 주 경계 저장 후)`);
  });

  it('끔 = 같음: aiTrimSD 0 이면 aiTrimFrom·aiTrimPause 를 바꿔도 기본값 세계와 같다 (시드 3, 200일)', () => {
    const DAYS = 200;
    setTune({});
    expect(TUNE.aiTrimSD).toBe(0);
    const a = createWorld(3);
    runTo(a, DAYS);
    const want = canonicalJson(a);
    setTune({ aiTrimSD: 0, aiTrimFrom: 0, aiTrimPause: 1 });
    const b = createWorld(3);
    runTo(b, DAYS);
    const got = canonicalJson(b);
    if (got !== want) expect.fail(`${DAYS}일: ${firstDiff(JSON.parse(got), JSON.parse(want))}`);
    expect(b.regions.some((r) => r.trim)).toBe(false);
  });
});
