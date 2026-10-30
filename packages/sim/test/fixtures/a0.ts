// A0 안전망이 같이 쓰는 것: 고정 명령열(commands-a0.json)을 applyCommandMsg 길로 넣는 실행기, 고정 저장 파일 읽기, 정규화 해시.
// cli/makefixtures.ts, cli/samecheck.ts, test/gate/*.test.ts 가 쓴다 (docs/overhaul/10_ARCHITECTURE.md 3.4·8.2).
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gunzipSync } from 'node:zlib';
import { applyCommandMsg, migrateWorld, step } from '../../src/index';
import type { Command, World } from '../../src/index';

/** 명령열 한 줄: w.tick === t 인 날의 step 직전(틱 사이, 화면이 넣는 것과 같은 길)에 넣는다 */
export interface ScriptLine { t: number; actor?: number; cmd: Command; note?: string }
export interface CommandScript { about?: string; actor: number; commands: ScriptLine[] }
/** 명령 하나의 결과 (err 가 null 이면 적용됨) */
export interface ScriptResult { t: number; cmd: Command; err: string | null }

/**
 * 이 폴더(test/fixtures). tsx·vitest 에서는 이 파일의 위치이고, cli/fast.sh 로 묶은 out/*.mjs 에서는 ../test/fixtures 다
 */
export const FIXTURE_DIR = (() => {
  const here = dirname(fileURLToPath(import.meta.url));
  for (const d of [here, resolve(here, '../test/fixtures'), resolve(process.cwd(), 'test/fixtures'), resolve(process.cwd(), 'packages/sim/test/fixtures')]) {
    if (existsSync(join(d, 'commands-a0.json'))) return d;
  }
  throw new Error(`test/fixtures/commands-a0.json 을 찾지 못함 (${here})`);
})();

export const loadScript = (name = 'commands-a0.json'): CommandScript => JSON.parse(readFileSync(join(FIXTURE_DIR, name), 'utf8'));

/** 이 폴더의 고정 저장 파일 (save-v<판>-<기간>-<커밋>.json.gz), 이름 순. kind 를 주면 그 기간('100d', '8y')만 */
export function fixtureFiles(kind?: string): string[] {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => /^save-v\d+-[^-]+-[0-9a-f]+\.json\.gz$/.test(f) && (!kind || f.split('-')[2] === kind))
    .sort();
}

/** 고정 저장 파일의 원문 (불러오기 전, 클라이언트 localStorage 에 있는 것과 같은 JSON 객체) */
export const readFixtureRaw = (file: string): Record<string, unknown> => JSON.parse(gunzipSync(readFileSync(join(FIXTURE_DIR, file))).toString('utf8'));

/** 고정 저장 파일을 화면과 같은 길로 불러온다 (sim.worker.ts 'load': migrateWorld). 바꿀 수 없으면 예외 */
export function loadFixture(file: string): World {
  const w = migrateWorld(readFixtureRaw(file));
  if (!w) throw new Error(`${file}: migrateWorld 가 null (지원하지 않는 판)`);
  return w;
}

/**
 * w 를 tick 까지 돌리며 명령열을 넣는다. 그날의 명령은 step 직전에 적용한다 (applyCommandMsg: 화면이 틱 사이에 넣는 길.
 * step 의 명령 목록으로 넣어도 같다는 것은 determinism.test 가 본다). 지난 틱의 명령(t < w.tick)은 건너뛴다
 */
export function runScript(w: World, tick: number, script: CommandScript, onResult?: (r: ScriptResult) => void): ScriptResult[] {
  const lines = [...script.commands].sort((a, b) => a.t - b.t);
  const out: ScriptResult[] = [];
  let i = lines.findIndex((l) => l.t >= w.tick);
  if (i < 0) i = lines.length;
  while (w.tick < tick) {
    for (; i < lines.length && lines[i].t === w.tick; i++) {
      const l = lines[i];
      const r = { t: w.tick, cmd: l.cmd, err: applyCommandMsg(w, l.actor ?? script.actor, l.cmd)?.text ?? null };
      out.push(r);
      onResult?.(r);
    }
    step(w);
  }
  return out;
}

/**
 * 해시에서 뺄 칸 (점으로 이은 경로). 10 문서 8.2: FlowBook 칸과 config.rulesHash·config.rulesRev 는 비트가 같아도 바뀌므로 뺀다.
 * config.rulesHash·rulesRev 는 0a 에서 생겼다 (규칙 라벨이라 동작이 같아도 바뀐다). FlowBook 칸은 A 단계에서 생기면 더한다
 */
export const HASH_EXCLUDE: readonly string[] = ['config.rulesHash', 'config.rulesRev'];

/** 키를 정렬한 정규화 JSON (저장과 같은 JSON 의미: undefined 칸은 빠지고 NaN·Infinity 는 null). 제외 경로는 지운다 */
export function canonicalJson(v: unknown, exclude: readonly string[] = HASH_EXCLUDE): string {
  const plain = JSON.parse(JSON.stringify(v)) as unknown;
  for (const path of exclude) {
    const keys = path.split('.');
    let o = plain as Record<string, unknown> | undefined;
    for (const k of keys.slice(0, -1)) o = o && typeof o === 'object' ? (o[k] as Record<string, unknown>) : undefined;
    if (o && typeof o === 'object') delete o[keys[keys.length - 1]];
  }
  const sortKeys = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(sortKeys);
    if (x && typeof x === 'object') {
      const o = x as Record<string, unknown>;
      return Object.fromEntries(Object.keys(o).sort().map((k) => [k, sortKeys(o[k])]));
    }
    return x;
  };
  return JSON.stringify(sortKeys(plain));
}

/** 세계 상태 해시 (sha256 앞 16자리): 키 정렬 정규화 JSON 전체 */
export const worldHash = (w: World, exclude: readonly string[] = HASH_EXCLUDE): string =>
  createHash('sha256').update(canonicalJson(w, exclude)).digest('hex').slice(0, 16);
