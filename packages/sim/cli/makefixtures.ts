// 고정 저장 파일 만들기 (오버홀 A0, docs/overhaul/10_ARCHITECTURE.md 3.4). packages/sim 에서: npx tsx cli/makefixtures.ts [짧은 커밋]
// (가) 시드 1 을 100일 돌린 세계, (나) 시드 1 을 8년 돌리며 test/fixtures/commands-a0.json 명령열을 applyCommandMsg 길로 넣은 세계를
// 화면과 같은 형식(sim.worker.ts 'save': JSON.stringify(world), 새 게임은 createWorld(seed) + recordHistory)으로 써서 gzip 한다.
// 출력: test/fixtures/save-v<판>-100d-<커밋>.json.gz, save-v<판>-8y-<커밋>.json.gz. 커밋을 안 주면 git HEAD 의 짧은 해시.
// 이 파일들은 그 판의 코드로만 만들 수 있다 (0a 이후 코드로 다시 만들면 "옛 저장"이 아니다). 이미 있는 파일은 덮지 않는다.
// 8년 파일 gz 가 3 MB 를 넘으면 쓰지 않고 크기만 알린다 (종료 코드 2).
import { execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { createWorld, recordHistory } from '../src/index';
import type { World } from '../src/index';
import { FIXTURE_DIR, loadScript, runScript } from '../test/fixtures/a0';

const MAX_GZ_8Y = 3 * 1024 * 1024;
const commit = process.argv[2] ?? execSync('git rev-parse --short HEAD').toString().trim();

/** 화면이 새 게임을 만드는 것과 같다 (sim.worker.ts 'new') */
function newGame(seed: number): World {
  const w = createWorld(seed);
  recordHistory(w);
  return w;
}

function pack(label: string, w: World) {
  const json = JSON.stringify(w);
  const gz = gzipSync(Buffer.from(json, 'utf8'), { level: 9 });
  const name = `save-v${w.version}-${label}-${commit}.json.gz`;
  console.log(`${name}: tick ${w.tick}, 원문 ${(json.length / 1e6).toFixed(2)} MB, gz ${(gz.length / 1e6).toFixed(3)} MB`);
  return { name, gz };
}

function write(f: { name: string; gz: Buffer }) {
  const path = join(FIXTURE_DIR, f.name);
  if (existsSync(path)) { console.log(`  ${f.name} 이 이미 있다: 덮지 않음`); return; }
  writeFileSync(path, f.gz);
  console.log(`  썼음 ${path}`);
}

const t0 = Date.now();
// (가) 100일, 명령 없음
const a = newGame(1);
runScript(a, 100, { actor: 0, commands: [] });
const fa = pack('100d', a);

// (나) 8년, 고정 명령열
const script = loadScript();
const b = newGame(1);
const results = runScript(b, 8 * 360, script);
const failed = results.filter((r) => r.err);
console.log(`명령 ${results.length}개 중 실패 ${failed.length}개`);
for (const r of failed) console.log(`  실패 t${r.t} ${JSON.stringify(r.cmd)}: ${r.err}`);
const gov = b.companies.find((c) => c.id === script.actor)!;
const k = b.kingdoms.find((x) => x.governmentId === script.actor)!;
console.log(`8년 왕실: 현금 ${Math.round(gov.cash)}, 빚 ${Math.round(gov.debt)}, 법 ${k.taxLaw}/${k.investLaw}/${k.welfareLaw}, 전환 중 ${JSON.stringify(k.lawChange ?? {})}, 기술 ${gov.research.known.length}개`);
console.log(`8년 화폐: ${JSON.stringify(b.mint)}`);
const fb = pack('8y', b);
console.log(`계산 ${((Date.now() - t0) / 1000).toFixed(1)}초`);

if (fb.gz.length > MAX_GZ_8Y) {
  console.log(`8년 파일 gz ${(fb.gz.length / 1e6).toFixed(2)} MB > 3 MB: 쓰지 않음`);
  process.exit(2);
}
write(fa);
write(fb);
