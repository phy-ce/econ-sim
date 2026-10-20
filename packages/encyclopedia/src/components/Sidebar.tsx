import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { ENCYCLOPEDIA, ENC_CATEGORIES } from '@econ/sim';
import type { EncEntry } from '@econ/sim';
import { tr } from '../strings';
import type { Lang } from '../strings';

/** 검색어가 제목·규칙·id 에 들어 있는가 (두 언어 모두) */
function matches(e: EncEntry, q: string): boolean {
  if (!q) return true;
  const hay = `${e.id} ${e.title.ko} ${e.title.en} ${e.rule.ko} ${e.rule.en} ${e.formula ?? ''}`.toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

/** 왼쪽 목록: 검색 + 분류별 항목 */
export function Sidebar({ lang, current, onPick }: { lang: Lang; current: string; onPick: (id: string) => void }) {
  const [q, setQ] = useState('');
  const groups = useMemo(
    () => ENC_CATEGORIES.map((c) => ({ c, items: ENCYCLOPEDIA.filter((e) => e.category === c.id && matches(e, q.trim())) })).filter((g) => g.items.length > 0),
    [q],
  );
  return (
    <nav className="sidebar">
      <label className="search">
        <Search size={15} aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tr('search', lang)} aria-label={tr('search', lang)} />
      </label>
      <div className="tree">
        {groups.length === 0 && <div className="muted pad">{tr('noResults', lang)}</div>}
        {groups.map(({ c, items }) => (
          <section key={c.id}>
            <h3>{c.title[lang]}<span className="count">{items.length}</span></h3>
            <ul>
              {items.map((e) => (
                <li key={e.id}>
                  <a href={`#${e.id}`} className={e.id === current ? 'on' : ''} onClick={(ev) => { ev.preventDefault(); onPick(e.id); }}>
                    {e.title[lang]}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </nav>
  );
}
