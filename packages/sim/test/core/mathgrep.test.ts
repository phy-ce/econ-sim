// 엔진(브라우저·Node)마다 값이 다를 수 있는 수학을 sim 이 쓰지 않는다 (오버홀 T15, docs/overhaul/10_ARCHITECTURE.md 3.2·8.1).
// encyclopedia.ts(표시용)를 뺀 src/ 에서 허용한 Math 함수 밖의 것과 ** 를 찾는다. 사칙연산·sqrt 는 IEEE 754 가 결과를 정하지만 pow·exp·log·sin 등은 정하지 않는다.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));
const SKIP_FILES = new Set(['encyclopedia.ts']);
const SAFE_MATH = new Set(['abs', 'min', 'max', 'floor', 'ceil', 'round', 'trunc', 'sign', 'sqrt', 'imul', 'fround']);

/** 허용 목록: 파일 + 줄 내용 일부 (줄 번호 대신이라 줄이 옮겨도 덜 깨진다). 2026-10-30 wt-a0 (main 9b46c2d) 에서 grep 한 것 */
const ALLOWED: { file: string; has: string; why: string }[] = [
  // 꺼진 비교 경로 (8.5 정리 때 지운다)
  { file: 'economy.ts', has: '1 - Math.exp(-x)', why: "collectionRatio 의 TUNE.taxCurve = 'exp' 경로 (기본 'hyp')" },
  { file: 'economy.ts', has: '(demand / supply) ** TUNE.priceExp', why: 'priceFormula 의 TUNE.priceExp > 0 경로 (기본 0)' },
  // 0a 에서 정수 거듭제곱 ipow 로 바꾸고 지운다
  { file: 'data.ts', has: 'Math.pow(TRADE_STEP_MULT', why: 'tradeReserveOf (지수 = 방식 순번)' },
  { file: 'market.ts', has: 'Math.pow(min / c, SUBSTITUTION_EXP)', why: '대체재 비중 (지수 10)' },
  { file: 'pops.ts', has: '(1 + g) ** DAYS_PER_YEAR', why: 'Pop.growth 표시값 (지수 360, 저장 칸)' },
];

/** 주석을 지운 줄 목록 (블록 주석은 줄 수를 지켜 비운다. src 에는 문자열 안 // 가 없다) */
function codeLines(text: string): string[] {
  const noBlock = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  return noBlock.split(/\r?\n/).map((l) => l.replace(/\/\/.*$/, ''));
}

/** 엔진 의존 수학이 있는 줄: "파일:줄: 무엇 | 내용" */
function findUnsafe(): { file: string; line: number; what: string; text: string }[] {
  const out: { file: string; line: number; what: string; text: string }[] = [];
  for (const f of readdirSync(SRC, { recursive: true, encoding: 'utf8' }).filter((x) => x.endsWith('.ts')).sort()) {
    const file = f.replace(/\\/g, '/');
    if (SKIP_FILES.has(file)) continue;
    const raw = readFileSync(join(SRC, f), 'utf8').split(/\r?\n/);
    codeLines(readFileSync(join(SRC, f), 'utf8')).forEach((code, i) => {
      const what: string[] = [];
      for (const m of code.matchAll(/\bMath\s*(?:\.\s*([A-Za-z_$][\w$]*)|\[)/g)) if (!m[1] || !SAFE_MATH.has(m[1])) what.push(`Math.${m[1] ?? '[]'}`);
      if (/\*\*/.test(code)) what.push('**');
      if (what.length) out.push({ file, line: i + 1, what: what.join(','), text: raw[i].trim() });
    });
  }
  return out;
}

describe('엔진 의존 수학 grep (T15)', () => {
  const found = findUnsafe();

  it('허용 목록 밖에 Math.pow·exp·log·random 등이나 ** 가 없다', () => {
    const bad = found.filter((x) => !ALLOWED.some((a) => a.file === x.file && x.text.includes(a.has)));
    if (bad.length) expect.fail(`엔진 의존 수학:\n${bad.map((x) => `${x.file}:${x.line}: ${x.what} | ${x.text}`).join('\n')}`);
  });

  it('허용 목록의 줄은 아직 있다 (없어졌으면 목록에서 지운다)', () => {
    const gone = ALLOWED.filter((a) => !found.some((x) => x.file === a.file && x.text.includes(a.has)));
    expect(gone.map((a) => `${a.file}: ${a.has}`)).toEqual([]);
  });
});
