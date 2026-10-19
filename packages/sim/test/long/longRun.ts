import { expect } from 'vitest';
import { TECHS, TECH_BY_ID, colonyPopulation, createWorld, moneyIdentity, step } from '../../src/index';
import { laborerFood } from '../helpers';

export const LONG_TIMEOUT = 600_000;

// 장기: 20년이면 경제가 다 발전한다. 시드마다 파일을 나눠 병렬로 돈다.
// 소작농 비중 5년차 70% 이상, 10년차 50~70%, 20년차 35% 이하.
// 기술 17개는 앞선 왕국 기준 15~20년차에 다 열리고, 4단계 기술은 8년차 전에는 열리지 않는다.
// 그동안 노동자는 대체로 먹고 산다 (식량 충족 최저 40%, 평균 80%).
// 기준은 expect.soft 로 판정해서, 하나가 어긋나도 나머지 기준의 결과까지 한 번에 보인다.
export function longRun(seed: number) {
  const w = createWorld(seed, { withPlayer: false });
  const m0 = moneyIdentity(w);
  const top = Math.max(...TECHS.map((t) => t.cost));
  const share: Record<number, number> = {};
  let allTechs: number | null = null, tier4: number | null = null;
  let minFood = Infinity, sumFood = 0, n = 0;
  let worstDrift = 0, worstYear = 0;
  for (let t = 1; t <= 360 * 20; t++) {
    step(w);
    if (t > 360 * 2 && t % 30 === 0) { const f = laborerFood(w); minFood = Math.min(minFood, f); sumFood += f; n++; }
    if (t % 360 !== 0) continue;
    const y = t / 360;
    const total = w.pops.reduce((a, p) => a + p.size, 0);
    share[y] = colonyPopulation(w, 'peasant') / total;
    const govs = w.companies.filter((c) => c.state);
    if (allTechs === null && govs.some((c) => c.research.known.length === TECHS.length)) allTechs = y;
    if (tier4 === null && govs.some((c) => c.research.known.some((id) => TECH_BY_ID[id].cost === top))) tier4 = y;
    const drift = Math.abs(moneyIdentity(w) - m0) / m0;
    if (drift > worstDrift) { worstDrift = drift; worstYear = y; }
  }
  // 화폐 보존은 20년 내내 지켜진다 (짧은 시험에서 안 보이는 누수). 해마다 보고 끝에서도 본다
  expect.soft(worstDrift, `가장 큰 어긋남: ${worstYear}년차`).toBeLessThan(1e-9);
  expect.soft(Math.abs(moneyIdentity(w) - m0) / m0).toBeLessThan(1e-9);
  console.log(`seed ${seed}: 소작농 5년 ${(share[5] * 100).toFixed(0)}% 10년 ${(share[10] * 100).toFixed(0)}% 20년 ${(share[20] * 100).toFixed(0)}% | 기술 완료 ${allTechs}년 4단계 ${tier4}년 | 노동자 식량 최저 ${(minFood * 100).toFixed(0)}% 평균 ${((sumFood / n) * 100).toFixed(0)}%`);
  expect.soft(share[5], '소작농 5년차').toBeGreaterThanOrEqual(0.7);
  expect.soft(share[10], '소작농 10년차').toBeGreaterThanOrEqual(0.5);
  expect.soft(share[10], '소작농 10년차').toBeLessThanOrEqual(0.7);
  expect.soft(share[20], '소작농 20년차').toBeLessThanOrEqual(0.35);
  expect.soft(allTechs, '기술 완료 연도').not.toBeNull();
  expect.soft(allTechs ?? 0, '기술 완료 연도').toBeGreaterThanOrEqual(15);
  expect.soft(tier4 ?? 0, '4단계 기술 연도').toBeGreaterThanOrEqual(8);
  expect.soft(w.mobility?.['peasant>unskilled'] ?? 0, '소작농→노동자 이동').toBeGreaterThan(0);
  expect.soft(minFood, '노동자 식량 최저').toBeGreaterThan(0.4);
  expect.soft(sumFood / n, '노동자 식량 평균').toBeGreaterThan(0.8);
}
