// node tools/cssv/deadrules.mjs packages/client/src <css-runtime-data.json> [--apply]  (repo root)
import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(path.resolve('node_modules/x.js'));
const postcss = require('postcss');
const splitTop = sel => { const out = []; let d = 0, cur = ''; for (const ch of sel) { if (ch === '(' || ch === '[') d++; if (ch === ')' || ch === ']') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };
const [src, dataFile, flag] = process.argv.slice(2); const apply = flag === '--apply';
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const all = walk(src); const code = all.filter(f => /\.(tsx?|html)$/.test(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n') + fs.readdirSync(path.join(src, '..')).filter(f => f.endsWith('.html')).map(f => fs.readFileSync(path.join(src, '..', f), 'utf8')).join('\n');
const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
const hit = new Set(data.screens.flatMap(s => s.hits));
const known = new Set(data.rules.map(r => r.key));
const libs = /^(recharts|lucide)/;
const used = c => {
  if (libs.test(c)) return true;
  if (new RegExp('(^|[^\w-])' + c.replace(/[-]/g, '\-') + '($|[^\w-])').test(code)) return true;
  const parts = c.split('-'); // dynamic prefix like gu-kingdom-${i}
  for (let i = 1; i < parts.length; i++) { const p = parts.slice(0, i).join('-') + '-'; if (code.includes(p + '${') || code.includes(p + "'+") || code.includes(p + '"+') || code.includes(p + "' +") || code.includes(p + '`')) return true; }
  return false;
};
const files = ['views/language-pick.css','system-02/blocks.css','kingdom-economy.css','views/flow-row.css','views/demolition.css','ownership-theme.css','views/sort-header.css','system-ui.css','map/atlas.css','styles.css','workspace.css','strategy.css','readability.css','ui/runtime.css','ui/components.css','ui/tokens.css','system-02/tokens.css'];
let total = 0, removedBytes = 0; const report = {};
for (const rel of files) {
  const file = path.join(src, rel); const text = fs.readFileSync(file, 'utf8'); const root = postcss.parse(text, { from: file });
  const dead = [];
  root.walkRules(rule => {
    if (rule.parent?.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    const key = `${rel}:${rule.source.start.line}:${rule.source.start.column}`;
    if (!known.has(key) || hit.has(key)) return;
    let allDead = true;
    for (const sel of splitTop(rule.selector)) { const cls = [...sel.replace(/\[[^\]]*\]/g, '').matchAll(/\.([A-Za-z_][\w-]*)/g)].map(m => m[1]); if (!cls.length || cls.every(used)) allDead = false; }
    if (allDead) dead.push(rule);
  });
  report[rel] = dead.map(r => r.selector.replace(/\s+/g, ' ').slice(0, 90));
  total += dead.length;
  if (apply && dead.length) {
    for (const r of dead) { removedBytes += r.toString().length; const parent = r.parent; r.remove(); if (parent.type === 'atrule' && !parent.nodes.length) parent.remove(); }
    fs.writeFileSync(file, root.toString());
  }
}
for (const [f, l] of Object.entries(report)) if (l.length) console.log(`${f}: ${l.length}`);
console.log('TOTAL', total, apply ? `removed ~${(removedBytes / 1024).toFixed(1)} KB` : '(dry run)');
fs.mkdirSync('.tmp/cssv', { recursive: true }); fs.writeFileSync('.tmp/cssv/deadrules.json', JSON.stringify(report, null, 1));
