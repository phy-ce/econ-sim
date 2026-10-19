// 단계별 실행 시간: npx tsx cli/perf.ts [years=1] [seed=1] [warmYears=3]
//   더 정확하게는 bash cli/fast.sh perf.ts 2 (tsx 는 함수마다 이름 붙이는 코드(__name)를 넣어 실제보다 느리다)
// 실제 step() 을 CPU 프로파일러(node:inspector)로 재서, step·주간 처리의 직접 하위 단계별 시간과
// 자기 시간(self)이 큰 함수를 보여 준다. tick.ts 의 순서를 따로 베끼지 않으므로 순서가 바뀌어도 맞다.
// PROF_OUT=파일.cpuprofile 이면 프로파일을 저장한다 (Chrome DevTools 의 Performance 탭에서 열린다).
import { readFileSync, writeFileSync } from 'node:fs';
import { Session } from 'node:inspector/promises';
import { fileURLToPath } from 'node:url';
import { createWorld, step } from '../src/index';

const years = Number(process.argv[2] ?? 1), seed = Number(process.argv[3] ?? 1), warm = Number(process.argv[4] ?? 3);
const w = createWorld(seed, { withPlayer: false });
for (let d = 0; d < 360 * warm; d++) step(w);
const days = Math.round(years * 360);

interface CallFrame { functionName: string; url: string; lineNumber: number }
interface ProfileNode { id: number; callFrame: CallFrame; children?: number[]; positionTicks?: { line: number; ticks: number }[] }
interface Profile { nodes: ProfileNode[]; samples: number[]; timeDeltas: number[] }

const session = new Session();
session.connect();
await session.post('Profiler.enable');
await session.post('Profiler.setSamplingInterval', { interval: 200 });
await session.post('Profiler.start');
const t0 = performance.now();
for (let d = 0; d < days; d++) step(w);
const wall = performance.now() - t0;
const { profile } = (await session.post('Profiler.stop')) as unknown as { profile: Profile };
session.disconnect();
if (process.env.PROF_OUT) writeFileSync(process.env.PROF_OUT, JSON.stringify(profile));

// 표본 시간(µs)을 노드별 자기 시간으로 모은다
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const self = new Map<number, number>();
for (let i = 0; i < profile.samples.length; i++) {
  const dt = profile.timeDeltas[i + 1] ?? 0;
  self.set(profile.samples[i], (self.get(profile.samples[i]) ?? 0) + dt);
}
const sampled = [...self.values()].reduce((a, b) => a + b, 0);
// 표본 시간을 실제 경과 시간에 맞춘다 (프로파일러 자체 비용을 고르게 나눈다)
const scale = sampled > 0 ? wall / (sampled / 1000) : 0;
const msPerDay = (us: number) => (us / 1000) * scale / days;

