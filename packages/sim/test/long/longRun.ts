import { expect } from 'vitest';
import { TECHS, TECH_BY_ID, colonyPopulation, createWorld, moneyIdentity, step } from '../../src/index';
import { laborerFood } from '../helpers';

export const LONG_TIMEOUT = 600_000;

// 장기 20년: 시드마다 파일을 나눠 병렬로 돈다.
// 화폐 보존, 4단계 기술은 7년차 전에는 열리지 않음, 소작농이 노동자로 옮겨 감, 노동자는 대체로 먹고 삶 (식량 충족 최저 35%, 평균 80%).
// 소작농 비중과 기술 완료 연도는 목표로 두지 않는다 (개발 초기라 기술을 더 넣는다, 2026-10-19 사용자). 값은 출력만 한다.
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
  expect.soft(tier4 ?? 0, '4단계 기술 연도').toBeGreaterThanOrEqual(7);
  expect.soft(w.mobility?.['peasant>unskilled'] ?? 0, '소작농→노동자 이동').toBeGreaterThan(0);
  expect.soft(minFood, '노동자 식량 최저').toBeGreaterThan(0.35);
  expect.soft(sumFood / n, '노동자 식량 평균').toBeGreaterThan(0.8);
}
