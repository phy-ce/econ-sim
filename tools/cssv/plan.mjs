// usage (repo root): CSSV_WINS_IN=.tmp/cssv/<run>/wins.json node tools/cssv/plan.mjs [--layers] [--apply]
// UI-20 step 5: sorts every game-only rule into a role file (tokens, base, parts, views/<component>.css) and checks, on the
// measured element rule sets, whether any winning declaration would change under the new order (and with @layer).
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(path.resolve('node_modules/x.js')); const postcss = require('postcss');
const SRC = 'packages/client/src', args = process.argv.slice(2), LAYERS = args.includes('--layers'), APPLY = args.includes('--apply');
const order = ['views/language-pick.css','system-02/tokens.css','system-02/blocks.css','kingdom-economy.css','views/flow-row.css','views/demolition.css','ownership-theme.css','views/sort-header.css','system-ui.css','map/atlas.css','styles.css','workspace.css','strategy.css','readability.css','ui/tokens.css','ui/components.css','ui/runtime.css'];
const sharedRole = { 'system-02/tokens.css': 'tokens', 'ui/tokens.css': 'tokens', 'ui/components.css': 'components', 'system-02/blocks.css': 'components' };
const ROLES = ['tokens', 'base', 'components', 'views', 'overrides'];
const flat = s => s.replace(/\s+/g, '').replace(/['"]/g, '').replace(/(^|[^:]):(before|after)\b/g, '$1::$2').toLowerCase();
const splitTop = sel => { const o = []; let d = 0, c = ''; for (const ch of sel) { if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d--; if (ch === ',' && d === 0) { o.push(c); c = ''; } else c += ch; } o.push(c); return o.map(x => x.trim()); };
const W = JSON.parse(fs.readFileSync(process.env.CSSV_WINS_IN, 'utf8'));
// source files that use class names (game code only; draft pages excluded)
const code = {}; const walkDir = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name).replace(/\\/g, '/');
  if (e.isDirectory()) { if (!/design-system|foundations|test/.test(e.name)) walkDir(p); } else if (/\.tsx?$/.test(e.name) && !/\.test\./.test(e.name) && !/system-02\/main/.test(p)) code[p.slice(SRC.length + 1)] = fs.readFileSync(p, 'utf8'); } };
walkDir(SRC);
const usersCache = new Map();
const users = cls => { if (usersCache.has(cls)) return usersCache.get(cls); const re = new RegExp(`(^|[^\\w-])${cls.replace(/[-]/g, '\\-')}(?![\\w-])`); const u = Object.keys(code).filter(f => re.test(code[f])); usersCache.set(cls, u); return u; };
const kebab = f => path.basename(f, path.extname(f)).replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
// owner of one selector part: the component file that uses its subject class (last class in the last compound)
const ownerOf = part => { const compounds = part.replace(/::?[\w-]+(\([^)]*\))?/g, ' ').split(/[\s>+~]+/).filter(Boolean);
  for (let ci = compounds.length - 1; ci >= 0; ci--) { const cls = [...compounds[ci].matchAll(/\.([\w-]+)/g)].map(m => m[1]).reverse();
    for (const c of cls) { const u = users(c); if (!u.length) continue; const views = u.filter(f => f.startsWith('views/') || f.startsWith('system-02/') || f.startsWith('map/') || f.startsWith('ui/'));
      if (u.length === 1 && views.length === 1) return 'views/' + kebab(u[0]) + '.css'; return 'ui/parts.css'; } }
  return null; };
