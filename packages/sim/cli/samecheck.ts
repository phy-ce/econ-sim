// samecheck: 동작이 비트까지 같은지 보는 해시 묶음 (오버홀 A0, docs/overhaul/10_ARCHITECTURE.md 8.2).
// packages/sim 에서:  npx tsx cli/samecheck.ts [이전 출력 파일]      (빠르게: bash cli/fast.sh samecheck.ts [이전 출력 파일])
//
// 입력 셋 (각각 세계 하나 → 키 정렬 정규화 JSON 의 sha256 앞 16자리를 한 줄로 낸다):
//   (1) 기본 AI 실행 (플레이어 없음): 1년 × 시드 1·2, 5년 × 시드 1
//   (2) 고정 명령열 test/fixtures/commands-a0.json 을 applyCommandMsg 길로 넣은 5년 × 시드 1 (플레이어 왕실, 화면 새 게임과 같은 시작)
//   (3) 18판 8년 고정 저장(test/fixtures/save-v18-8y-*.json.gz)을 불러온(migrateWorld) 직후 30일
// 줄 형식: "<이름>\t<해시>\t<참고>". 비교는 이름과 해시만 본다 (참고 칸은 사람이 읽는 값).
// 인자로 이전 출력 파일을 주면 이름마다 해시를 비교해 하나라도 다르거나 빠지면 종료 코드 1.
//
// 두 커밋 비교 (RT·A·정리 단계의 "비트 동일" 확인):
//   1) 기준 커밋을 worktree 로 꺼낸다:  git worktree add .tmp/wt/base <기준 커밋>
//   2) 기준 쪽에서 출력을 파일로 남긴다: (cd .tmp/wt/base/packages/sim && npx tsx cli/samecheck.ts > ../../../samecheck-base.txt)
//      기준 커밋에 samecheck.ts 가 없으면 이 파일과 test/fixtures/(a0.ts, commands-a0.json, 고정 저장 파일)를 그 worktree 에 복사해 돌린다.
//   3) 새 쪽에서 그 파일과 비교한다:     (cd packages/sim && npx tsx cli/samecheck.ts ../../.tmp/wt/samecheck-base.txt)
//   두 쪽 모두 같은 commands-a0.json 과 같은 고정 저장 파일을 써야 한다 (명령열을 바꾸면 기준 출력을 다시 만든다).
// 해시에서 빼는 칸은 test/fixtures/a0.ts HASH_EXCLUDE (지금은 비어 있다. FlowBook·config.rulesHash·config.rulesRev 가 생기면 더한다).
// 같은 쪽에서 두 번 돌려 해시가 같으면 결정성 확인도 된다. 시간은 stderr 로 낸다.
import { readFileSync } from 'node:fs';
import { createWorld, recordHistory, step } from '../src/index';
import type { World } from '../src/index';
import { fixtureFiles, loadFixture, loadScript, runScript, worldHash } from '../test/fixtures/a0';

const Y = 360;
interface Input { name: string; run: () => { w: World; note?: string } }

const aiRun = (seed: number, years: number): Input => ({
  name: `ai-s${seed}-${years}y`,
  run: () => {
    const w = createWorld(seed, { withPlayer: false });
    for (let d = 0; d < years * Y; d++) step(w);
    return { w };
  },
});

const inputs: Input[] = [
  aiRun(1, 1),
  aiRun(2, 1),
  aiRun(1, 5),
  {
    name: 'cmds-a0-s1-5y',
    run: () => {
      const w = createWorld(1);
      recordHistory(w);
      const res = runScript(w, 5 * Y, loadScript());
      return { w, note: `명령 ${res.length} 실패 ${res.filter((r) => r.err).length}` };
    },
  },
  ...fixtureFiles('8y').filter((f) => f.startsWith('save-v18-')).slice(0, 1).map((file): Input => ({
    name: `load-${file.replace(/\.json\.gz$/, '')}-30d`,
    run: () => {
      const w = loadFixture(file);
      for (let d = 0; d < 30; d++) step(w);
      return { w };
    },
  })),
];

const lines: string[] = [];
const tAll = Date.now();
for (const inp of inputs) {
  const t = Date.now();
  const { w, note } = inp.run();
  const line = `${inp.name}\t${worldHash(w)}\ttick ${w.tick}, pops ${w.pops.length}, buildings ${w.buildings.length}${note ? `, ${note}` : ''}`;
  lines.push(line);
  console.log(line);
  console.error(`  ${inp.name}: ${((Date.now() - t) / 1000).toFixed(1)}초`);
}
console.error(`합계 ${((Date.now() - tAll) / 1000).toFixed(1)}초`);

const prevFile = process.argv[2];
if (prevFile) {
  const parse = (s: string) => new Map(s.split(/\r?\n/).filter((l) => l.includes('\t')).map((l) => { const [n, h] = l.split('\t'); return [n, h] as const; }));
  const prev = parse(readFileSync(prevFile, 'utf8'));
  const now = parse(lines.join('\n'));
  let bad = 0;
  for (const [n, h] of prev) {
    const g = now.get(n);
    if (g !== h) { bad++; console.error(`다름 ${n}: 이전 ${h}, 지금 ${g ?? '(없음)'}`); }
  }
  for (const n of now.keys()) if (!prev.has(n)) { bad++; console.error(`이전에 없던 입력 ${n}`); }
  console.error(bad ? `samecheck: ${bad}개 다름` : `samecheck: ${now.size}개 모두 같음`);
  process.exit(bad ? 1 : 0);
}
