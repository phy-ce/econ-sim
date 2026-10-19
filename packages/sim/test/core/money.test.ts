import { describe, expect, it } from 'vitest';
import { BUILDING_BY_ID, SKILLS, applyCommand, createWorld, creditLimit, hasOwnCash, moneyIdentity, regionById, step } from '../../src/index';
import type { World } from '../../src/index';
import { payWages } from '../../src/labor';
import { run } from '../helpers';

const round2 = (x: number) => Math.round(x * 100) / 100;

describe('경제 불변식: 화폐', () => {
  it('화폐 총량이 장부와 맞는다 (대륙 + 해외 계정 = 시작 + 주조 + 국채 − 상환 − 이자 − 소멸)', () => {
    const w = createWorld(7);
    const m0 = moneyIdentity(w);
    // 매일 확인한다: 하루 안에 생겼다가 나중에 상쇄되는 누수도 잡는다 (합계 한 번이라 싸다)
    let worst = 0, worstTick = 0;
    for (let i = 0; i < 360 * 3; i++) {
      // 보조금 경로도 지나가게: 매달 왕국마다 현금 건물 몇 곳의 보조금을 주 중간에 켜고 끈다
      if (i % 30 === 11) {
        for (const k of w.kingdoms) {
          const own = w.buildings.filter((b) => hasOwnCash(b) && regionById(w, b.regionId).kingdomId === k.id);
          own.forEach((b, j) => applyCommand(w, k.governmentId, { type: 'setSubsidy', buildingId: b.id, on: (j + i) % 3 === 0 }));
        }
      }
      step(w);
      const drift = Math.abs(moneyIdentity(w) - m0) / m0;
      if (drift > worst) { worst = drift; worstTick = w.tick; }
    }
    expect(w.mint.minted).toBeGreaterThan(0);
    expect(worst, `가장 큰 어긋남: ${worstTick}일`).toBeLessThan(1e-9);
    expect(Math.abs(moneyIdentity(w) - m0) / m0).toBeLessThan(1e-9);
  });
});

describe('건물 현금·보조금', () => {
  it('화폐 총량에 건물 현금이 들어간다', () => {
    const w = createWorld(4, { withPlayer: false });
    run(w, 60);
    const b = w.buildings.find((x) => x.cash > 0)!;
    expect(b).toBeDefined();
    const before = moneyIdentity(w);
    b.cash += 1000;
    expect(moneyIdentity(w) - before).toBeCloseTo(1000, 6);
  });

  it('보조금은 그 주 건물 수지 적자를 정확히 메우고, 국고가 낸 만큼이 건물이 받은 만큼이다', () => {
    const w = createWorld(1, { withPlayer: false });
    run(w, 35);
    // 적자를 만들려고 임금을 크게 올린 현금 건물 하나와, 그대로 둔 건물 하나를 보조한다
    const own = w.buildings.filter((b) => hasOwnCash(b) && b.level > 0);
    const loser = own[0], other = own[1];
    for (const s of SKILLS) loser.wages[s] *= 3;
    const crownOf = (b: typeof loser) => w.kingdoms.find((k) => k.id === regionById(w, b.regionId).kingdomId)!.governmentId;
    expect(applyCommand(w, crownOf(loser), { type: 'setSubsidy', buildingId: loser.id, on: true })).toBeNull();
    expect(applyCommand(w, crownOf(other), { type: 'setSubsidy', buildingId: other.id, on: true })).toBeNull();
    // 다른 왕국 왕실은 못 켠다
    const foreign = w.kingdoms.find((k) => k.id !== regionById(w, loser.regionId).kingdomId)!.governmentId;
    expect(applyCommand(w, foreign, { type: 'setSubsidy', buildingId: loser.id, on: true })).not.toBeNull();
    // AI가 보조금을 끄지 않게 AI를 멈추고, 주가 두 번 넘어가게 돌린다
    w.config.ai = false;
    while (w.tick % 7 !== 0) step(w);
    run(w, 14);
    for (const b of [loser, other]) {
      const wk = b.lastWeek;
      const bal = wk.revenue - wk.wages - wk.inputs;
      expect(wk.subsidy).toBeGreaterThanOrEqual(0);
      if (bal < 0) expect(Math.abs(bal + wk.subsidy)).toBeLessThan(0.02);
      else expect(wk.subsidy).toBeLessThan(0.02);
    }
    expect(loser.lastWeek.subsidy).toBeGreaterThan(0);
    // 국고가 지난주 낸 보조금 = 그 왕국 건물들이 지난주 받은 보조금
    for (const k of w.kingdoms) {
      const got = w.buildings.filter((b) => regionById(w, b.regionId).kingdomId === k.id).reduce((a, b) => a + b.lastWeek.subsidy, 0);
      expect(Math.abs((k.lastBudget?.subsidies ?? 0) - got)).toBeLessThan(0.05);
    }
  });
});

describe('국고', () => {
  it('국채 한도에서 보조금이 있어도 정부 건물 임금을 먼저 내므로 국고가 마이너스가 되지 않는다', () => {
    const w = createWorld(1, { withPlayer: false });
    run(w, 60);
    w.config.ai = false;
    const k = w.kingdoms[0];
    const gov = w.companies.find((c) => c.id === k.governmentId)!;
    const mine = (b: World['buildings'][number]) => regionById(w, b.regionId).kingdomId === k.id;
    // 정부 자금 건물을 목록 끝으로, 크게 적자인 보조금 건물을 앞으로 둔다 (보조금이 먼저 정산되는 순서)
    const govB = w.buildings.filter((b) => mine(b) && !hasOwnCash(b) && !BUILDING_BY_ID[b.typeId].auto);
    expect(govB.length).toBeGreaterThan(0);
    w.buildings = [...w.buildings.filter((b) => !govB.includes(b)), ...govB];
    const loser = w.buildings.find((b) => mine(b) && hasOwnCash(b) && b.employed.unskilled > 0)!;
    for (const s of SKILLS) loser.wages[s] *= 20;
    expect(applyCommand(w, gov.id, { type: 'setSubsidy', buildingId: loser.id, on: true })).toBeNull();
    // 빌릴 수 없고(빚 = 한도), 정부 건물 하루 임금의 30%만 있는 국고로 임금을 낸다
    const bill = govB.reduce((a, b) => a + SKILLS.reduce((x, s) => x + b.employed[s] * b.wages[s], 0), 0);
    expect(bill).toBeGreaterThan(0);
    gov.debt = creditLimit(w, gov);
    gov.cash = round2(bill * 0.3);
    const before = loser.week.subsidy;
    payWages(w);
    expect(gov.cash).toBeGreaterThanOrEqual(-1e-6);
    // 국고가 정부 건물에 다 썼으므로 보조금은 더 나가지 않았다
    expect(loser.week.subsidy).toBeCloseTo(before, 6);
  });
});