// 소스 줄: esbuild 로 묶은 파일(fast.sh)은 '// src/x.ts' 표시로 원래 모듈을 찾는다
const sources = new Map<string, { lines: string[]; marks: { line: number; mod: string }[] }>();
function source(url: string) {
  if (!sources.has(url)) {
    let lines: string[] = [];
    try { if (url.startsWith('file:')) lines = readFileSync(fileURLToPath(url), 'utf8').split('\n'); } catch { /* 없음 */ }
    const marks: { line: number; mod: string }[] = [];
    lines.forEach((l, i) => { const m = /^\/\/ ((?:src|cli)\/[\w.-]+\.ts)$/.exec(l.trim()); if (m) marks.push({ line: i, mod: m[1].replace(/^.*\//, '') }); });
    sources.set(url, { lines, marks });
  }
  return sources.get(url)!;
}
const file = (f: CallFrame) => {
  const base = f.url.replace(/^.*[\\/]/, '').replace(/\?.*$/, '');
  const { marks } = source(f.url);
  if (!marks.length) return base;
  let mod = base;
  for (const m of marks) if (m.line <= f.lineNumber) mod = m.mod;
  return mod;
};
const label = (f: CallFrame) => `${f.functionName || '(anonymous)'} ${file(f)}${f.functionName ? '' : `:${f.lineNumber + 1}`}`;

// 노드별 포함 시간 (하위 포함)
const incl = new Map<number, number>();
const inclusive = (id: number): number => {
  const n = byId.get(id)!;
  let t = self.get(id) ?? 0;
  for (const c of n.children ?? []) t += inclusive(c);
  incl.set(id, t);
  return t;
};
const root = profile.nodes[0].id;
inclusive(root);

// 함수별 자기 시간·포함 시간 (재귀는 바깥 호출만 센다)
const fnSelf = new Map<string, number>(), fnIncl = new Map<string, number>();
const walk = (id: number, open: Set<string>) => {
  const n = byId.get(id)!;
  const k = label(n.callFrame);
  fnSelf.set(k, (fnSelf.get(k) ?? 0) + (self.get(id) ?? 0));
  const outer = !open.has(k);
  if (outer) { fnIncl.set(k, (fnIncl.get(k) ?? 0) + incl.get(id)!); open.add(k); }
  for (const c of n.children ?? []) walk(c, open);
  if (outer) open.delete(k);
};
walk(root, new Set());

/**
 * 이름이 name 이고 모듈이 mod 인 노드들의 직접 하위를 함수별로 모은다.
 * 부모 자신에 잡힌 시간은 대개 그 줄에서 부른 함수 몫이라(호출·복귀 순간의 표본), 줄의 소스로 호출 대상을 찾아 그쪽에 더한다
 */
function phases(name: string, mod: string) {
  const out = new Map<string, number>();
  let total = 0;
  for (const n of profile.nodes) {
    if (n.callFrame.functionName !== name || file(n.callFrame) !== mod) continue;
    total += incl.get(n.id)!;
    for (const c of n.children ?? []) {
      const k = label(byId.get(c)!.callFrame);
      out.set(k, (out.get(k) ?? 0) + incl.get(c)!);
    }
    const own = self.get(n.id) ?? 0;
    const ticks = n.positionTicks ?? [];
    const sum = ticks.reduce((a, t) => a + t.ticks, 0);
    // 줄 번호가 원래 소스와 맞는 것은 esbuild 로 묶은 파일뿐이다 (tsx 는 변환된 코드의 줄)
    const { lines, marks } = source(n.callFrame.url);
    let left = own;
    if (marks.length) for (const t of ticks) {
      const callee = /^\s*(?:const \w+ = )?(\w+)\(/.exec(lines[t.line - 1] ?? '')?.[1];
      const key = callee && [...out.keys()].find((k) => k.startsWith(`${callee} `));
      if (!key || sum === 0) continue;
      const part = (own * t.ticks) / sum;
      out.set(key, out.get(key)! + part);
      left -= part;
    }
    if (left > 1e-9) out.set(`(${name} 자체)`, (out.get(`(${name} 자체)`) ?? 0) + left);
  }
  return { total, rows: [...out.entries()].sort((a, b) => b[1] - a[1]) };
}

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(1)}%`;
const line = (k: string, v: number, of: number) => `  ${k.padEnd(40)} ${msPerDay(v).toFixed(3).padStart(8)}ms ${pct(v, of).padStart(6)}`;

console.log(`시드 ${seed}, ${warm}년 예열 후 ${years}년: 하루 평균 ${(wall / days).toFixed(2)}ms (프로파일러 켬), pop ${w.pops.length}개, 건물 ${w.buildings.length}개`);
const st = phases('step', 'tick.ts');
console.log(`\nstep 단계 (하루 평균, step 대비):`);
for (const [k, v] of st.rows) if (msPerDay(v) >= 0.005) console.log(line(k, v, st.total));
const wk = phases('weekly', 'tick.ts');
if (wk.total > 0) {
  console.log(`\nweekly 단계 (7일에 한 번, 하루 평균으로 나눔, step 대비):`);
  for (const [k, v] of wk.rows) if (msPerDay(v) >= 0.005) console.log(line(k, v, st.total));
}
const skip = (k: string) => /^\((root|program|idle|garbage collector)\) /.test(k) || /^\(anonymous\) perf\.(ts|mjs):/.test(k);
console.log(`\n자기 시간 상위 함수 (step 대비):`);
for (const [k, v] of [...fnSelf.entries()].filter(([k]) => !skip(k)).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(line(k, v, st.total));
const gc = [...fnSelf.entries()].find(([k]) => k.startsWith('(garbage collector)'))?.[1] ?? 0;
if (gc > 0) console.log(line('(garbage collector)', gc, st.total));
console.log(`\n포함 시간 상위 함수 (step 대비):`);
for (const [k, v] of [...fnIncl.entries()].filter(([k]) => !skip(k) && !k.startsWith('step ')).sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(line(k, v, st.total));
