import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Menu, Moon, Pause, SkipForward } from 'lucide-react';
import { Sprite } from './sprites';
import { DISTRESS_DEBT_RATIO, SEIZURE_WEEKS, companyById, creditLimit, isDistressed, playerCompany, regionById } from '@econ/sim';
import type { GoodId } from '@econ/sim';
import { useGame } from './useGame';
import { Bar } from './ui';
import { dateParts, money, signedMoney } from './format';
import { companyName, eventText, setLang, useLang, useT } from './i18n';
import { RegionMap } from './views/RegionMap';
import { RegionPanel } from './views/RegionPanel';
import { CompanyPanel, CompanyView } from './views/CompanyPanel';
import { BottomPanel } from './views/BottomPanel';
import { Notifications } from './views/Notifications';

/** 1배 = 현실 1초에 게임 1시간 (하루 24초) */
const HOUR = 1 / 24;
const SPEEDS = [
  { label: '1×', tps: HOUR },
  { label: '10×', tps: HOUR * 10 },
  { label: '100×', tps: HOUR * 100 },
  { label: '500×', tps: HOUR * 500 },
];
const THEME_KEY = 'estera-theme';
const PLAYER_ID = 100;

function loadTheme(): 'light' | 'dark' {
  try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; }
}

/** 버튼 하나로 여닫는 작은 팝오버. 바깥을 누르거나 Esc 를 누르면 닫힌다 */
function Popover({ button, label, children, className = '' }: { button: ReactNode; label: string; children: (close: () => void) => ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);
  return (
    <div className={`popover ${className}`} ref={ref}>
      <button className="icon-btn" aria-haspopup="true" aria-expanded={open} aria-label={label} title={label} onClick={() => setOpen(!open)}>{button}</button>
      {open && <div className="popover-panel" role="dialog" aria-label={label}>{children(() => setOpen(false))}</div>}
    </div>
  );
}

