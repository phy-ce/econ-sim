import { RegionWindow } from './views/RegionWindow';
import { PolicyPanel } from './views/PolicyPanel';
import { ResearchPanel } from './views/ResearchPanel';
import type { PopRequest } from './views/PopTable';
import { eventDestination } from './eventDestination';
import { NumericValue } from './NumericValue';
import { taxCollectionRatio } from './systemMetrics';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Menu, Moon, Pause, SkipForward, Map, HardHat, Users, Package, Factory, Landmark, FlaskConical, ChartNoAxesCombined } from 'lucide-react';
import { WindowWorkspace } from './views/WindowWorkspace';
import type { WindowId } from './views/WindowWorkspace';
import { Sprite } from './sprites';
import { companyById, creditLimit, playerCompany, regionById } from '@econ/sim';
import type { GoodId, GameEvent, PopClass } from '@econ/sim';
import { useGame } from './useGame';
import { Bar } from './ui';
import { dateParts, money, signedMoney } from './format';
import { companyName, eventText, setLang, useLang, useT } from './i18n';
import { RegionMap } from './views/RegionMap';
import { RegionPanel } from './views/RegionPanel';
import { Research, Projects } from './views/CompanyPanel';
import { FinancePanel } from './views/FinancePanel';
import { BottomPanel } from './views/BottomPanel';
import { Notifications } from './views/Notifications';

