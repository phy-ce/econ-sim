import { afterEach, describe, expect, it } from 'vitest';
import { TICKS_PER_WEEK, TUNE, createWorld, moneyIdentity, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';
import { aiTrace } from '../../src/ai';
import { canonicalJson, fixtureFiles, loadFixture, readFixtureRaw } from '../fixtures/a0';
import { firstDiff } from '../helpers';

// 0b′ AI 수정의 불변식 (오버홀 03 5-2 팔리지 않음 기준 감축·철거 TUNE.aiCutSD·aiDemoSD·aiExitWeeks, 07 A4 징수율 하한 TUNE.aiAdminFloor·aiAdminWage).
// 기본값은 모두 0 (끔)이라 core 시험은 이 길을 지나지 않는다. 여기서 켜고 화폐 보존, 결정성(저장/불러오기 포함, Region.cutWeeks·demoWeeks 가 저장에 실린다),
// 0 으로 명시한 덮어쓰기 = 기본값, 옛 저장(18판, cutWeeks 없음)에 켜도 도는지를 본다.
// 켜는 값은 0BP_5-2_SPECS.json 후보(감축 1.75, 철거 2)와 0BP_A4_SPECS.json 후보(하한 0.7, 임금 1)에서 골랐다.
// wt-0bp cd97f1b, 시드 1·2 에서 지역 cutWeeks 는 7일부터 생기고, aiExitWeeks 26 이면 첫 감축은 182일, 첫 철거는 196일이었다 (아래 날짜는 그것에 맞췄다).

/** money.test.ts 와 같은 허용 오차: 화폐 총량 × 1e-12 (근거는 그 파일의 주석) */
const MONEY_TOLERANCE = 1e-12;
const moneyDrift = (w: World, m0: number) => Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w));

/** 저장/불러오기 (게임이 쓰는 것과 같은 JSON 왕복) */
const reload = (w: World): World => JSON.parse(JSON.stringify(w));
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };

/** 두 세계가 같은지: 다르면 처음 갈라진 경로를 알려 준다 */
function expectSame(got: World, want: string, label: string) {
  const s = JSON.stringify(got);
  if (s === want) return;
  expect.fail(`${label}: ${firstDiff(JSON.parse(s), JSON.parse(want))}`);
}

type Over = Partial<Record<keyof typeof TUNE, number>>;
const KEYS = ['aiCutSD', 'aiDemoSD', 'aiExitWeeks', 'aiAdminFloor', 'aiAdminWage', 'aiGlutSD'] as const;
const saved = Object.fromEntries(KEYS.map((k) => [k, TUNE[k]]));
afterEach(() => { Object.assign(TUNE, saved); aiTrace.on = undefined; });
/** lab 명세의 tune 과 같은 길 (lab/run.ts: Object.assign(TUNE, spec.tune)) */
const setTune = (o: Over) => { Object.assign(TUNE, saved); Object.assign(TUNE, o); };

const SD_ON: Over = { aiCutSD: 1.75, aiDemoSD: 2 };
const A4_ON: Over = { aiAdminFloor: 0.7, aiAdminWage: 1 };

