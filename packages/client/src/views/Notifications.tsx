import {Button as UIButton,Input as UIInput,Select as UISelect} from '../ui/controls';
import {t as uiCopy} from '../i18n';
import { ArrowUpRight, MapPin, Factory, Search, CheckCheck, Bell, X } from 'lucide-react';
import { eventDestination } from '../eventDestination';
import { OwnerBadge } from './OwnerBadge';
import { useState, Fragment } from 'react';
import { companyById, playerCompany } from '@econ/sim';
import type { GameEvent, World } from '@econ/sim';
import { Sprite } from '../sprites';
import type { SpriteName } from '../sprites';
import { shortDate } from '../format';
import { companyName, regionName, buildingName, eventText, t, useT, useLang } from '../i18n';

type Filter = 'all' | 'mine' | 'alerts';
const PLAYER_ID = 100;

/**
 * 소식 → 도트 아이콘 (내용으로 고른다) 과 테두리 색 (종류로 고른다).
 * 분류는 언어와 상관없이 늘 한국어 원문(e.text)으로 한다.
 */
function kindOf(e: GameEvent): { cls: string; sprite: SpriteName; label: string } {
  const cls = e.kind === 'danger' || e.kind === ('error' as GameEvent['kind']) ? 'danger' : e.kind === 'warn' ? 'warn'
    : /완료|완공|흑자/.test(e.text) ? 'good' : 'info';
  const T = t();
  const label = { danger: T.kindDanger, warn: T.kindWarn, good: T.kindGood, info: T.kindInfo }[cls]!;
  const s = e.text;
  const sprite: SpriteName = /굶|기아|식량/.test(s) ? 'ev-famine'
    : /압류|은행|경매|파산|채권|대출|빚/.test(s) ? 'ev-seize'
    : /연구|기술/.test(s) ? 'ev-research'
    : /가격|값|시세|기본가/.test(s) ? 'ev-price'
    : /떠났|이주|옮겨|이동/.test(s) ? 'ev-migrate'
    : /건설|공사|완공|증설|철거|착공/.test(s) ? 'ev-build'
    : 'bell';
  return { cls, sprite, label };
}

