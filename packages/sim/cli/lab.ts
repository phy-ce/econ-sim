// 0b 측정 실행 (docs/overhaul/01_VISION.md 10장, 0B_PREREG.md): 명세 → 해마다 지표 jsonl (stdout).
//   npx tsx cli/lab.ts <명세.json | '{"name":..,"seed":..}'> [--key 키] [--index i] [--only 이름,이름] [--list]
// 명세 파일은 배열이거나 {specs: [...]} (docs/overhaul/0B_SPECS.json). --key 는 그 파일 안 다른 배열 키 (예: specs20, 기본 specs).
// --index 는 그 순번 하나만, --list 는 "순번 이름 seed salt years optional" 줄만 낸다.
// 줄: 해마다 {"y","seed","salt","run","k"(왕국 id 또는 "all"),...} 와 실행 끝에 {"run","seed","salt","control"(명세에 있으면),"log":[...],"ms"} 한 줄.
import { readFileSync, existsSync } from 'node:fs';
import { runSpec } from '../src/lab/run';
import type { LabSpec } from '../src/lab/run';

const args = process.argv.slice(2);
const opt = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const src = args.find((a, i) => !a.startsWith('--') && !['--index', '--only', '--key'].includes(args[i - 1] ?? ''));
if (!src) { console.error('사용: lab.ts <명세.json | JSON> [--key 키] [--index i] [--only a,b] [--list]'); process.exit(2); }
const raw = JSON.parse(existsSync(src) ? readFileSync(src, 'utf8') : src) as LabSpec | LabSpec[] | Record<string, unknown>;
const key = opt('--key') ?? 'specs';
let specs = (Array.isArray(raw) ? raw : key in raw ? (raw as Record<string, unknown>)[key] : [raw]) as LabSpec[];
if (!Array.isArray(specs)) { console.error(`명세 배열이 아니다: ${key}`); process.exit(2); }
if (args.includes('--list')) {
  specs.forEach((s, i) => console.log(`${i} ${s.name} ${s.seed} ${s.salt ?? 0} ${s.years} ${s.optional ? 1 : 0}`));
  process.exit(0);
}
const idx = opt('--index');
if (idx != null) specs = [specs[Number(idx)]];
const only = opt('--only');
if (only) { const set = new Set(only.split(',')); specs = specs.filter((s) => set.has(s.name)); }
for (const spec of specs) {
  const res = runSpec(spec, { onRows: (rows) => { for (const r of rows) process.stdout.write(JSON.stringify(r) + '\n'); } });
  const end = { run: spec.name, item: spec.item, seed: spec.seed, salt: spec.salt ?? 0, years: spec.years, ...(spec.control ? { control: spec.control } : {}), ms: Math.round(res.ms), log: res.log };
  process.stdout.write(JSON.stringify(end) + '\n');
}
