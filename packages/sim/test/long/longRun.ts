import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from 'vitest';
import { TECHS, TECH_BY_ID, colonyPopulation, createWorld, moneyIdentity, step } from '../../src/index';
import { Collector } from '../../src/lab/metrics';
import type { LabRow } from '../../src/lab/metrics';
import { laborerFood, ownerCashLow, stateFlags } from '../helpers';

export const LONG_TIMEOUT = 600_000;

// 장기 20년 (시드마다 파일을 나눠 병렬로 돈다). 시험은 코드 문제만 판정하고, 경제 결과는 데이터로 남긴다.
//
// 판정 (코드 정확성, expect.soft 로 한 번에 모두 보인다):
//   - 20년(7,200일)을 예외 없이 끝낸다.
//   - 화폐 보존: 해마다 연말 어긋남(|보존량 − 시작| ÷ 시작)의 최댓값과 끝 값 < 1e-9.
//   - 상태 값 범위: 매일 helpers.ts stateFlags (NaN·Infinity, 음수가 될 수 없는 인구·저축·회사 현금·부채·공사 맡긴 돈·무역상 현금, 가격 0.25~1.75 × 기본가,
//     부 1~WEALTH_MAX, 식량 0~1). 건물 금고는 유한한지만 본다: 음수 금고(민간 공사 완공 정산, helpers.ts 주석)는 알려진 문제로 세어 콘솔·meta 에 낸다.
//
// 데이터 (판정하지 않음): src/lab/metrics.ts Collector (관측 전용, test/gate/lab.test.ts) 의 해마다 왕국별·대륙(k: 'all') 줄을
//   저장소 루트 .tmp/test-data/long-<시드>.jsonl 에 쓴다 (git 무시, 실행마다 덮어씀. LONG_DATA_DIR 로 바꾼다).
//   첫 줄은 {"meta": {test, seed, years, date, commit, dirty, tick, ownerCashNeg}}, 나머지는 cli/report.py 가 읽는 줄 (run = "long@<커밋>").
//   LONG_DATA=0 이면 수집을 끈다 (2026-11-01 bb28119, 이 PC: tsx 시드 1 20년에서 수집기 3.9초 ÷ step 48.8초 = 약 8%,
//   vitest test/long 두 시드 병렬은 끔 54초 · 켬 64~72초, 두 번 잼).
//   보기: cd packages/sim && python cli/report.py <id> ../../.tmp/test-data/long-1.jsonl ../../.tmp/test-data/long-2.jsonl
//
// 2026-11-01 사용자 지시 ("테스트에는 코딩적인 문제가 없는지만 점검하라. 데이터를 취득해서 나중에 로직에 문제가 없는지 본다")로 뺀 단언과 데이터 칸:
//   - 4단계 기술 연도 ≥ 7          → era4Y (왕국 줄, 대륙 줄은 가장 이른 왕국)
//   - 소작농→노동자 이동 > 0         → mob["peasant>unskilled"] (대륙 줄, 한 해 이동 천 명)
//   - 노동자 식량 최저 > 35%, 평균 > 80% → foodUnskMin·foodUnskAvg (날마다 잰 한 해 최저·평균), foodUnsk (연말)
//   뺀 이유: 경제 결과 기준이라 규칙·AI 를 바꿀 때 푸시를 막았고, 식량 기준은 2026-10-21 cc04a48 에서 그때 결과에 맞춰 낮춘 근거 없는 값이었다.
//   경제 결과는 이 데이터로 보고서(cli/report.py)·진단에서 본다.
// 콘솔 요약 한 줄은 예전 정의 그대로 낸다 (노동자 식량은 3년차부터 30일마다 잰 값의 최저·평균, 기술 연도는 연말 기준).
const DATA_DIR = process.env.LONG_DATA_DIR ?? fileURLToPath(new URL('../../../../.tmp/test-data/', import.meta.url));

