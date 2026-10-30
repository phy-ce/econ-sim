// 위쪽 층 import 금지 (오버홀 구조 시험, docs/overhaul/10_ARCHITECTURE.md 3.1): src/ 바로 아래 파일은 index.ts(공개 통로)만 빼고 read/·save/·lab/ 을 import 하지 않는다.
// 2026-10-30 (main 9b46c2d) 에는 이 폴더들이 아직 없어 당연히 통과한다. 0a 이후 새 폴더가 생길 때의 방향(sim 코어 → 읽기·저장·실험 층 금지)을 미리 건다.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC = fileURLToPath(new URL('../../src', import.meta.url));
const UPPER = ['read', 'save', 'lab'];
const GATEWAY = 'index.ts';
/** import … from './read/x', export … from './save', import('./lab/y'), require('./read') */
const UPPER_IMPORT = new RegExp(String.raw`(?:from\s*|import\s*\(\s*|require\s*\(\s*|import\s+)['"]\./(?:${UPPER.join('|')})(?:/[^'"]*)?['"]`, 'g');

describe('층 방향 (구조)', () => {
  it('src/ 바로 아래 파일은 index.ts 만 read/·save/·lab/ 을 import 한다', () => {
    const files = readdirSync(SRC).filter((f) => f.endsWith('.ts') && statSync(join(SRC, f)).isFile());
    expect(files).toContain(GATEWAY);
    const bad: string[] = [];
    for (const f of files) {
      if (f === GATEWAY) continue;
      const text = readFileSync(join(SRC, f), 'utf8');
      for (const m of text.matchAll(UPPER_IMPORT)) bad.push(`${f}: ${m[0]}`);
    }
    expect(bad).toEqual([]);
  });

  it('검사식이 import 형태를 잡는다', () => {
    const sample = [
      "import { a } from './read/ledger';",
      "export { b } from './save';",
      "const c = await import('./lab/matrix');",
      "import './read/index';",
      "import { d } from './readiness';",
      "import { e } from '../read/x';",
    ].join('\n');
    expect([...sample.matchAll(UPPER_IMPORT)].length).toBe(4);
  });
});