/** 1배 = 현실 1초에 게임 1시간 (하루 24초) */
// 1배속 = 하루 0.96초 (1년 약 5.8분). 10배속은 디버그용
const BASE_TPS = 25 / 24;
const SPEEDS = [1, 2, 3, 4, 10].map((x) => ({ label: `${x}×`, tps: BASE_TPS * x }));
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
  const [opened, setOpened] = useState<WindowId[]>(['map']);
  const [revealRequest,setRevealRequest] = useState(0);
  const showWindow = (id: WindowId) => { setOpened(current=>id==='map'?current:[...current.filter(w=>w!==id),id]); setRevealRequest(v=>v+1); };
  const [popRequest,setPopRequest]=useState<PopRequest|null>(null);
  const [buildingRequest,setBuildingRequest]=useState<{id:number;sequence:number}|null>(null);
  const [regionTabRequest,setRegionTabRequest]=useState({tab:'overview' as 'overview'|'industry',sequence:0});
  const showRegionBuildings=()=>{setRegionTabRequest(r=>({tab:'industry',sequence:r.sequence+1}));showWindow('region');};
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
      if (t?.closest('button, a, [role=button], [tabindex]')) return;
      if (e.code === 'Space') {
        e.preventDefault();
        gameRef.current.setSpeed(gameRef.current.speed > 0 ? 0 : lastSpeed.current);
      } else if (/^[1-5]$/.test(e.key)) {
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
  const viewCompany = (id: number) => { setPopRequest(null);setViewId(id); showWindow('trends'); };
  const selectRegion = (id: number) => { setRegionId(id);setRegionTabRequest(r=>({tab:'overview',sequence:r.sequence+1})); showWindow('region'); };
  const openPops=(regionId:number,prof:PopClass)=>{setRegionId(regionId);setViewId(null);setPopRequest(p=>({regionId,prof,sequence:(p?.sequence??0)+1}));showWindow('region');};
  const openBuilding=(id:number)=>{const b=world.buildings.find(b=>b.id===id);if(b){setRegionId(b.regionId);setBuildingRequest(p=>({id,sequence:(p?.sequence??0)+1}));showWindow('region');}};
  const openEvent=(event:GameEvent)=>{
    const destination=eventDestination(world,event);
    if(!destination)return;
    if(destination.kind==='building'){setRegionId(destination.regionId);setBuildingRequest(previous=>({id:destination.id,sequence:(previous?.sequence??0)+1}));showWindow('region');}
    else if(destination.kind==='region')selectRegion(destination.id);
    else if(destination.kind==='company')viewCompany(destination.id);
    else showWindow(destination.kind);
  };
  const selectGood = (id: GoodId) => { setGood(id); showWindow('market'); };
  const kingdom = world.kingdoms.find(k => k.id === me?.kingdomId);
  const collection = taxCollectionRatio(kingdom);
  const limit = me ? creditLimit(world, me) : 0;
  const debtRatio = me && limit > 0 ? me.debt / limit : 0;
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
          <div className="ledger">
            <button className="chip loan-chip" onClick={()=>showWindow('finance')} aria-label={T.finance} data-help={`${T.system.netTreasury}\n${T.cash}: ${me.cash.toFixed(2)} · ${T.loan}: ${me.debt.toFixed(2)}`}><span className="chip-label"><Sprite name="coin" size={16}/>{T.treasury}</span><span className="chip-value"><NumericValue value={me.cash-me.debt} format="money"/> / <NumericValue value={limit} format="money"/></span></button>
            <dl className={`chip ${me.lastWeekProfit >= 0 ? 'good' : 'bad'}`}><dt>{T.lastWeekPL}</dt><dd><NumericValue value={me.lastWeekProfit} format="signedMoney"/></dd></dl>
            <dl className={`chip ${collection < .8 ? 'warn' : ''}`}><dt>{T.taxCollection}</dt><dd>{Math.round(collection*100)}%</dd><Bar value={collection} tone={collection < .8 ? 'gold' : 'pos'} size="sm" label={T.taxCollection}/></dl>
          </div>
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
            button={<><Sprite name="bell" size={20} />{unread > 0 && <span className="badge">{unread > 99 ? '99+' : unread}</span>}</>}>
            {(close) => (
              <div className="bell-panel">
                <Notifications world={world} lastReadTick={game.lastReadTick} onRead={game.markRead} onJump={id=>{selectRegion(id);close();}} onCompany={id=>{viewCompany(id);close();}} onEvent={event=>{openEvent(event);close();}} />
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

      <WindowWorkspace revealRequest={revealRequest} opened={opened} onOpened={setOpened} windows={[
        { id:'map', title:T.paneMap, icon:<Map size={18}/>, content:<RegionMap world={world} selected={regionId} onSelect={selectRegion}/> },
        {id:'region',title:T.system.region,icon:<Users size={18}/>,content:<RegionWindow tabRequest={regionTabRequest} game={game} world={world} region={region} history={game.history} selectedGood={good} onSelectGood={selectGood} onViewCompany={viewCompany} onViewPops={openPops} buildingRequest={buildingRequest} popRequest={popRequest} onOpenBuilding={openBuilding}/>},
        {id:'market',title:T.market,icon:<Package size={18}/>,content:<RegionPanel game={game} mode="market" world={world} region={region} history={game.history} selectedGood={good} onSelectGood={selectGood} onViewCompany={viewCompany} onViewBuildings={showRegionBuildings}/>},
        {id:'policies',title:T.system.policies,icon:<Landmark size={18}/>,content:me?<PolicyPanel world={world} game={game} kingdomId={me.kingdomId} onResearch={()=>showWindow('research')}/>:null},
        { id:'finance', title:T.finance, icon:<Landmark size={18}/>, content:me?<FinancePanel active={opened.includes('finance')} game={game} world={world} me={me} onBuilding={openBuilding} onPolicies={()=>showWindow('policies')}/>:null },
        { id:'research', title:T.research, icon:<FlaskConical size={18}/>, content:me?<ResearchPanel game={game} world={world} me={me}/>:null },
        { id:'construction', title:T.construct, icon:<HardHat size={18}/>, content:me?<Projects game={game} world={world} owner={me} projects={world.constructions}/>:null },
        { id:'trends', title:lang==='ko'?'통계 · 소식':'Statistics', icon:<ChartNoAxesCombined size={18}/>, content:<BottomPanel popRequest={popRequest} onBuilding={openBuilding} onEvent={openEvent} game={game} world={world} history={game.history} lastReadTick={game.lastReadTick} onRead={game.markRead} onJump={selectRegion} viewedId={viewId} onViewCompany={viewCompany}/> },
      ]}/>


      <div className="toasts" aria-live="polite">
        {game.toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.regionId ? <button className="event-link" onClick={()=>{selectRegion(t.regionId!);game.dismissToast(t.id);}}>{eventText(t)} ↗</button> : eventText(t)}
          </div>
        ))}
      </div>
    </div>
  );
}