function gitInfo(): { commit: string | null; dirty: boolean | null } {
  const cwd = fileURLToPath(new URL('.', import.meta.url));
  try {
    const commit = execSync('git rev-parse --short HEAD', { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const dirty = execSync('git status --porcelain -- packages/sim', { cwd: join(cwd, '../../../..'), encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() !== '';
    return { commit, dirty };
  } catch { return { commit: null, dirty: null }; }
}

export function longRun(seed: number) {
  const YEARS = 20;
  const w = createWorld(seed, { withPlayer: false });
  const m0 = moneyIdentity(w);
  const git = gitInfo();
  const col = process.env.LONG_DATA === '0' ? null : new Collector(w, { run: `long@${git.commit ?? 'unknown'}`, seed, salt: 0 });
  const rows: LabRow[] = [];
  const bad: string[] = [];
  const flag = (msg: string) => { if (bad.length < 20) bad.push(`${w.tick}일 ${msg}`); };
  // 콘솔 요약용 (판정하지 않음)
  const top = Math.max(...TECHS.map((t) => t.cost));
  const share: Record<number, number> = {};
  let allTechs: number | null = null, tier4: number | null = null;
  let minFood = Infinity, sumFood = 0, n = 0;
  let worstDrift = 0, worstYear = 0;
  // 알려진 문제: 음수 건물 금고 (판정하지 않음)
  const neg = { days: 0, first: null as number | null, low: null as ReturnType<typeof ownerCashLow> };
  try {
    for (let t = 1; t <= 360 * YEARS; t++) {
      step(w);
      stateFlags(w, flag);
      if (col) rows.push(...col.after(w));
      const low = ownerCashLow(w);
      if (low) { neg.days++; neg.first ??= w.tick; if (!neg.low || low.cash < neg.low.cash) neg.low = { ...low, cash: Math.round(low.cash) }; }
      if (t > 360 * 2 && t % 30 === 0) { const f = laborerFood(w); minFood = Math.min(minFood, f); sumFood += f; n++; }
      if (t % 360 !== 0) continue;
      const y = t / 360;
      const total = w.pops.reduce((a, p) => a + p.size, 0);
      share[y] = colonyPopulation(w, 'peasant') / total;
      const govs = w.companies.filter((c) => c.state);
      if (allTechs === null && govs.some((c) => c.research.known.length === TECHS.length)) allTechs = y;
      if (tier4 === null && govs.some((c) => c.research.known.some((id) => TECH_BY_ID[id].cost === top))) tier4 = y;
      const drift = Math.abs(moneyIdentity(w) - m0) / m0;
      if (!(drift <= worstDrift)) { worstDrift = drift; worstYear = y; }
    }
  } finally {
    // 중간에 예외가 나도 거기까지의 데이터를 남긴다
    const meta = { test: 'long', seed, years: YEARS, date: new Date().toISOString(), ...git, tick: w.tick, ownerCashNeg: neg };
    if (col) try {
      mkdirSync(DATA_DIR, { recursive: true });
      writeFileSync(join(DATA_DIR, `long-${seed}.jsonl`), [JSON.stringify({ meta }), ...rows.map((r) => JSON.stringify(r))].join('\n') + '\n');
    } catch (e) { console.warn(`장기 시험 데이터를 쓰지 못함: ${String(e)}`); }
  }
  console.log(`seed ${seed}: 소작농 5년 ${(share[5] * 100).toFixed(0)}% 10년 ${(share[10] * 100).toFixed(0)}% 20년 ${(share[20] * 100).toFixed(0)}% | 기술 완료 ${allTechs}년 4단계 ${tier4}년 | 노동자 식량 최저 ${(minFood * 100).toFixed(0)}% 평균 ${((sumFood / n) * 100).toFixed(0)}% | 음수 건물 금고 ${neg.days}일 (첫 ${neg.first ?? '-'}일, 최저 ${neg.low ? `${neg.low.typeId} ${neg.low.id} ${neg.low.cash}` : '-'}) | 데이터 ${col ? join(DATA_DIR, `long-${seed}.jsonl`) : '끔'}`);
  expect.soft(w.tick, '20년 완주').toBe(360 * YEARS);
  // 화폐 보존은 20년 내내 지켜진다 (짧은 시험에서 안 보이는 누수). 해마다 보고 끝에서도 본다
  expect.soft(worstDrift, `가장 큰 어긋남: ${worstYear}년차`).toBeLessThan(1e-9);
  expect.soft(Math.abs(moneyIdentity(w) - m0) / m0).toBeLessThan(1e-9);
  expect.soft(bad, '상태 값 범위 (처음 20개)').toEqual([]);
}