export function App() {
  const game = useGame();
  const [regionId, setRegionId] = useState(1);
  const [good, setGood] = useState<GoodId>('food');
  /** 다른 상회를 들여다보는 중이면 그 회사 id (내 회사면 null) */
  const [viewId, setViewId] = useState<number | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(loadTheme);
  const { world } = game;
  const lang = useLang();
  const T = useT();

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = T.title;
  }, [lang, T]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* 저장소를 못 쓰면 이번 세션만 */ }
  }, [theme]);

  // 단축키: Space 재생/정지, 1~4 속도 (입력 칸에 글을 쓰는 중에는 무시)
  const lastSpeed = useRef(SPEEDS[0].tps);
  if (game.speed > 0) lastSpeed.current = game.speed;
  const gameRef = useRef(game);
  gameRef.current = game;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)))) return;
      if (e.code === 'Space') {
        e.preventDefault();
        gameRef.current.setSpeed(gameRef.current.speed > 0 ? 0 : lastSpeed.current);
      } else if (/^[1-4]$/.test(e.key)) {
        gameRef.current.setSpeed(SPEEDS[Number(e.key) - 1].tps);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (!world) return <div className="boot" role="status" aria-label={T.booting}><Sprite name="crest" size={48} /></div>;
  const me = playerCompany(world);
  const region = regionById(world, regionId);
  const viewed = viewId != null ? companyById(world, viewId) : undefined;
  const viewCompany = (id: number) => setViewId(companyById(world, id)?.isPlayer ? null : id);
  const limit = me ? creditLimit(world, me) : 0;
  const debtRatio = me && limit > 0 ? me.debt / limit : 0;
  const distressed = me ? isDistressed(world, me) : false;
  const unread = world.events.filter((e) => e.tick > game.lastReadTick && (e.companyId === PLAYER_ID || e.companyId === null) && e.kind !== 'info').length;
  const [datePart, timePart] = dateParts(world.tick, game.hour);
  const running = game.speed > 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="crest"><Sprite name="crest" size={48} /></span>
          <div className="brand-text">
            <span className="brand-name">{T.title}{me ? ` · ${companyName(me)}` : ''}</span>
            <span className="date">{T.datePrefix}{datePart} {timePart && <small>{timePart}</small>}</span>
          </div>
        </div>

        {me && (
          <dl className="ledger">
            <div className="chip"><dt><Sprite name="coin" size={16} /> {T.treasury}</dt><dd>{money(me.cash)}</dd></div>
            <div className={`chip ${debtRatio >= DISTRESS_DEBT_RATIO ? 'bad' : debtRatio >= 0.7 ? 'warn' : ''}`}>
              <dt>{T.loanLimit}</dt><dd>{money(me.debt)} <small>/ {money(limit)}</small></dd>
            </div>
            <div className={`chip ${me.lastWeekProfit >= 0 ? 'good' : 'bad'}`}><dt>{T.lastWeekPL}</dt><dd>{signedMoney(me.lastWeekProfit)}</dd></div>
          </dl>
        )}

        <div className="controls">
          <div className="segmented" role="group" aria-label={T.speedGroup}>
            <button className="seg-play" aria-pressed={!running} aria-label={T.pause} title={T.pause}
              onClick={() => game.setSpeed(0)}><Pause size={16} strokeWidth={2.4} aria-hidden="true" /></button>
            {SPEEDS.map((s) => (
              <button key={s.tps} aria-pressed={game.speed === s.tps} onClick={() => game.setSpeed(s.tps)} title={`${s.label} (${SPEEDS.indexOf(s) + 1})`}>{s.label}</button>
            ))}
            <button onClick={game.stepOnce} disabled={running} title={T.stepDay} aria-label={T.stepDay}><SkipForward size={14} aria-hidden="true" /></button>
          </div>

          <Popover label={T.notifications(unread)} className="bell"
            button={<><Sprite name="bell" size={32} />{unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}</>}>
            {() => (
              <div className="bell-panel">
                <Notifications world={world} lastReadTick={game.lastReadTick} onRead={game.markRead} onJump={setRegionId} />
              </div>
            )}
          </Popover>

          <Popover label={T.menu} button={<Menu size={18} aria-hidden="true" />}>
            {(close) => (
              <div className="menu">
                <button onClick={() => { game.save(); close(); }}>{T.save}</button>
                <button onClick={() => { game.load(); close(); }}>{T.load}</button>
                <button onClick={() => { if (confirm(T.confirmNewGame)) { game.newGame(); setViewId(null); } close(); }}>{T.newGame}</button>
                <hr />
                <label className="check">
                  <input type="checkbox" checked={game.prefs.pauseOnDanger} onChange={(e) => game.setPrefs({ pauseOnDanger: e.target.checked })} />
                  {T.pauseOnDanger}
                </label>
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <><Sprite name="sun" size={16} /> {T.dayTheme}</> : <><Moon size={14} aria-hidden="true" /> {T.nightTheme}</>}
                </button>
                <hr />
                <div className="lang-switch" role="group" aria-label={T.language}>
                  <span className="lbl">{T.language}</span>
                  <div className="segmented">
                    <button aria-pressed={lang === 'ko'} lang="ko" onClick={() => setLang('ko')}>KO</button>
                    <button aria-pressed={lang === 'en'} lang="en" onClick={() => setLang('en')}>EN</button>
                  </div>
                </div>
              </div>
            )}
          </Popover>
        </div>
      </header>

      {me && (distressed || debtRatio >= 0.7) && (
        <div className={`banner ${distressed ? 'danger' : ''}`} role="status">
          <strong>{distressed ? (me.distressWeeks >= SEIZURE_WEEKS ? T.bannerSeized : T.bannerDistress) : T.loanLimit}</strong>
          {distressed
            ? <><Bar value={me.distressWeeks / SEIZURE_WEEKS} tone="neg" label={T.distressWeeks} /><span className="pxnum">{me.distressWeeks}/{SEIZURE_WEEKS}</span></>
            : <><Bar value={debtRatio} tone={debtRatio >= DISTRESS_DEBT_RATIO ? 'neg' : 'gold'} label={T.loanLimit} /><span className="pxnum">{Math.round(debtRatio * 100)}%</span></>}
        </div>
      )}

      <main className="board">
        <section className="card pane pane-map" aria-label={T.paneMap}>
          <RegionMap world={world} selected={regionId} onSelect={setRegionId} />
        </section>
        <section className="card pane pane-region" aria-label={T.paneRegion}>
          <RegionPanel world={world} region={region} history={game.history} selectedGood={good} onSelectGood={setGood} onViewCompany={viewCompany} />
        </section>
        <section className="card pane pane-company" aria-label={viewed && !viewed.isPlayer ? T.paneCompanyOf(companyName(viewed)) : T.myHouse}>
          {viewed && !viewed.isPlayer
            ? <CompanyView world={world} company={viewed} onView={viewCompany} />
            : me ? <CompanyPanel game={game} world={world} me={me} region={region} onViewCompany={viewCompany} /> : <p className="empty">—</p>}
        </section>
        <section className="pane pane-bottom" aria-label={T.paneBottom}>
          <BottomPanel world={world} history={game.history}
            lastReadTick={game.lastReadTick} onRead={game.markRead} onJump={setRegionId}
            viewedId={viewed && !viewed.isPlayer ? viewed.id : (me?.id ?? null)} onViewCompany={viewCompany} />
        </section>
      </main>

      <div className="toasts" aria-live="polite">
        {game.toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} onClick={() => { if (t.regionId) setRegionId(t.regionId); game.dismissToast(t.id); }} role={t.regionId ? 'button' : undefined}>
            {eventText(t)}
          </div>
        ))}
      </div>
    </div>
  );
}
