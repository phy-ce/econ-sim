// 돈이 움직이는 줄 수 래칫 (오버홀 T14, docs/overhaul/10_ARCHITECTURE.md 3.6): src/ 에서 돈 계정 칸을 바꾸는 줄이 파일별 표와 같아야 한다.
// 줄이 늘거나 줄면 표를 고친다 (늘릴 때는 몫의 장부 기록도 같이 넣는다). 힌트일 뿐이고 보증은 화폐 보존 시험과 장부 닫힘 시험(T8)이다.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));
/** 돈 계정 칸: mapMoney(economy.ts) 의 계정(traders·company cash, pop savings, building cash, construction escrow)과 w.fund, 국채(Company.debt).
 *  이름으로만 잡으므로 Pop.fund(금융가 지분 목록, compat.ts 10판 변환)처럼 돈이 아닌 같은 이름도 센다 */
const FIELDS = 'savings|cash|escrow|fund|debt';
/** (a) `.칸 +=` / `.칸 -=` */
const PLUS_MINUS = new RegExp(String.raw`\.(${FIELDS})\s*[-+]=`);
/** (b) `.칸 = …` 대입 (비교 ==·=== 와 => 는 뺀다) */
const ASSIGN = new RegExp(String.raw`\.(${FIELDS})\s*=(?![=>])`);

/** 파일 → [±= 줄 수, 대입 줄 수]. 2026-10-30 wt-a0 (main 9b46c2d) 에서 센 값: ±= 48줄, 대입 30줄 */
const EXPECTED: Record<string, [number, number]> = {
  'commands.ts': [3, 2],
  'compat.ts': [1, 2],
  'economy.ts': [4, 5],
  'finance.ts': [10, 4],
  'kingdoms.ts': [3, 1],
  'labor.ts': [2, 0],
  'market.ts': [9, 3],
  'pops.ts': [8, 0],
  'production.ts': [6, 8],
  'welfare.ts': [2, 0],
  'world.ts': [0, 5],
};

/** 주석 줄(//, /*, *)은 세지 않는다. 한 줄에 두 형이 다 있으면 양쪽에 하나씩 센다 */
function count(): Record<string, [number, number]> {
  const out: Record<string, [number, number]> = {};
  for (const f of readdirSync(SRC, { recursive: true, encoding: 'utf8' }).filter((x) => x.endsWith('.ts')).sort()) {
    let pm = 0, as = 0;
    for (const line of readFileSync(join(SRC, f), 'utf8').split(/\r?\n/)) {
      const t = line.trim();
      if (t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) continue;
      if (PLUS_MINUS.test(line)) pm++;
      if (ASSIGN.test(line)) as++;
    }
    if (pm || as) out[f.replace(/\\/g, '/')] = [pm, as];
  }
  return out;
}

describe('돈 이동 줄 래칫 (T14)', () => {
  it('파일별 줄 수가 표와 같다', () => {
    const got = count();
    const changed: string[] = [];
    for (const f of new Set([...Object.keys(EXPECTED), ...Object.keys(got)])) {
      const [wp, wa] = EXPECTED[f] ?? [0, 0];
      const [gp, ga] = got[f] ?? [0, 0];
      if (wp !== gp || wa !== ga) changed.push(`${f}: ±= ${wp} -> ${gp}, 대입 ${wa} -> ${ga}`);
    }
    if (changed.length) expect.fail(`돈 이동 줄 수가 바뀌었다. 몫의 장부 기록을 확인하고 EXPECTED 를 고친다:\n${changed.join('\n')}`);
  });
});
