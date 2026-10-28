import {useNavigationState} from '../NavigationHistory';
import { useEffect, useId, useState, useRef, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { useLang } from '../i18n';

type Item = { id: string; title: string; shortTitle?:string; content: ReactNode; height: number };
type Preference = { id: string; collapsed: boolean; height: number };
const clamp = (height: number) => Math.max(96, Math.min(640, height));

export function SectionStack({ storageKey, items, revealId, revealKey, explorer=false }: { storageKey: string; items: Item[]; revealId?:string; revealKey?:number|null; explorer?:boolean }) {
  const ko = useLang() === 'ko';
  const prefix = useId();
  const root=useRef<HTMLDivElement>(null);
  const browse=explorer;
  const [selected,setSelected]=useNavigationState(`sections:${storageKey}:selected`,items[0]?.id);
  const active=items.some(i=>i.id===selected)?selected:items[0]?.id;
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
    setSelected(revealId);
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
    {browse?<div className="information-explorer">
      <nav className="explorer-rail" aria-label={ko?'정보 분류':'Information categories'}>
        {prefs.map(p=>items.find(i=>i.id===p.id)).filter((item):item is Item=>!!item).map(item=><button key={item.id} aria-pressed={active===item.id} aria-controls={`${prefix}-detail`} data-help={item.title} onClick={()=>setSelected(item.id)}>{item.shortTitle??item.title}</button>)}
      </nav>
      <section className="explorer-detail" id={`${prefix}-detail`} aria-label={items.find(i=>i.id===active)?.title}>
        {items.map(item=><div key={item.id} hidden={active!==item.id} data-section={item.id}><h3 className="explorer-heading">{item.title}</h3>{item.content}</div>)}
      </section>
    </div>:<>
    <div className="section-settings"><button onClick={() => setPrefs(defaults())} title={ko ? '구역 순서·접기 초기화' : 'Reset section layout'}><RotateCcw size={12}/></button></div>
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
          <div className="section-content" >{item.content}</div>
        </div>
      </section>;
    })}</>}
  </div>;
}
