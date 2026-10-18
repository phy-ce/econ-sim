import { ArrowUpRight, MapPin, Factory } from 'lucide-react';
import { eventDestination } from '../eventDestination';
import { OwnerBadge } from './OwnerBadge';
import { useState } from 'react';
import { companyById } from '@econ/sim';
import type { GameEvent, World } from '@econ/sim';
import { Sprite } from '../sprites';
import type { SpriteName } from '../sprites';
import { shortDate } from '../format';
import { companyName, regionName, buildingName, eventText, t, useT } from '../i18n';

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
  const T = useT();
  const [filter, setFilter] = useState<Filter>('mine');
  const match = (e: GameEvent) =>
    filter === 'all' ? true : filter === 'mine' ? e.companyId === PLAYER_ID || e.companyId === null : e.kind !== 'info';
  const events = [...world.events].reverse().filter(match).slice(0, 80);
  const unread = world.events.filter((e) => e.tick > lastReadTick && (e.companyId === PLAYER_ID || e.companyId === null)).length;

  return (
    <div className="notices">
      <div className="notices-head">
        <h2>{T.news}</h2>
        <div className="chips" role="tablist" aria-label={T.newsFilter}>
          {([['mine', T.filterMine], ['alerts', T.filterAlerts], ['all', T.filterAll]] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        {unread > 0 && <button className="link-btn" onClick={onRead}>{T.markAllRead(unread)}</button>}
      </div>
      <ol className="events">
        {events.length === 0 && <li className="empty">—</li>}
        {events.map((e, i) => {
          const c = e.companyId != null ? companyById(world, e.companyId) : undefined;
          const region=world.regions.find(r=>r.id===e.regionId);
          const building=world.buildings.find(b=>b.id===e.buildingId);
          const destination=eventDestination(world,e);
          const fresh = e.tick > lastReadTick;
          const k = kindOf(e);
          return (
            <li key={`${e.tick}-${i}`} className={`ev ${k.cls} ${fresh ? 'fresh' : ''}`}>
              <span className="ev-icon"><Sprite name={k.sprite} size={40} label={k.label} /></span>
              <div className="ev-main">
                {destination?<button className="ev-text event-link" onClick={()=>onEvent(e)}>{eventText(e)}<ArrowUpRight size={14} aria-hidden="true"/></button>:<span className="ev-text">{eventText(e)}</span>}
                <span className="ev-meta lbl">
                  <time>{shortDate(e.tick)}</time>
                  {c && <button className="entity-link" onClick={()=>onCompany(c.id)} title={companyName(c)}><OwnerBadge company={c} world={world}/><ArrowUpRight size={12}/></button>}
                  {region&&<button className="entity-link" onClick={()=>onJump(region.id)}><MapPin size={12}/>{regionName(region)}</button>}
                  {building&&<button className="entity-link" onClick={()=>onEvent(e)}><Factory size={12}/>{buildingName(building.typeId)}</button>}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
