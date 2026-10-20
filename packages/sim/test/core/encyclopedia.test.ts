// 백과사전(src/encyclopedia.ts)이 규칙과 함께 바뀌는지 본다:
// 모든 값·예시·live 함수가 새 세계와 짧게 돌린 세계에서 돌고, id·related 가 맞고,
// docs/DESIGN.md 의 번호 붙은 절이 모두 항목에 이어져 있고, TUNE 의 모든 키가 어느 항목에 실려 있다.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  DESIGN_SECTIONS, ENCYCLOPEDIA, ENC_BUILDINGS, ENC_CATEGORIES, SEEN_IN, TUNE, TUNE_DOCUMENTED, TUNE_EXPERIMENTAL, createWorld, defaultCtx, fillText, step,
} from '../../src';
import type { EncCtx, EncLiveView, EncRow, World } from '../../src';

const designPath = fileURLToPath(new URL('../../../../docs/DESIGN.md', import.meta.url));

function checkRows(rows: EncRow[] | undefined, where: string) {
  for (const r of rows ?? []) {
    expect(r.label.ko && r.label.en, where).toBeTruthy();
    if (typeof r.value === 'number') expect(Number.isNaN(r.value), `${where} ${r.label.en}`).toBe(false);
  }
}
function checkView(v: EncLiveView, where: string) {
  checkRows(v.rows, where);
  for (const b of v.bars ?? []) expect(Number.isFinite(b.value), `${where} bar ${b.label.en}`).toBe(true);
}
function runLive(w: World) {
  const base = defaultCtx(w);
  for (const e of ENCYCLOPEDIA) {
    if (!e.live) continue;
    const ctxs: EncCtx[] = [base];
    if (e.live.pick.includes('region')) for (const r of w.regions) ctxs.push({ ...base, regionId: r.id });
    if (e.live.pick.includes('kingdom')) for (const k of w.kingdoms) ctxs.push({ ...base, kingdomId: k.id });
    if (e.live.pick.includes('good')) ctxs.push({ ...base, good: 'transport' }, { ...base, good: 'paper' });
    if (e.live.pick.includes('building')) for (const b of ENC_BUILDINGS) ctxs.push({ ...base, building: b });
    for (const c of ctxs) checkView(e.live.run(w, c), e.id);
  }
}

describe('encyclopedia', () => {
  it('ids are unique, links resolve, text is filled', () => {
    const ids = new Set<string>();
    const cats = new Set(ENC_CATEGORIES.map((c) => c.id));
    for (const e of ENCYCLOPEDIA) {
      expect(ids.has(e.id), `duplicate ${e.id}`).toBe(false);
      ids.add(e.id);
      expect(cats.has(e.category), `${e.id} category`).toBe(true);
      expect(e.title.ko && e.title.en && e.rule.ko && e.rule.en, e.id).toBeTruthy();
      expect(e.source.length, `${e.id} source`).toBeGreaterThan(0);
      expect(e.design.length, `${e.id} design`).toBeGreaterThan(0);
      for (const s of e.seenIn) expect(SEEN_IN[s], `${e.id} seenIn ${s}`).toBeTruthy();
      for (const d of e.design) expect(DESIGN_SECTIONS[d], `${e.id} design ${d}`).toBeTruthy();
      // {n} 은 모두 params 안에 있어야 한다
      for (const text of [e.rule.ko, e.rule.en, e.formula ?? '']) {
        const filled = fillText(text, e, (v) => String(v));
        expect(/\{\d+\}/.test(filled), `${e.id} placeholder in "${text}"`).toBe(false);
      }
    }
    for (const e of ENCYCLOPEDIA) for (const r of e.related) expect(ids.has(r), `${e.id} → ${r}`).toBe(true);
    for (const c of cats) expect(ENCYCLOPEDIA.some((e) => e.category === c), `empty category ${c}`).toBe(true);
  });

  it('params and examples evaluate', () => {
    for (const e of ENCYCLOPEDIA) {
      for (const prm of e.params) {
        const v = prm.value();
        expect(typeof v === 'string' || !Number.isNaN(v), `${e.id} ${prm.label.en}`).toBe(true);
      }
      if (e.example) {
        const x = e.example();
        expect(x.result.length, `${e.id} example result`).toBeGreaterThan(0);
        checkRows([...x.inputs, ...x.steps, ...x.result], `${e.id} example`);
      }
    }
  });

  it('live views run on a fresh world and after two weeks', () => {
    const w = createWorld(2);
    runLive(w);
    for (let i = 0; i < 14; i++) step(w);
    runLive(w);
  });

  it('every numbered DESIGN.md section is mapped', () => {
    const doc = readFileSync(designPath, 'utf8');
    const found: Record<string, string> = {};
    for (const line of doc.split(/\r?\n/)) {
      const m = /^#{2,3}\s+(\d+(?:\.\d+)?)\.?\s+(.*)$/.exec(line);
      if (m) found[m[1]] = m[2].split(' (')[0].trim();
    }
    // DESIGN.md 의 절이 바뀌면 encyclopedia.ts 의 DESIGN_SECTIONS 와 항목도 고친다
    expect(found).toEqual(DESIGN_SECTIONS);
    for (const sec of Object.keys(DESIGN_SECTIONS)) {
      expect(ENCYCLOPEDIA.some((e) => e.design.includes(sec)), `DESIGN ${sec} has no entry`).toBe(true);
    }
  });

  it('every TUNE key is documented', () => {
    const missing = (Object.keys(TUNE) as (keyof typeof TUNE)[]).filter((k) => !TUNE_DOCUMENTED.has(k) && !TUNE_EXPERIMENTAL.includes(k));
    expect(missing).toEqual([]);
  });
});
