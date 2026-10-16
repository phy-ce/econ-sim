import { useState } from 'react';
import { companyById, formatDate } from '@econ/sim';
import type { GameEvent, World } from '@econ/sim';
import { Sprite } from '../sprites';
import type { SpriteName } from '../sprites';

type Filter = 'all' | 'mine' | 'alerts';
const PLAYER_ID = 100;

/** 소식 → 도트 아이콘 (내용으로 고른다) 과 테두리 색 (종류로 고른다) */
function kindOf(e: GameEvent): { cls: string; sprite: SpriteName; label: string } {
  const cls = e.kind === 'danger' || e.kind === ('error' as GameEvent['kind']) ? 'danger' : e.kind === 'warn' ? 'warn'
    : /완료|완공|흑자/.test(e.text) ? 'good' : 'info';
  const label = { danger: '위험', warn: '주의', good: '좋은 소식', info: '정보' }[cls]!;
  const t = e.text;
  const sprite: SpriteName = /굶|기아|식량/.test(t) ? 'ev-famine'
    : /압류|은행|경매|파산|채권|대출|빚/.test(t) ? 'ev-seize'
    : /연구|기술/.test(t) ? 'ev-research'
    : /가격|값|시세|기본가/.test(t) ? 'ev-price'
    : /떠났|이주|옮겨|이동/.test(t) ? 'ev-migrate'
    : /건설|공사|완공|증설|철거|착공/.test(t) ? 'ev-build'
    : 'bell';
  return { cls, sprite, label };
}

export function Notifications({ world, lastReadTick, onRead, onJump }: {
  world: World;
  /** 이 틱 이하의 알림은 읽은 것으로 본다 */
  lastReadTick: number;
  onRead: () => void;
  onJump: (regionId: number) => void;
}) {
  const [filter, setFilter] = useState<Filter>('mine');
  const match = (e: GameEvent) =>
    filter === 'all' ? true : filter === 'mine' ? e.companyId === PLAYER_ID || e.companyId === null : e.kind !== 'info';
  const events = [...world.events].reverse().filter(match).slice(0, 80);
  const unread = world.events.filter((e) => e.tick > lastReadTick && (e.companyId === PLAYER_ID || e.companyId === null)).length;

  return (
    <div className="notices">
      <div className="notices-head">
        <h2>소식</h2>
        <div className="chips" role="tablist" aria-label="소식 거르기">
          {([['mine', '내 상회'], ['alerts', '경고'], ['all', '전체']] as const).map(([id, label]) => (
            <button key={id} role="tab" aria-selected={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        {unread > 0 && <button className="link-btn" onClick={onRead}>모두 읽음 ({unread})</button>}
      </div>
      <ol className="events">
        {events.length === 0 && <li className="empty">아직 소식이 없습니다.</li>}
        {events.map((e, i) => {
          const c = e.companyId != null ? companyById(world, e.companyId) : undefined;
          const fresh = e.tick > lastReadTick;
          const k = kindOf(e);
          return (
            <li key={`${e.tick}-${i}`} className={`ev ${k.cls} ${fresh ? 'fresh' : ''} ${e.regionId ? 'link' : ''}`}
              onClick={e.regionId ? () => onJump(e.regionId!) : undefined} tabIndex={e.regionId ? 0 : -1}
              onKeyDown={(kk) => { if (e.regionId && (kk.key === 'Enter' || kk.key === ' ')) { kk.preventDefault(); onJump(e.regionId); } }}
              title={e.regionId ? '누르면 그 지역으로 이동' : undefined}>
              <span className="ev-icon"><Sprite name={k.sprite} size={16} label={k.label} /></span>
              <div className="ev-main">
                <span className="ev-text">{e.text}</span>
                <span className="ev-meta lbl">
                  <time>{formatDate(e.tick).replace('왕국력 ', '')}</time>
                  {c && <><span className="swatch" style={{ background: c.color }} />{c.isPlayer ? '내 상회' : c.name}</>}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
