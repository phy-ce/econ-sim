// usage (repo root): CSSV_WINS_IN=.tmp/cssv/<run>/wins.json [CSSV_APPLY=1] node tools/cssv/cdp.mjs tools/cssv/neverwin.mjs
// Uses wins.json from `CSSV_WINS=1 ... verify.mjs`. Lists declarations in game-only CSS files whose rule matched some element
// in the measured states but none of whose longhands ever won there. Shared files (also used by draft pages) are left alone.
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(path.resolve('node_modules/x.js')); const postcss = require('postcss');
const SRC = 'packages/client/src';
const order = ['views/language-pick.css','system-02/tokens.css','system-02/blocks.css','kingdom-economy.css','views/flow-row.css','views/demolition.css','ownership-theme.css','views/sort-header.css','system-ui.css','map/atlas.css','styles.css','workspace.css','strategy.css','readability.css','ui/tokens.css','ui/components.css','ui/runtime.css'];
const shared = new Set(['system-02/tokens.css','system-02/blocks.css','ui/tokens.css','ui/components.css']);
const flat = s => s.replace(/\s+/g, '').replace(/['"]/g, '').replace(/(^|[^:]):(before|after)\b/g, '$1::$2').toLowerCase();
export default async api => {
  const W = JSON.parse(fs.readFileSync(process.env.CSSV_WINS_IN, 'utf8'));
  const wins = new Set(W.wins), matched = new Set(W.matched);
  const roots = {}, seq = [];
  for (const f of order) { const file = path.join(SRC, f); roots[f] = postcss.parse(fs.readFileSync(file, 'utf8'), { from: file });
    roots[f].walkRules(r => { if (r.parent?.type === 'atrule' && /keyframes$/.test(r.parent.name)) return; seq.push({ f, r }); }); }
  // align source rules with page rules (the browser may drop rules it cannot parse)
  let j = 0, miss = 0; const pair = new Map();
  for (let i = 0; i < seq.length; i++) { const a = flat(seq[i].r.selector);
    let k = j; while (k < W.meta.length && k < j + 3 && flat(W.meta[k][0]) !== a) k++;
    if (k < W.meta.length && flat(W.meta[k][0]) === a) { pair.set(i, k); j = k + 1; } else { miss++; if (miss < 8) console.log('UNPAIRED', seq[i].f, seq[i].r.selector.slice(0, 80), '| page:', W.meta[j]?.[0].slice(0, 80)); } }
  console.log('rules src', seq.length, 'page', W.meta.length, 'paired', pair.size, 'unpaired', miss);
  // expand each declaration to the longhands the browser stores
  const decls = []; seq.forEach((s, i) => s.r.each(n => { if (n.type === 'decl') decls.push({ i, d: n }); }));
  const uniq = [...new Set(decls.map(x => x.d.prop + '\u0000' + x.d.value))];
  const ex = await api.eval(`(()=>{const L=${JSON.stringify(uniq)};const o={};const st=document.createElement('div').style;for(const k of L){const [p,v]=k.split('\\u0000');st.cssText='';st.setProperty(p,v);const a=[];for(let i=0;i<st.length;i++)a.push(st[i]);o[k]=a;}return o;})()`);
  const kill = [], perFile = {}, skip = { shared: 0, unmatched: 0, keep: 0, cond: 0, invalid: 0, ambiguous: 0 };
  const byRule = new Map(); for (const x of decls) { if (!byRule.has(x.i)) byRule.set(x.i, []); byRule.get(x.i).push(x); }
  for (const [i, list] of byRule) {
    const s = seq[i], k = pair.get(i);
    if (shared.has(s.f)) { skip.shared += list.length; continue; }
    if (k === undefined) { skip.ambiguous += list.length; continue; }
    const [, keep, , unk, lh] = W.meta[k];
    if (keep || unk) { skip.keep += list.length; continue; }
    if (!matched.has(k)) { skip.unmatched += list.length; continue; }
    const owner = new Map(); for (const x of list) for (const n of ex[x.d.prop + '\u0000' + x.d.value] || []) owner.set(n, (owner.get(n) || 0) + 1);
    const has = new Set(lh.map(x => x[0]));
    for (const x of list) { const ls = ex[x.d.prop + '\u0000' + x.d.value] || [];
      if (!ls.length || ls.some(n => !has.has(n))) { skip.invalid++; continue; }
      if (ls.some(n => owner.get(n) > 1)) { skip.ambiguous++; continue; }
      if (ls.some(n => wins.has(k + '|' + n))) continue;
      kill.push({ f: s.f, d: x.d, sel: s.r.selector }); perFile[s.f] = (perFile[s.f] || 0) + 1; }
  }
  console.log('never-win', perFile, 'TOTAL', kill.length, 'skipped', skip);
  fs.writeFileSync(path.join(path.dirname(process.env.CSSV_WINS_IN), 'neverwin.json'), JSON.stringify(kill.map(({ f, d, sel }) => ({ f, sel, decl: d.prop + ':' + d.value + (d.important ? '!important' : '') })), null, 1));
  if (process.env.CSSV_APPLY) { for (const { d } of kill) d.remove();
    for (const f of order) { roots[f].walkRules(r => { if (!r.nodes.length) { const p = r.parent; r.remove(); if (p.type === 'atrule' && !p.nodes.length) p.remove(); } });
      const file = path.join(SRC, f), out = roots[f].toString(); if (out !== fs.readFileSync(file, 'utf8')) fs.writeFileSync(file, out); } }
};