const classify = r => { const decls = r.nodes.filter(n => n.type === 'decl');
  if (decls.length && decls.every(d => d.prop.startsWith('--'))) return 'ui/game-tokens.css';
  const parts = splitTop(r.selector);
  if (parts.every(p => !/[.#]/.test(p))) return 'ui/base.css';
  const owners = new Set(parts.map(ownerOf)); owners.delete(null);
  if (owners.size === 1) return [...owners][0]; return 'ui/parts.css'; };
const roleOf = f => sharedRole[f] || (f === 'ui/runtime.css' ? 'overrides' : null) || (f === 'ui/game-tokens.css' ? 'tokens' : f === 'ui/base.css' ? 'base' : f === 'ui/parts.css' ? 'components' : 'views');
// source rules in page order
const roots = {}, seq = [];
for (const f of order) { const file = path.join(SRC, f); roots[f] = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
  roots[f].walkRules(r => { if (r.parent?.type === 'atrule' && /keyframes$/.test(r.parent.name)) return; seq.push({ f, r }); }); }
if (seq.length !== W.meta.length) throw Error(`rule count ${seq.length} vs page ${W.meta.length}`);
seq.forEach((s, i) => { if (flat(s.r.selector) !== flat(W.meta[i][0])) throw Error('mismatch at ' + i + ' ' + s.r.selector); });
for (const s of seq) s.to = sharedRole[s.f] || s.f === 'ui/runtime.css' ? s.f : classify(s.r);  // runtime.css: game overrides of shared parts, loaded after them
// new file order: tokens, base, components, views; shared files keep their place inside their role
// shared ui/components.css stays last as today (it was loaded from ui/runtime.css after every game file)
const fileOrder = []; const add = f => { if (!fileOrder.includes(f) && seq.some(s => s.to === f)) fileOrder.push(f); };
for (const f of ['system-02/tokens.css', 'ui/tokens.css', 'ui/game-tokens.css', 'ui/base.css', 'system-02/blocks.css', 'ui/parts.css']) add(f);
for (const s of seq) if (roleOf(s.to) === 'views') add(s.to);
add('ui/components.css'); add('ui/runtime.css');
let newPos, conflicts;
const check = () => { newPos = new Array(seq.length); { let n = 0; for (const f of fileOrder) seq.forEach((s, i) => { if (s.to === f) newPos[i] = n++; }); }
const layer = i => ROLES.indexOf(roleOf(seq[i].to));
// check on measured rule sets
const lh = W.meta.map(m => m[4]), cond = W.meta.map(m => m[2]);
const winners = (entries, key) => { const best = new Map(); for (const e of entries) for (const [n, imp] of lh[e.i]) { const k = key(e, imp); const b = best.get(n); if (!b || cmp(k, b.k) > 0) best.set(n, { k, i: e.i }); } return best; };
const cmp = (a, b) => { for (let x = 0; x < a.length; x++) if (a[x] !== b[x]) return a[x] - b[x]; return 0; };
const oldKey = (e, imp) => [imp, e.sp, e.i];
const newKey = (e, imp) => LAYERS ? [imp, imp ? -layer(e.i) : layer(e.i), e.sp, newPos[e.i]] : [imp, e.sp, newPos[e.i]];
conflicts = new Map();
for (const set of W.sets) { const all = set.split(',').map(x => { const [i, sp] = x.split(':').map(Number); return { i, sp }; });
  for (const entries of [all, all.filter(e => !cond[e.i])]) { const a = winners(entries, oldKey), b = winners(entries, newKey);
    for (const [n, w] of a) { const v = b.get(n); if (v.i !== w.i) { const k = `${w.i}>${v.i}`; if (!conflicts.has(k)) conflicts.set(k, new Set()); conflicts.get(k).add(n); } } } }
};
// fix: a rule that must keep winning moves into the loser's file (it then sits after it, as in the old order)
let moved = 0;
for (let round = 0; round < 20; round++) { check(); if (!conflicts.size) break;
  for (const k of conflicts.keys()) { const [a, b] = k.split('>').map(Number); if (seq[a].to !== seq[b].to && !sharedRole[seq[a].to] && seq[a].to !== 'ui/runtime.css') { seq[a].to = seq[b].to; moved++; } } }
console.log('moved to keep order', moved);
const count = {}; for (const s of seq) count[s.to] = (count[s.to] || 0) + 1;
console.log('files', fileOrder.length, JSON.stringify(Object.fromEntries(fileOrder.map(f => [f, count[f]]))));
console.log(LAYERS ? 'with @layer' : 'order only', 'conflicting rule pairs', conflicts.size);
for (const [k, ns] of [...conflicts].slice(0, 40)) { const [a, b] = k.split('>').map(Number); console.log(` keep ${seq[a].f}→${seq[a].to} «${seq[a].r.selector.slice(0, 60)}» over ${seq[b].f}→${seq[b].to} «${seq[b].r.selector.slice(0, 60)}» : ${[...ns].slice(0, 4).join(' ')}`); }
fs.writeFileSync(path.join(path.dirname(process.env.CSSV_WINS_IN), 'plan.json'), JSON.stringify({ fileOrder, rules: seq.map((s, i) => ({ f: s.f, to: s.to, sel: s.r.selector, pos: newPos[i] })) }, null, 1));
export { seq, fileOrder, roots, order, SRC, APPLY, LAYERS, conflicts, roleOf, ROLES };
// --apply: write the role files in the new order and a new ui/index.css. Shared files are not touched; old game files are left
// for `git rm` (this script never deletes). Rules keep their @media/@container wrappers; comments in old files are dropped.
if (APPLY) {
  if (conflicts.size) throw Error('conflicts left; not applying');
  const out = {};
  for (const s of seq) { if (sharedRole[s.f]) continue;
    const root = out[s.to] ||= postcss.root(); const chain = []; let p = s.r.parent; while (p.type !== 'root') { chain.unshift(p); p = p.parent; }
    let box = root; for (const at of chain) { const last = box.last; if (last && last.type === 'atrule' && last.__src === at) box = last; else { const c = at.clone({ nodes: [] }); c.__src = at; c.raws.before = '\n'; box.append(c); box = c; } }
    const c = s.r.clone(); if (box === root) c.raws.before = '\n'; box.append(c); }
  for (const f of order) { if (sharedRole[f]) continue; roots[f].each(n => { if (n.type === 'atrule' && /keyframes$/.test(n.name)) {
    const user = seq.find(s => s.r.toString().includes(n.params)); const k = n.clone(); k.raws.before = '\n'; out[user ? user.to : 'ui/base.css'].append(k); } }); }
  const label = f => f === 'ui/game-tokens.css' ? '게임 전용 변수' : f === 'ui/base.css' ? '태그 기본 모양 (클래스 없는 선택자)' : f === 'ui/parts.css' ? '여러 창이 함께 쓰는 게임 부품'
    : f === 'ui/runtime.css' ? '공용 부품(ui/components.css)을 게임에 맞게 덮어쓰기. 공용 파일 뒤에 불러온다' : `${f.replace(/^views\/|\.css$/g, '')} 컴포넌트`;
  for (const [f, root] of Object.entries(out)) { const file = path.join(SRC, f);
    fs.writeFileSync(file, `/* ${label(f)} (UI-20 5단계에서 역할별로 옮김). */` + root.toString().replace(/^\n/, '\n') + '\n'); }
  const rel = f => f.startsWith('ui/') ? './' + f.slice(3) : '../' + f;
  fs.writeFileSync(path.join(SRC, 'ui/index.css'), `/* 본 게임 CSS 의 유일한 진입점 (UI-20). main.tsx 만 이 파일을 불러온다. 순서가 곧 덮어쓰기 순서다.
   변수 → 태그 기본 → 공용 블록 → 게임 부품 → 컴포넌트별 → 공용 부품 → 게임용 덮어쓰기. 공용 부품이 뒤에 오는 것은 옮기기 전 순서를 지키기 위해서다.
   @layer 는 걸지 않았다: 걸면 공용 부품이 구체성으로 이기던 14곳이 바뀐다 (tools/cssv/plan.mjs --layers). */
` + fileOrder.map(f => `@import '${rel(f)}';`).join('\n') + '\n');
  const gone = order.filter(f => !sharedRole[f] && !out[f]); console.log('written', Object.keys(out).length, 'files; no longer used:', gone.join(' '));
}
