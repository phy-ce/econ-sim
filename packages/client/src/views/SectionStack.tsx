import { useEffect, useId, useState, useRef, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { useLang } from '../i18n';

type Item = { id: string; title: string; content: ReactNode; height: number };
type Preference = { id: string; collapsed: boolean; height: number };
const clamp = (height: number) => Math.max(96, Math.min(640, height));

export function SectionStack({ storageKey, items, revealId, revealKey }: { storageKey: string; items: Item[]; revealId?:string; revealKey?:number|null }) {
  const ko = useLang() === 'ko';
  const prefix = useId();
  const root=useRef<HTMLDivElement>(null);
  const defaults = () => items.map(({ id, height }) => ({ id, height, collapsed: false }));
  const [prefs, setPrefs] = useState<Preference[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem(`estera.sections.${storageKey}`) ?? 'null');
      if (!Array.isArray(saved)) return defaults();
      const result: Preference[] = [];
      for (const p of saved) {
        if (!p || !items.some(i => i.id === p.id) || result.some(i => i.id === p.id)) continue;
        const fallback = items.find(i => i.id === p.id)!;
        result.push({ id: p.id, collapsed: p.collapsed === true, height: typeof p.height === 'number' && Number.isFinite(p.height) ? clamp(p.height) : fallback.height });
      }
      return [...result, ...defaults().filter(p => !result.some(i => i.id === p.id))];
    } catch { return defaults(); }
  });
  useEffect(() => {
    try { localStorage.setItem(`estera.sections.${storageKey}`, JSON.stringify(prefs)); } catch { /* Storage may be unavailable. */ }
  }, [prefs, storageKey]);
  useEffect(()=>{
    if(!revealId||revealKey==null)return;
    setPrefs(ps=>ps.map(p=>p.id===revealId?{...p,collapsed:false}:p));
    const frame=requestAnimationFrame(()=>root.current?.querySelector(`[data-section="${revealId}"]`)?.scrollIntoView({block:'nearest'}));
    return ()=>cancelAnimationFrame(frame);
  },[revealId,revealKey]);
  const resize = (id: string, height: number) => setPrefs(ps => ps.map(p => p.id === id ? { ...p, height: clamp(height) } : p));
  const move = (index: number, delta: number) => setPrefs(ps => {
    const next = [...ps];
    if (!next[index + delta]) return ps;
    [next[index], next[index + delta]] = [next[index + delta], next[index]];
    return next;
  });
  return <div className="section-stack" ref={root}>
    <div className="section-settings"><span>{ko ? '정보 구역' : 'Sections'}</span><button onClick={() => setPrefs(defaults())} title={ko ? '구역 배치·높이 초기화' : 'Reset section layout'}><RotateCcw size={12}/>{ko ? '초기화' : 'Reset'}</button></div>
    {prefs.map((p, index) => {
      const item = items.find(i => i.id === p.id);
      if (!item) return null;
      const bodyId = `${prefix}-${p.id}`;
      return <section data-section={p.id} className="custom-section" key={p.id} aria-label={item.title}>
        <header className="section-heading">
          <button className="section-toggle" aria-expanded={!p.collapsed} aria-controls={bodyId} onClick={() => setPrefs(ps => ps.map(v => v.id === p.id ? { ...v, collapsed: !v.collapsed } : v))}>
            {p.collapsed ? <ChevronRight size={14}/> : <ChevronDown size={14}/>}<h3>{item.title}</h3>
          </button>
          <button disabled={index === 0} aria-label={`${item.title} ${ko ? '위로 이동' : 'move up'}`} onClick={() => move(index, -1)}><ArrowUp size={13}/></button>
          <button disabled={index === prefs.length - 1} aria-label={`${item.title} ${ko ? '아래로 이동' : 'move down'}`} onClick={() => move(index, 1)}><ArrowDown size={13}/></button>
        </header>
        <div id={bodyId} hidden={p.collapsed}>
          <div className="section-content" style={{ maxHeight: p.height }}>{item.content}</div>
          <div className="section-resize" role="separator" aria-orientation="horizontal" aria-label={`${item.title} ${ko ? '높이 조절' : 'resize height'}`} aria-valuemin={96} aria-valuemax={640} aria-valuenow={p.height} tabIndex={0}
            onKeyDown={e => { if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); e.stopPropagation(); resize(p.id, p.height + (e.key === 'ArrowUp' ? -24 : 24)); } }}
            onPointerDown={e => { e.preventDefault(); e.stopPropagation(); const target = e.currentTarget; const y = e.clientY; const height = p.height; target.setPointerCapture(e.pointerId); target.onpointermove = event => resize(p.id, height + event.clientY - y); const end = () => { target.onpointermove = null; target.onpointerup = null; target.onpointercancel = null; target.onlostpointercapture = null; }; target.onpointerup = end; target.onpointercancel = end; target.onlostpointercapture = end; }}
          />
        </div>
      </section>;
    })}
  </div>;
}
