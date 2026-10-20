import { useMemo } from 'react';
import { FastForward, RotateCcw, SkipForward } from 'lucide-react';
import { BUILDING_BY_ID, ENC_BUILDINGS, GOODS, GOOD_IDS, TICKS_PER_YEAR, regionNameEn } from '@econ/sim';
import type { EncCtx, EncEntry, EncLiveView, GoodId } from '@econ/sim';
import { tr } from '../strings';
import type { Lang } from '../strings';
import type { LiveWorld } from '../useLiveWorld';
import { Bars } from './Bars';
import { Rows } from './Rows';

const MAX_DAYS = TICKS_PER_YEAR * 20;

/** 날짜 조절: 슬라이더(손을 떼면 이동), +30일, +1년, 처음부터 */
export function LiveClock({ live, lang }: { live: LiveWorld; lang: Lang }) {
  const tick = live.world?.tick ?? 0;
  const busy = live.busy;
  return (
    <div className="clock">
      <span className="num clock-day">
        {tr('year', lang)} {Math.floor(tick / TICKS_PER_YEAR) + 1} · {tr('day', lang)} {tick}
      </span>
      <input
        type="range" min={0} max={MAX_DAYS} step={30} defaultValue={tick} key={tick} disabled={!!busy} aria-label={tr('day', lang)}
        onPointerUp={(e) => live.goto(Number((e.target as HTMLInputElement).value))}
        onKeyUp={(e) => live.goto(Number((e.target as HTMLInputElement).value))}
      />
      <button type="button" onClick={() => live.goto(tick + 30)} disabled={!!busy}><SkipForward size={14} aria-hidden />{tr('plus30', lang)}</button>
      <button type="button" onClick={() => live.goto(tick + TICKS_PER_YEAR)} disabled={!!busy}><FastForward size={14} aria-hidden />{tr('plusYear', lang)}</button>
      <button type="button" onClick={() => live.goto(0)} disabled={!!busy}><RotateCcw size={14} aria-hidden />{tr('restart', lang)}</button>
      <label className="seed">
        {tr('seed', lang)}
        <select value={live.seed} disabled={!!busy} onChange={(e) => live.reset(Number(e.target.value))}>
          {[1, 2, 3, 4].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </label>
      {busy && busy.target > 0 && <span className="muted num">{tr('running', lang)} {busy.tick}/{busy.target}</span>}
    </div>
  );
}

/** 항목의 live 함수를 지금 세계로 돌려 표와 막대로 보인다. 고를 것(지역·상품·왕국·건물)이 있으면 고르기 칸을 둔다 */
export function LivePanel({ entry, live, ctx, setCtx, lang }: {
  entry: EncEntry; live: LiveWorld; ctx: EncCtx | null; setCtx: (c: EncCtx) => void; lang: Lang;
}) {
  const w = live.world;
  const view: EncLiveView | null = useMemo(() => {
    if (!w || !ctx || !entry.live) return null;
    try { return entry.live.run(w, ctx); } catch { return null; }
  }, [w, ctx, entry]);
  if (!entry.live) return null;
  const pick = entry.live.pick;
  return (
    <div className="live">
      <LiveClock live={live} lang={lang} />
      {w && ctx && pick.length > 0 && (
        <div className="picks">
          {pick.includes('region') && (
            <label>{tr('region', lang)}
              <select value={ctx.regionId} onChange={(e) => setCtx({ ...ctx, regionId: Number(e.target.value) })}>
                {w.regions.map((r) => <option key={r.id} value={r.id}>{lang === 'ko' ? r.name : regionNameEn(r.id)}</option>)}
              </select>
            </label>
          )}
          {pick.includes('good') && (
            <label>{tr('good', lang)}
              <select value={ctx.good} onChange={(e) => setCtx({ ...ctx, good: e.target.value as GoodId })}>
                {GOOD_IDS.map((g) => <option key={g} value={g}>{lang === 'ko' ? GOODS[g].name : GOODS[g].nameEn}</option>)}
              </select>
            </label>
          )}
          {pick.includes('kingdom') && (
            <label>{tr('kingdom', lang)}
              <select value={ctx.kingdomId} onChange={(e) => setCtx({ ...ctx, kingdomId: Number(e.target.value) })}>
                {w.kingdoms.map((k) => <option key={k.id} value={k.id}>{lang === 'ko' ? k.name : k.nameEn}</option>)}
              </select>
            </label>
          )}
          {pick.includes('building') && (
            <label>{tr('building', lang)}
              <select value={ctx.building} onChange={(e) => setCtx({ ...ctx, building: e.target.value })}>
                {ENC_BUILDINGS.map((b) => <option key={b} value={b}>{lang === 'ko' ? BUILDING_BY_ID[b].name : BUILDING_BY_ID[b].nameEn}</option>)}
              </select>
            </label>
          )}
        </div>
      )}
      {view && (
        <div className="live-body">
          {view.rows && view.rows.length > 0 && <Rows rows={view.rows} lang={lang} />}
          {view.bars && view.bars.length > 0 && <Bars bars={view.bars} lang={lang} />}
          {(!view.rows || view.rows.length === 0) && (!view.bars || view.bars.length === 0) && <div className="muted">{tr('empty', lang)}</div>}
        </div>
      )}
    </div>
  );
}
