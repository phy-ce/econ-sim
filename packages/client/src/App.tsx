import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Menu, Moon, Pause, SkipForward } from 'lucide-react';
import { Sprite } from './sprites';
import { DISTRESS_DEBT_RATIO, SEIZURE_WEEKS, companyById, creditLimit, formatDate, isDistressed, playerCompany, regionById } from '@econ/sim';
import type { GoodId } from '@econ/sim';
import { useGame } from './useGame';
import { money, signedMoney } from './format';
import { RegionMap } from './views/RegionMap';
import { RegionPanel } from './views/RegionPanel';
import { CompanyPanel, CompanyView } from './views/CompanyPanel';
import { BottomPanel } from './views/BottomPanel';
import { Notifications } from './views/Notifications';

/** 1배 = 현실 1초에 게임 1시간 (하루 24초) */
const HOUR = 1 / 24;
const SPEEDS = [
  { label: '1×', tps: HOUR, title: '1배: 현실 1초에 1시간' },
  { label: '10×', tps: HOUR * 10, title: '10배' },
  { label: '100×', tps: HOUR * 100, title: '100배' },
  { label: '500×', tps: HOUR * 500, title: '500배' },
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

  if (!world) return <div className="boot"><Sprite name="crest" size={48} /><span>왕국의 시장을 여는 중…</span></div>;
  const me = playerCompany(world);
  const region = regionById(world, regionId);
  const viewed = viewId != null ? companyById(world, viewId) : undefined;
  const viewCompany = (id: number) => setViewId(companyById(world, id)?.isPlayer ? null : id);
  const limit = me ? creditLimit(world, me) : 0;
  const debtRatio = me && limit > 0 ? me.debt / limit : 0;
  const distressed = me ? isDistressed(world, me) : false;
  const unread = world.events.filter((e) => e.tick > game.lastReadTick && (e.companyId === PLAYER_ID || e.companyId === null) && e.kind !== 'info').length;
  const [datePart, timePart] = (() => {
    const s = formatDate(world.tick, game.hour).replace('왕국력 ', '');
    const i = s.lastIndexOf(' ');
    return i > 0 && /시$/.test(s) ? [s.slice(0, i), s.slice(i + 1)] : [s, ''];
  })();
  const running = game.speed > 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="crest"><Sprite name="crest" size={48} /></span>
          <div className="brand-text">
            <span className="brand-name">에스테라 왕국{me ? ` · ${me.name}` : ''}</span>
            <span className="date">왕국력 {datePart} {timePart && <small>{timePart}</small>}</span>
          </div>
        </div>

        {me && (
          <dl className="ledger">
            <div className="chip"><dt><Sprite name="coin" size={16} /> 금고</dt><dd>{money(me.cash)}</dd></div>
            <div className={`chip ${debtRatio >= DISTRESS_DEBT_RATIO ? 'bad' : debtRatio >= 0.7 ? 'warn' : ''}`}>
              <dt>대출 / 한도</dt><dd>{money(me.debt)} <small>/ {money(limit)}</small></dd>
            </div>
            <div className={`chip ${me.lastWeekProfit >= 0 ? 'good' : 'bad'}`}><dt>지난주 손익</dt><dd>{signedMoney(me.lastWeekProfit)}</dd></div>
          </dl>
        )}

        <div className="controls">
          <div className="segmented" role="group" aria-label="게임 속도 (1배는 현실 1초에 게임 1시간)">
            <button className="seg-play" aria-pressed={!running} aria-label="일시정지 (Space)" title="일시정지 (Space)"
              onClick={() => game.setSpeed(0)}><Pause size={16} strokeWidth={2.4} aria-hidden="true" /></button>
            {SPEEDS.map((s) => (
              <button key={s.tps} aria-pressed={game.speed === s.tps} onClick={() => game.setSpeed(s.tps)} title={`${s.title} (${SPEEDS.indexOf(s) + 1})`}>{s.label}</button>
            ))}
            <button onClick={game.stepOnce} disabled={running} title="하루 진행" aria-label="하루 진행"><SkipForward size={14} aria-hidden="true" /></button>
          </div>

          <Popover label={`알림${unread ? ` ${unread}건 안 읽음` : ''}`} className="bell"
            button={<><Sprite name="bell" size={32} />{unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}</>}>
            {() => (
              <div className="bell-panel">
                <Notifications world={world} lastReadTick={game.lastReadTick} onRead={game.markRead} onJump={setRegionId} />
              </div>
            )}
          </Popover>

          <Popover label="메뉴" button={<Menu size={18} aria-hidden="true" />}>
            {(close) => (
              <div className="menu">
                <button onClick={() => { game.save(); close(); }}>저장</button>
                <button onClick={() => { game.load(); close(); }}>불러오기</button>
                <button onClick={() => { if (confirm('지금 게임을 버리고 새로 시작할까요? 저장하지 않은 진행은 사라집니다.')) { game.newGame(); setViewId(null); } close(); }}>새 게임</button>
                <hr />
                <label className="check">
                  <input type="checkbox" checked={game.prefs.pauseOnDanger} onChange={(e) => game.setPrefs({ pauseOnDanger: e.target.checked })} />
                  위험 알림이 오면 멈추기
                </label>
                <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
                  {theme === 'dark' ? <><Sprite name="sun" size={16} /> 낮 양피지</> : <><Moon size={14} aria-hidden="true" /> 밤 등불</>}
                </button>
              </div>
            )}
          </Popover>
        </div>
      </header>

      {me && (distressed || debtRatio >= 0.7) && (
        <div className={`banner ${distressed ? 'danger' : ''}`} role="status">
          {distressed
            ? me.distressWeeks >= SEIZURE_WEEKS
              ? `은행 관리 중: 부실 ${me.distressWeeks}주째. ${SEIZURE_WEEKS}주마다 건물 한 곳이 경매로 넘어가 빚을 갚습니다. 현금을 하루 임금 이상으로 올리거나 빚을 한도의 90% 아래로 줄이면 풀립니다.`
              : `은행 경고: 대출이 한도의 90%를 넘었고 현금이 하루 임금에 못 미칩니다(부실 ${me.distressWeeks}주째). ${SEIZURE_WEEKS}주째에 건물 한 곳이 압류됩니다. 적자 건물을 멈추거나 임금을 낮춰 현금을 확보하세요.`
            : `대출이 한도의 ${Math.round(debtRatio * 100)}%입니다. 90%를 넘은 상태에서 현금이 하루 임금 아래로 떨어지면 은행 관리가 시작됩니다.`}
        </div>
      )}

      <main className="board">
        <section className="card pane pane-map" aria-label="왕국 지도">
          <RegionMap world={world} selected={regionId} onSelect={setRegionId} />
        </section>
        <section className="card pane pane-region" aria-label="지역 상세">
          <RegionPanel world={world} region={region} history={game.history} selectedGood={good} onSelectGood={setGood} onViewCompany={viewCompany} />
        </section>
        <section className="card pane pane-company" aria-label={viewed && !viewed.isPlayer ? `${viewed.name} 상세` : '내 상회'}>
          {viewed && !viewed.isPlayer
            ? <CompanyView world={world} company={viewed} onView={viewCompany} />
            : me ? <CompanyPanel game={game} world={world} me={me} region={region} onViewCompany={viewCompany} /> : <p className="empty">플레이어 상회가 없는 월드입니다.</p>}
        </section>
        <section className="pane pane-bottom" aria-label="추이와 상회 순위">
          <BottomPanel world={world} history={game.history}
            lastReadTick={game.lastReadTick} onRead={game.markRead} onJump={setRegionId}
            viewedId={viewed && !viewed.isPlayer ? viewed.id : (me?.id ?? null)} onViewCompany={viewCompany} />
        </section>
      </main>

      <div className="toasts" aria-live="polite">
        {game.toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`} onClick={() => { if (t.regionId) setRegionId(t.regionId); game.dismissToast(t.id); }} role={t.regionId ? 'button' : undefined}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
