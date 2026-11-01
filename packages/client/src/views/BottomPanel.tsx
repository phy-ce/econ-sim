import {KingdomEconomy,KingdomComparison} from './KingdomEconomy';
import {OwnershipAssets} from './OwnershipAssets';
import {t as uiCopy} from '../i18n';
import {EconomyCharts} from './EconomyCharts';
import {memo} from 'react';
import { PopTable, type PopRequest } from './PopTable';
import type { Game } from '../useGame';
import {KingdomSummary} from './CompanyPanel';
import { playerCompany, companyById } from '@econ/sim';
import { SectionStack } from './SectionStack';
import {useMemo} from 'react';
import {POP_CLASSES} from '@econ/sim';
import type { HistoryPoint, World, GameEvent,GoodId } from '@econ/sim';
import { TimeChart } from './Chart';
import { Notifications } from './Notifications';
import { ClassSprite } from '../sprites';
import { CLASS_COLOR } from '../ui';
import {className,useT} from '../i18n';

function BottomPanelView({ world, history, lastReadTick, onRead, onJump, viewedId, onViewCompany, game, onEvent, popRequest, onBuilding,onGood }: {onGood?:(g:GoodId)=>void;
  popRequest:PopRequest|null; onBuilding:(id:number)=>void;
  onEvent:(event:GameEvent)=>void; game:Game; world: World; history: HistoryPoint[];
  lastReadTick: number; onRead: () => void; onJump: (regionId: number) => void;
  viewedId: number | null; onViewCompany: (companyId: number) => void;
}) {
  const T = useT();
  const me=playerCompany(world);
  const viewed=viewedId!==null?companyById(world,viewedId):me;
  const wealthData = useMemo(() => history.map((p) => ({ tick: p.tick, ...p.sol })), [history]);
  const series = POP_CLASSES.map((c) => ({ key: c, name: className(c), color: CLASS_COLOR[c] }));

  return (
    <SectionStack explorer revealId={popRequest?'pops':'company'} revealKey={popRequest?.sequence??viewedId} storageKey="trends-v2" items={[
      {id:'economy',shortTitle:uiCopy().screenText['trends'],title:uiCopy().screenText['economicPopulationAndFiscalTrends'],height:520,content:<EconomyCharts world={world}/>},
      ...(me?[{id:'summary',shortTitle:uiCopy().screenText['summary'],title:T.kingdomSummary,height:220,content:<KingdomSummary world={world} government={me}/>}]:[]),
      {id:'pops',shortTitle:uiCopy().screenText['pops'],title:T.popList,height:360,content:<PopTable world={world} request={popRequest} onRegion={onJump} onBuilding={onBuilding}/>},
      ...(viewed?[{id:'company',shortTitle:T.kingdomEconomy,title:T.kingdomEconomy,height:520,content:<KingdomEconomy world={world} id={viewed.kingdomId} onSelect={id=>{const k=world.kingdoms.find(k=>k.id===id);if(k)onViewCompany(k.governmentId);}} onBuilding={onBuilding}/>}]:[]),
      {id:'kingdoms',shortTitle:T.kingdomCompare,title:T.kingdomCompare,height:300,content:<KingdomComparison world={world} onSelect={id=>{const k=world.kingdoms.find(k=>k.id===id);if(k)onViewCompany(k.governmentId);}}/>}, {id:'assets',title:T.assetsTitle,shortTitle:T.assetsTitle,height:360,content:<OwnershipAssets world={world}/>}, { id: 'wealth' , title: T.wealthByClassTitle, shortTitle:uiCopy().screenText['living'], height: 236, content: <>
      
        <div className="card-head">
          
          <ul className="legend">
            {series.map((s) => (
              <li key={s.key}><span className="legend-sp" style={{ color: s.color }}><ClassSprite c={s.key} size={24} /></span>{s.name}</li>
            ))}
          </ul>
        </div>
        <TimeChart data={wealthData} series={series} format={(v) => v.toFixed(0)} height={220} reference={{ y: 5, label: T.povertyLine, color: 'var(--bad)' }} />
      </> }, {id:'weather',title:T.weatherRegions,shortTitle:uiCopy().screenText['weather'],height:164,content:<TimeChart data={(world.metrics??[]).map(p=>({tick:p.tick,affected:p.harvestRegions??0}))} series={[{key:'affected',name:T.weatherRegions,color:'var(--bad)'}]} format={v=>v.toFixed(0)} height={120}/>}, { id: 'news',shortTitle:uiCopy().screenText['news'], title: T.news, height: 190, content: <>
        <Notifications onEvent={onEvent} onCompany={onViewCompany} world={world} lastReadTick={lastReadTick} onRead={onRead} onJump={onJump} />
      </> }]} />
  );
}

export const BottomPanel=memo(BottomPanelView);
