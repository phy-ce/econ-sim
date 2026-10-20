import { useEffect, useState } from 'react';
import { BookOpen, Languages, Menu, Moon, Sun } from 'lucide-react';
import { ENCYCLOPEDIA, ENCYCLOPEDIA_BY_ID, defaultCtx } from '@econ/sim';
import type { EncCtx } from '@econ/sim';
import { Sidebar } from './components/Sidebar';
import { EntryView } from './components/EntryView';
import { useLang, useTheme } from './prefs';
import { tr } from './strings';
import { useHashId } from './useHash';
import { useLiveWorld } from './useLiveWorld';

export function App() {
  const [lang, setLang] = useLang();
  const [theme, setTheme] = useTheme();
  const [id, go] = useHashId(ENCYCLOPEDIA[0].id);
  const [navOpen, setNavOpen] = useState(false);
  const live = useLiveWorld(1);
  const [ctx, setCtx] = useState<EncCtx | null>(null);
  const entry = ENCYCLOPEDIA_BY_ID[id] ?? ENCYCLOPEDIA[0];

  useEffect(() => { document.documentElement.dataset.theme = theme; }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; document.title = `${entry.title[lang]} · ${tr('title', lang)}`; }, [lang, entry]);
  // 고르기 값(지역·상품·왕국·건물)은 세계가 처음 생길 때 정한다
  useEffect(() => { if (live.world && !ctx) setCtx(defaultCtx(live.world)); }, [live.world, ctx]);

  const pick = (next: string) => { go(next); setNavOpen(false); document.querySelector('.main')?.scrollTo({ top: 0 }); };

  return (
    <div className={`app${navOpen ? ' nav-open' : ''}`}>
      <header className="top">
        <button type="button" className="icon only-narrow" onClick={() => setNavOpen(!navOpen)} aria-label={tr('menu', lang)}><Menu size={18} /></button>
        <BookOpen size={18} aria-hidden className="brand-icon" />
        <span className="brand">{tr('title', lang)}</span>
        <span className="muted num">{ENCYCLOPEDIA.length}</span>
        <span className="spacer" />
        <button type="button" className="icon" onClick={() => setLang(lang === 'ko' ? 'en' : 'ko')} aria-label={tr('language', lang)}>
          <Languages size={16} /><span>{lang === 'ko' ? 'EN' : '한'}</span>
        </button>
        <button type="button" className="icon" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={tr('theme', lang)}>
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </header>
      <Sidebar lang={lang} current={entry.id} onPick={pick} />
      <main className="main">
        <EntryView key={entry.id} entry={entry} lang={lang} live={live} ctx={ctx} setCtx={setCtx} onPick={pick} />
      </main>
    </div>
  );
}
