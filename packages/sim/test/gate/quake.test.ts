import { afterAll, describe, expect, it } from 'vitest';
import { TUNE, createWorld, landFree, moneyIdentity, quakeAt, quakeLostCells, step, totalMoney } from '../../src/index';
import type { World } from '../../src/index';
import { firstDiff } from '../helpers';

// 소작지 재해 (TUNE.quakeChance, 시제품, 기본 끔): 켠 세계에서도 화폐 보존·결정성(저장/불러오기)이 지켜지고, 재해가 걸린 날 소작지 칸이 손실만큼 준다.
// 기본 확률(0)로는 재해가 없어서 확률을 크게 올린다. 재해는 2년째(360일)부터 난다.
const saved = { quakeChance: TUNE.quakeChance, quakeLoss: TUNE.quakeLoss, quakeYears: TUNE.quakeYears };
Object.assign(TUNE, { quakeChance: 0.5, quakeLoss: 0.25, quakeYears: 1 });
afterAll(() => { Object.assign(TUNE, saved); });

/** money.test.ts 와 같은 허용 오차: 화폐 총량 × 1e-12 */
const MONEY_TOLERANCE = 1e-12;
const reload = (w: World): World => JSON.parse(JSON.stringify(w));
const runTo = (w: World, tick: number) => { while (w.tick < tick) step(w); };
const END = 480;

describe('소작지 재해 (quakeChance > 0)', () => {
  it('화폐 총량이 장부와 맞고, 재해 날 소작지 칸이 손실만큼 줄며 사건이 남는다', () => {
    const w = createWorld(42);
    const m0 = moneyIdentity(w);
    let worst = 0, hit = 0, cut = 0, logged = false;
    while (w.tick < END) {
      // 그날 시작할 때의 빈 농지 (같은 날 AI 가 착공하며 농지를 잡으면 step 뒤 빈 농지가 줄어든다: 2026-11-02 wt-wagelag 새 기본값, 시드 42 455일 지역 3 에서 441 → 439)
      const before = new Map(w.regions.map((r) => [r.id, Math.max(0, Math.floor(landFree(w, r.id, 'arable')))]));
      step(w);
      // 사건 열은 상한(최근 N개)이 있어 끝에서 한 번만 보면 재해 사건이 밀려 나갈 수 있다: 날마다 본다
      logged ||= w.events.some((e) => e.textEn?.includes('tenant land'));
      worst = Math.max(worst, Math.abs(moneyIdentity(w) - m0) / Math.max(1, totalMoney(w)));
      for (const r of w.regions) {
        // step 안의 updateSubsistence 는 w.tick − 1 날 재해로 칸을 정했다. 그 뒤 공사가 땅을 쓸 수 있어 그날 시작과 끝의 빈 농지 중 큰 쪽과 비교하고 줄어든 칸만 본다
        const q = quakeAt(w, r.id, w.tick - 1);
        if (!q) continue;
        hit++;
        const b = w.buildings.find((x) => x.regionId === r.id && x.typeId === 'subsistence')!;
        const free = Math.max(0, Math.floor(landFree(w, r.id, 'arable')));
        const start = Math.max(free, before.get(r.id) ?? 0);
        expect(b.level).toBeLessThanOrEqual(start - quakeLostCells(start, q) + 1);
        if (quakeLostCells(free, q) > 0 && b.level < free) cut++;
      }
    }
    expect(worst).toBeLessThan(MONEY_TOLERANCE);
    expect(hit).toBeGreaterThan(0);
    expect(cut).toBeGreaterThan(0);
    expect(logged).toBe(true);
  });

  it('재해가 걸린 채로 저장/불러오기 해도 결과가 같다', () => {
    const a = createWorld(42);
    runTo(a, END);
    const want = JSON.stringify(a);
    let b = createWorld(42);
    runTo(b, 400);
    expect(b.regions.some((r) => quakeAt(b, r.id))).toBe(true);
    b = reload(b);
    runTo(b, 437);
    b = reload(b);
    runTo(b, END);
    const got = JSON.stringify(b);
    if (got !== want) expect.fail(firstDiff(JSON.parse(got), JSON.parse(want)) ?? 'differs');
  });
});
