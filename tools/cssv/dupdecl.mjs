// node tools/cssv/dupdecl.mjs packages/client/src [--apply]  (repo root) : remove declarations overridden by a later rule with the same selector set and context
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(path.resolve('node_modules/x.js')); const postcss = require('postcss');
const [src, flag] = process.argv.slice(2); const apply = flag === '--apply';
const order = ['views/language-pick.css','system-02/tokens.css','system-02/blocks.css','kingdom-economy.css','views/flow-row.css','views/demolition.css','ownership-theme.css','views/sort-header.css','system-ui.css','map/atlas.css','styles.css','workspace.css','strategy.css','readability.css','ui/tokens.css','ui/components.css','ui/runtime.css'];
const shared = new Set(['system-02/tokens.css','system-02/blocks.css','ui/tokens.css','ui/components.css']);
const splitTop = sel => { const out = []; let d = 0, cur = ''; for (const ch of sel) { if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
const norm = s => splitTop(s).map(x => x.replace(/\s+/g, ' ').replace(/\s*([>+~])\s*/g, '$1').replace(/'/g, '"').trim()).sort().join(',');
const ctx = r => { const a = []; let p = r.parent; while (p && p.type !== 'root') { if (p.type === 'atrule') a.push('@' + p.name + ' ' + p.params.replace(/\s+/g, ' ')); p = p.parent; } return a.join('|'); };
const roots = {}, seq = [];
for (const f of order) { const file = path.join(src, f); roots[f] = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
  roots[f].walkRules(r => { if (r.parent?.type === 'atrule' && /keyframes$/.test(r.parent.name)) return; seq.push({ f, r, key: ctx(r) + '::' + norm(r.selector) }); }); }
// later declaration per key+prop, scanning backwards
const later = new Map(); const kill = []; const perFile = {};
for (let i = seq.length - 1; i >= 0; i--) { const { f, r, key } = seq[i];
  const decls = r.nodes.filter(n => n.type === 'decl');
  // within one rule, an earlier duplicate prop is also overridden
  const seenInRule = new Map();
  for (let j = decls.length - 1; j >= 0; j--) { const d = decls[j]; const prop = d.prop.toLowerCase(); const k = key + '##' + prop;
    const inRule = seenInRule.get(prop);
    if (inRule && (!d.important || inRule.important)) { kill.push({ f, d, why: 'same rule' }); continue; }
    const L = later.get(k);
    if (L && (!d.important || L.important) && (L.f === f || !shared.has(f))) { kill.push({ f, d, why: L.f === f ? 'same file' : 'later ' + L.f }); }
    if (!inRule) seenInRule.set(prop, { important: d.important });
  }
  for (const d of decls) { const k = key + '##' + d.prop.toLowerCase(); const L = later.get(k); if (!L || (d.important && !L.important)) later.set(k, { f, important: d.important }); }
}
for (const { f } of kill) perFile[f] = (perFile[f] || 0) + 1;
console.log(perFile, 'TOTAL', kill.length);
if (apply) { for (const { d } of kill) d.remove(); for (const f of order) { roots[f].walkRules(r => { if (!r.nodes.length) { const p = r.parent; r.remove(); if (p.type === 'atrule' && !p.nodes.length) p.remove(); } }); const out = roots[f].toString(); const file = path.join(src, f); if (out !== fs.readFileSync(file, 'utf8')) fs.writeFileSync(file, out); } }
