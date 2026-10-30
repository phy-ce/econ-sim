// golden: 골든 해시와 규칙 판 이력 (오버홀 0a, T13, docs/overhaul/10_ARCHITECTURE.md 3.9).
// packages/sim 에서:  npx tsx cli/golden.ts            골든 해시만 낸다 (이력 마지막 항목과 같은지 함께)
//                    npx tsx cli/golden.ts --update   (= npm run golden:update) 마지막 항목과 다르면 golden.json 에 항목 하나를 덧붙인다
//
// 골든 해시 = 두 세계 상태 해시를 이은 것의 해시:
//   A: 시드 1, 고정 명령열 test/fixtures/commands-a0.json (applyCommandMsg 길), 0일부터 1년
//   B: 18판 8년 고정 저장(test/fixtures/save-v18-8y-*.json.gz)을 불러와 1년 (늦은 판의 4단계 기술·국채·법 전환 중 상태를 덮는다)
// 상태 해시는 samecheck 와 같은 칸 제외(test/fixtures/a0.ts HASH_EXCLUDE: config.rulesHash·rulesRev)를 쓴다. 라벨만 바뀐 단계가 이력을 늘리지 않는다.
// golden.json 은 덧붙이기만 한다 ([{hash, date, commit}], commit = 그때 머리 커밋). 그 길이가 RULES_REV (save/rulesHash.ts) 다.
// --update 는 premerge 마지막 단계에서 main 을 합친 상태로만 돌린다. 브랜치에서 golden.json 을 손으로 고치지 않는다.
import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createWorld, recordHistory, step } from '../src/index';
import type { GoldenEntry } from '../src/save/rulesHash';
import { fixtureFiles, loadFixture, loadScript, runScript, worldHash } from '../test/fixtures/a0';

const Y = 360;
const GOLDEN_FILE = fileURLToPath(new URL('../golden.json', import.meta.url));

export function goldenHash(log: (s: string) => void = () => {}): string {
  const t0 = Date.now();
  const a = createWorld(1);
  recordHistory(a);
  runScript(a, Y, loadScript());
  const ha = worldHash(a);
  log(`  A 시드 1 명령열 1년: ${ha} (${((Date.now() - t0) / 1000).toFixed(1)}초)`);
  const file = fixtureFiles('8y').find((f) => f.startsWith('save-v18-'));
  if (!file) throw new Error('18판 8년 고정 저장 파일이 없다 (test/fixtures)');
  const t1 = Date.now();
  const b = loadFixture(file);
  for (let d = 0; d < Y; d++) step(b);
  const hb = worldHash(b);
  log(`  B ${file} 에서 1년: ${hb} (${((Date.now() - t1) / 1000).toFixed(1)}초)`);
  return createHash('sha256').update(`${ha}\n${hb}`).digest('hex').slice(0, 16);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const update = process.argv.includes('--update');
  const history = JSON.parse(readFileSync(GOLDEN_FILE, 'utf8')) as GoldenEntry[];
  const hash = goldenHash((s) => console.error(s));
  const last = history[history.length - 1];
  const same = last?.hash === hash;
  console.log(`골든 해시 ${hash}  이력 ${history.length}개, 마지막 ${last ? `${last.hash} (${last.commit})` : '없음'} → ${same ? '같음' : '다름'}`);
  if (update && !same) {
    const commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
    history.push({ hash, date: new Date().toISOString().slice(0, 10), commit });
    // 줄마다 항목 하나, 둘째부터 앞에 쉼표: 덧붙이면 diff 가 더한 줄 하나뿐이다 (premerge 가 삭제·수정 0 을 센다)
    writeFileSync(GOLDEN_FILE, `[\n${history.map((e, i) => `${i ? ', ' : '  '}${JSON.stringify(e)}\n`).join('')}]\n`);
    console.log(`golden.json 에 덧붙임: 규칙 판 ${history.length}`);
  }
}
