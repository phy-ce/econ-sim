import {memo, useCallback} from 'react';
import {useNavigationState} from '../NavigationHistory';
import { PopTable, type PopRequest } from './PopTable';
import { NumericValue } from '../NumericValue';
import type { Game } from '../useGame';
import { CompanySummary, CompanyView, Projects } from './CompanyPanel';
import { playerCompany, companyById } from '@econ/sim';
import { OwnerBadge } from './OwnerBadge';
import { SectionStack } from './SectionStack';
import { SortHeader } from './SortHeader';
import { useMemo, useState } from 'react';
import { POP_CLASSES, kingdomGdp } from '@econ/sim';
import type { HistoryPoint, World, GameEvent } from '@econ/sim';
import { TimeChart } from './Chart';
import { Notifications } from './Notifications';
import { ClassSprite } from '../sprites';
import { CLASS_COLOR } from '../ui';
import { compactMoney, signedCompactMoney } from '../format';
import { className, companyName, useT, useLang } from '../i18n';

function BottomPanelView({ world, history, lastReadTick, onRead, onJump, viewedId, onViewCompany, game, onEvent, popRequest, onBuilding }: {
  popRequest:PopRequest|null; onBuilding:(id:number)=>void;
  onEvent:(event:GameEvent)=>void; game:Game; world: World; history: HistoryPoint[];
  lastReadTick: number; onRead: () => void; onJump: (regionId: number) => void;
  viewedId: number | null; onViewCompany: (companyId: number) => void;
}) {
  const T = useT();
  const me=playerCompany(world);
  const viewed=viewedId!==null?companyById(world,viewedId):me;
  const lang = useLang();
  const [sort,setSort] = useNavigationState('views/BottomPanel.tsx:sort','net');
  const [dir,setDir] = useNavigationState('views/BottomPanel.tsx:dir',-1);
  const wealthData = useMemo(() => history.map((p) => ({ tick: p.tick, ...p.sol })), [history]);
  const series = POP_CLASSES.map((c) => ({ key: c, name: className(c), color: CLASS_COLOR[c] }));
  const rows = world.companies
    .map((c) => ({ c, levels: world.buildings.filter((b) => b.companyId === c.id).reduce((a, b) => a + b.level, 0), net: c.cash - c.debt }))
    .sort((a,b) => (sort==='name' ? companyName(a.c).localeCompare(companyName(b.c)) : sort==='levels' ? a.levels-b.levels : sort==='profit' ? a.c.lastWeekProfit-b.c.lastWeekProfit : a.net-b.net)*dir);

  return (
    <SectionStack explorer revealId={popRequest?'pops':'company'} revealKey={popRequest?.sequence??viewedId} storageKey="trends-v2" items={[
      ...(me?[{id:'summary',shortTitle:lang==='ko'?'요약':'Summary',title:T.mySummary,height:220,content:<CompanySummary world={world} company={me}/>}]:[]),
      {id:'pops',shortTitle:lang==='ko'?'인구':'Pops',title:T.popList,height:360,content:<PopTable world={world} request={popRequest} onRegion={onJump} onBuilding={onBuilding}/>},
      ...(viewed?[{id:'company',shortTitle:lang==='ko'?'상회':'House',title:T.companyDetails,height:310,content:<CompanyView world={world} company={viewed} onView={onViewCompany}/>}]:[]),
{ id: 'kingdoms',shortTitle:lang==='ko'?'왕국':'Kingdoms', title: T.kingdomAccounts, height: 174, content: <table className="kingdom-accounts"><thead><tr><th>{T.kingdomLabel}</th><th>{T.investmentPool}</th><th>{T.annualGdp}</th></tr></thead><tbody>{world.kingdoms.map(k=><tr key={k.id}><th><i className="swatch" style={{background:k.color}}/>{lang==='ko'?k.name:k.nameEn}</th><td><NumericValue value={k.investmentPool} format="compactMoney"/></td><td><NumericValue value={kingdomGdp(world,k.id)} format="compactMoney"/></td></tr>)}</tbody></table> }, { id: 'wealth' , title: T.wealthByClassTitle, shortTitle:lang==='ko'?'생활':'Living', height: 236, content: <>
      
        <div className="card-head">
          
          <ul className="legend">
            {series.map((s) => (
              <li key={s.key}><span className="legend-sp" style={{ color: s.color }}><ClassSprite c={s.key} size={16} /></span>{s.name}</li>
            ))}
          </ul>
        </div>
        <TimeChart data={wealthData} series={series} format={(v) => v.toFixed(0)} height={220} reference={{ y: 5, label: T.povertyLine, color: 'var(--bad)' }} />
      </> }, {id:'weather',title:T.weatherRegions,shortTitle:lang==='ko'?'기상':'Weather',height:164,content:<TimeChart data={(world.metrics??[]).map(p=>({tick:p.tick,affected:p.harvestRegions??0}))} series={[{key:'affected',name:T.weatherRegions,color:'var(--bad)'}]} format={v=>v.toFixed(0)} height={120}/>}, { id: 'rankings',shortTitle:lang==='ko'?'순위':'Ranks', title: T.rankings, height: 220, content: <>

        <div className="table-scroll"><table className="ranks">
          <thead><tr>{[['name',T.colHouse],['net',T.colNet],['levels',T.colBuildings],['profit',T.colLastWeek]].map(([key,label])=><SortHeader key={key} label={label} active={sort===key} direction={dir} onClick={()=>{setSort(key);setDir(sort===key?-dir:key==='name'?1:-1);}}/>)}</tr></thead>
          <tbody>
            {rows.map(({ c, levels, net }) => (
              <tr key={c.id} className={`${c.isPlayer ? 'me' : ''} ${viewedId === c.id ? 'selected' : ''}`}>
                <td>
                  <button className="name-link" onClick={() => onViewCompany(c.id)} aria-current={viewedId === c.id ? 'true' : undefined}>
                    <OwnerBadge company={c} world={world}/>
                  </button>
                </td>
                <td className={net < 0 ? 'neg' : ''}><NumericValue value={net} format="compactMoney"/></td>
                <td>{levels}</td>
                <td className={c.lastWeekProfit >= 0 ? 'pos' : 'neg'}><NumericValue value={c.lastWeekProfit} format="signedCompactMoney"/></td>
              </tr>
            ))}
          </tbody>
        </table></div>
      </> }, { id: 'news',shortTitle:lang==='ko'?'소식':'News', title: T.news, height: 190, content: <>
        <Notifications onEvent={onEvent} onCompany={onViewCompany} world={world} lastReadTick={lastReadTick} onRead={onRead} onJump={onJump} />
      </> }]} />
  );
}

export const BottomPanel=memo(BottomPanelView);