describe('0b′ 5-2 감축·철거와 A4 징수율 하한을 켠 세계', () => {
  // 5-2 + A4 (시드 1): 끊김 없는 a 를 1년 돌리며 매일 화폐 장부를 보고, 비교 날의 세계를 남긴다.
  // 첫 저장은 첫 감축 직전 주 중간(180일, cutWeeks 가 있음), 둘째는 주 경계(196일 = 28주, 첫 철거 날)다.
  // 비교는 첫 감축 뒤 주 경계(189일)와 철거가 이어진 뒤(245일)에서 한다
  const SAVE1 = 180, CMP1 = 189, SAVE2 = 196, CMP2 = 245, YEAR = 360;
  let snaps: Record<number, string> | null = null;
  const events: Record<string, number> = {};
  function runA() {
    if (snaps) return snaps;
    setTune({ ...SD_ON, ...A4_ON });
    aiTrace.on = (_w, _c, path) => { if (path === 'sdCut' || path === 'sdDemo') events[path] = (events[path] ?? 0) + 1; };
    const a = createWorld(1);
    const m0 = moneyIdentity(a);
    let worst = 0, worstTick = 0;
    const s: Record<number, string> = {};
    while (a.tick < YEAR) {
      step(a);
      const drift = moneyDrift(a, m0);
      if (drift > worst) { worst = drift; worstTick = a.tick; }
      if (a.tick === CMP1 || a.tick === CMP2) s[a.tick] = JSON.stringify(a);
    }
    aiTrace.on = undefined;
    snaps = s;
    return { worst, worstTick };
  }

  it('화폐 보존: 5-2·A4 를 켜고 1년 동안 매일 장부가 맞는다 (시드 1)', () => {
    const r = runA() as { worst: number; worstTick: number };
    expect(r.worst, `가장 큰 어긋남 (화폐 총량 대비): ${r.worstTick}일`).toBeLessThan(MONEY_TOLERANCE);
    // 감축·철거 길을 실제로 지났다
    expect(events.sdCut ?? 0, '감축 횟수').toBeGreaterThan(0);
    expect(events.sdDemo ?? 0, '철거 횟수').toBeGreaterThan(0);
  });

  it('결정성: 5-2·A4 를 켠 세계를 저장/불러오기 하며 이어 달려도 같다 (시드 1, cutWeeks·demoWeeks 가 저장에 실린다)', () => {
    expect(SAVE2 % TICKS_PER_WEEK).toBe(0);
    expect(CMP1 % TICKS_PER_WEEK).toBe(0);
    const s = runA() && snaps!;
    setTune({ ...SD_ON, ...A4_ON });
    let b = createWorld(1);
    runTo(b, SAVE1);
    b = reload(b);
    expect(b.regions.some((r) => r.cutWeeks && Object.keys(r.cutWeeks).length > 0), `${SAVE1}일 저장에 cutWeeks`).toBe(true);
    expect(b.regions.some((r) => r.demoWeeks && Object.keys(r.demoWeeks).length > 0), `${SAVE1}일 저장에 demoWeeks`).toBe(true);
    runTo(b, CMP1);
    expectSame(b, s[CMP1], `${CMP1}일 (${SAVE1}일 저장 후, 첫 감축 뒤)`);
    runTo(b, SAVE2);
    b = reload(b);
    runTo(b, CMP2);
    expectSame(b, s[CMP2], `${CMP2}일 (${SAVE2}일 주 경계 저장 후)`);
  });

  it('결정성: A4 만 켠 세계를 저장/불러오기 하며 이어 달려도 같다 (시드 2)', () => {
    setTune(A4_ON);
    const a = createWorld(2);
    runTo(a, 105);
    const a105 = JSON.stringify(a);
    runTo(a, 200);
    const a200 = JSON.stringify(a);
    let b = createWorld(2);
    runTo(b, 100);
    b = reload(b);
    runTo(b, 105);
    expectSame(b, a105, '105일 (100일 저장 후 첫 주 경계)');
    runTo(b, 147);
    b = reload(b);
    runTo(b, 200);
    expectSame(b, a200, '200일 (147일 주 경계 저장 후)');
  });

  // 기본값은 aiCutSD·aiDemoSD·aiAdminFloor·aiAdminWage 0. 0 으로 명시하고, 끈 상태에서는 쓰이지 않는 aiExitWeeks·aiAdminWage 를 바꿔도
  // 기본값 세계와 같다 (규칙 해시 config.rulesHash·rulesRev 는 TUNE 표의 라벨이라 뺀다, a0.ts HASH_EXCLUDE)
  it('끔 = 같음: 키를 0 으로 명시한 덮어쓰기와 기본값 세계가 같다 (시드 3, 200일)', () => {
    const DAYS = 200;
    setTune({});
    expect([TUNE.aiCutSD, TUNE.aiDemoSD, TUNE.aiAdminFloor, TUNE.aiAdminWage]).toEqual([0, 0, 0, 0]);
    const a = createWorld(3);
    runTo(a, DAYS);
    const want = canonicalJson(a);
    setTune({ aiCutSD: 0, aiDemoSD: 0, aiAdminFloor: 0, aiAdminWage: 1, aiExitWeeks: 1 });
    const b = createWorld(3);
    runTo(b, DAYS);
    const got = canonicalJson(b);
    if (got !== want) expect.fail(`${DAYS}일: ${firstDiff(JSON.parse(got), JSON.parse(want))}`);
    expect(b.regions.some((r) => r.cutWeeks || r.demoWeeks)).toBe(false);
  });
});

// 옛 저장 (A0 의 18판 고정 파일, 0a 이전 코드라 Region.cutWeeks·demoWeeks 가 없다)을 화면과 같은 길(migrateWorld)로 불러와 5-2 를 켜고 30일 돌린다.
// 30일 안에 감축·철거 길을 지나도록 aiExitWeeks 를 1 로 줄였다 (첫 주 경계에서 세기 시작해 둘째 주부터 감축)
describe('옛 저장에 5-2 를 켠다', () => {
  const DAYS = 30;
  for (const file of fixtureFiles().filter((f) => f.startsWith('save-v18-'))) {
    it(`${file}: cutWeeks 없는 저장에 감축·철거를 켜고 ${DAYS}일 돌려도 예외가 없고 화폐가 보존된다`, () => {
      const raw = readFixtureRaw(file) as { regions: Record<string, unknown>[] };
      expect(raw.regions.some((r) => 'cutWeeks' in r || 'demoWeeks' in r), '원문에 cutWeeks·demoWeeks').toBe(false);
      setTune({ ...SD_ON, aiExitWeeks: 1 });
      let cuts = 0;
      aiTrace.on = (_w, _c, path) => { if (path === 'sdCut' || path === 'sdDemo') cuts++; };
      const w = loadFixture(file);
      const tick0 = w.tick, m0 = moneyIdentity(w);
      let worst = 0, worstTick = tick0;
      for (let d = 0; d < DAYS; d++) {
        step(w);
        const drift = moneyDrift(w, m0);
        if (drift > worst) { worst = drift; worstTick = w.tick; }
      }
      expect(w.tick).toBe(tick0 + DAYS);
      expect(worst, `가장 큰 어긋남 (화폐 총량 대비): ${worstTick}일`).toBeLessThan(MONEY_TOLERANCE);
      expect(w.regions.some((r) => r.cutWeeks), '불러온 뒤 cutWeeks 를 센다').toBe(true);
      expect(cuts, '감축·철거 횟수').toBeGreaterThan(0);
    });
  }
});