export function Notifications({ world, lastReadTick, onRead, onJump, onCompany, onEvent }: {
  onCompany:(id:number)=>void; onEvent:(event:GameEvent)=>void;
  world: World;
  /** 이 틱 이하의 알림은 읽은 것으로 본다 */
  lastReadTick: number;
  onRead: () => void;
  onJump: (regionId: number) => void;
}) {
  const T = useT(), ko=useLang()==='ko';
  const [query,setQuery]=useState(''),[onlyUnread,setOnlyUnread]=useState(false),[sort,setSort]=useState('recent'),[limit,setLimit]=useState(40);
  const player=playerCompany(world),playerId=player?.id??PLAYER_ID;
  const ownCompanies=new Set(world.companies.filter(c=>player?.kingdomId!==undefined&&c.kingdomId===player.kingdomId).map(c=>c.id));
  const [filter, setFilter] = useState<Filter>('mine');
  const mine=(e:GameEvent)=>e.companyId===playerId||e.companyId===null||ownCompanies.has(e.companyId);
  const counts={all:world.events.length,mine:world.events.filter(mine).length,alerts:world.events.filter(e=>e.kind!=='info').length};
  const matching=[...world.events].reverse().filter(e=>filter==='all'||(filter==='mine'?mine(e):e.kind!=='info')).filter(e=>!onlyUnread||e.tick>lastReadTick).filter(e=>{
   const region=world.regions.find(r=>r.id===e.regionId),company=e.companyId===null?undefined:companyById(world,e.companyId),building=world.buildings.find(b=>b.id===e.buildingId);
   return [eventText(e),region?regionName(region):'',company?companyName(company):'',building?buildingName(building.typeId):''].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase());
  }).sort((a,b)=>sort==='oldest'?a.tick-b.tick:sort==='priority'?({danger:3,warn:2,info:1}[b.kind]??0)-({danger:3,warn:2,info:1}[a.kind]??0)||b.tick-a.tick:b.tick-a.tick);
  const events=matching.slice(0,limit);
  const unread=world.events.filter(e=>e.tick>lastReadTick&&mine(e)).length;
  const reset=()=>{setQuery('');setOnlyUnread(false);setFilter('all');setLimit(40);};

  return (
    <div className="notices">
      <div className="notice-toolbar">
       <div className="notice-status"><span><Bell size={14}/><strong>{uiCopy().screenText['dispatches']}</strong><small>{matching.length}</small></span><UIButton className="notice-read" disabled={!unread} data-help={uiCopy().screenText['markOwnAndSharedDispatchesAsRead']} onClick={onRead}><CheckCheck size={14}/>{uiCopy().screenText['markRead']}</UIButton></div>
       <div className="notice-filters" role="group" aria-label={T.newsFilter}>{([['mine',uiCopy().screenText['myKingdom']],['alerts',T.filterAlerts],['all',T.filterAll]] as const).map(([id,label])=><UIButton key={id} aria-pressed={filter===id} onClick={()=>{setFilter(id);setLimit(40);}}>{label}<small>{counts[id]}</small></UIButton>)}</div>
       <div className="notice-search"><Search size={14}/><UIInput aria-label={uiCopy().screenText['searchDispatches']} placeholder={uiCopy().screenText['searchNewsRegionsBuildings']} value={query} onChange={e=>{setQuery(e.target.value);setLimit(40);}}/>{query&&<UIButton aria-label={uiCopy().screenText['clearSearch']} onClick={()=>setQuery('')} data-help={uiCopy().screenText['clearSearch']}><X size={13}/></UIButton>}</div>
       <div className="notice-options"><UIButton aria-pressed={onlyUnread} onClick={()=>{setOnlyUnread(v=>!v);setLimit(40);}}><i className="notice-unread-dot"/>{uiCopy().screenText['unreadOnly']}</UIButton><UISelect aria-label={uiCopy().screenText['sortDispatches']} value={sort} onChange={e=>{setSort(e.target.value);setLimit(40);}}><option value="recent">{uiCopy().screenText['newestFirst']}</option><option value="oldest">{uiCopy().screenText['oldestFirst']}</option><option value="priority">{uiCopy().screenText['priorityFirst']}</option></UISelect></div>
      </div>
      <ol className="events notice-timeline">
        {events.length===0&&<li className="notice-empty"><Bell size={25}/><strong>{uiCopy().screenText['noDispatches']}</strong>{(query||onlyUnread||filter!=='all')&&<UIButton onClick={reset}>{uiCopy().screenText['resetFilters']}</UIButton>}</li>}
        {events.map((e, i) => {
          const c = e.companyId != null ? companyById(world, e.companyId) : undefined;
          const region=world.regions.find(r=>r.id===e.regionId);
          const building=world.buildings.find(b=>b.id===e.buildingId);
          const destination=eventDestination(world,e);
          const fresh = e.tick > lastReadTick;
          const k = kindOf(e);
          return (
            <Fragment key={`${e.tick}-${i}`} >{(i===0||events[i-1].tick!==e.tick)&&<li className="notice-date"><time>{shortDate(e.tick)}</time></li>}<li className={`ev ${k.cls} ${fresh ? 'fresh' : ''}`}>
              <span className="ev-icon"><Sprite name={k.sprite} size={28} label={k.label} /></span>
              <div className="ev-main">
                {destination?<UIButton className="ev-text event-link" onClick={()=>onEvent(e)}>{eventText(e)}<ArrowUpRight size={14} aria-hidden="true"/></UIButton>:<span className="ev-text">{eventText(e)}</span>}
                <span className="ev-meta lbl">
                  <span className="notice-kind">{k.label}</span>{fresh&&<span className="notice-fresh">{uiCopy().screenText['unread']}</span>}
                  {c && <UIButton className="entity-link" onClick={()=>onCompany(c.id)} data-help={companyName(c)} aria-label={companyName(c)}><OwnerBadge company={c} world={world}/><ArrowUpRight size={12}/></UIButton>}
                  {region&&<UIButton className="entity-link" onClick={()=>onJump(region.id)}><MapPin size={12}/>{regionName(region)}</UIButton>}
                  {building&&<UIButton className="entity-link" onClick={()=>onEvent(e)}><Factory size={12}/>{buildingName(building.typeId)}</UIButton>}
                </span>
              </div>
            </li></Fragment>
          );
        })}
      </ol>
      {matching.length>limit&&<UIButton className="notice-more" onClick={()=>setLimit(n=>n+40)}>{uiCopy().screenText['showMore']} · {events.length} / {matching.length}</UIButton>}
    </div>
  );
}
