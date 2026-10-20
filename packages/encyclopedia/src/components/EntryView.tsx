import { useMemo } from 'react';
import { ENCYCLOPEDIA_BY_ID, ENC_CATEGORIES, SEEN_IN, fillText } from '@econ/sim';
import type { EncCtx, EncEntry, EncRow } from '@econ/sim';
import { fmtValue } from '../format';
import { tr } from '../strings';
import type { Lang } from '../strings';
import type { LiveWorld } from '../useLiveWorld';
import { ExampleView } from './ExampleView';
import { LivePanel } from './LivePanel';
import { Rows } from './Rows';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="block">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

/** 오른쪽: 한 항목 (제목, 규칙, 공식, 값, 예시, 지금 게임, 관련, 보이는 곳, 코드) */
export function EntryView({ entry, lang, live, ctx, setCtx, onPick }: {
  entry: EncEntry; lang: Lang; live: LiveWorld; ctx: EncCtx | null; setCtx: (c: EncCtx) => void; onPick: (id: string) => void;
}) {
  const fmt = (v: number | string, u: EncRow['unit']) => fmtValue(v, u, lang);
  const params: EncRow[] = useMemo(() => entry.params.map((p) => ({ label: p.label, value: p.value(), unit: p.unit })), [entry]);
  const example = useMemo(() => entry.example?.(), [entry]);
  const cat = ENC_CATEGORIES.find((c) => c.id === entry.category);
  return (
    <article className="entry">
      <div className="crumb">{cat?.title[lang]}</div>
      <h1>{entry.title[lang]}</h1>
      <p className="rule">{fillText(entry.rule[lang], entry, fmt)}</p>
      {entry.formula && <pre className="formula">{fillText(entry.formula, entry, fmt)}</pre>}
      {params.length > 0 && <Section title={tr('params', lang)}><Rows rows={params} lang={lang} /></Section>}
      {example && <Section title={tr('example', lang)}><ExampleView ex={example} lang={lang} /></Section>}
      {entry.live && <Section title={tr('live', lang)}><LivePanel entry={entry} live={live} ctx={ctx} setCtx={setCtx} lang={lang} /></Section>}
      {entry.related.length > 0 && (
        <Section title={tr('related', lang)}>
          <div className="chips">
            {entry.related.map((id) => (
              <a key={id} href={`#${id}`} className="chip link" onClick={(e) => { e.preventDefault(); onPick(id); }}>
                {ENCYCLOPEDIA_BY_ID[id]?.title[lang] ?? id}
              </a>
            ))}
          </div>
        </Section>
      )}
      {entry.seenIn.length > 0 && (
        <Section title={tr('seenIn', lang)}>
          <div className="chips">{entry.seenIn.map((s) => <span key={s} className="chip">{SEEN_IN[s]?.[lang] ?? s}</span>)}</div>
        </Section>
      )}
      <footer className="meta">
        <span>{tr('source', lang)}: {entry.source.join(' · ')}</span>
        <span>{tr('design', lang)} §{entry.design.join(', §')}</span>
        <span className="mono">#{entry.id}</span>
      </footer>
    </article>
  );
}
