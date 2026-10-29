import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld} from '@econ/sim';
import {MarketWindow} from '../src/views/MarketWindow';
import {EconomyCharts} from '../src/views/EconomyCharts';
import {NavigationProvider} from '../src/NavigationHistory';
import {setLang} from '../src/i18n';
import type {Game} from '../src/useGame';
describe('unified market and economic charts',()=>{
 for(const scope of ['world','kingdom',1] as const)it(`uses local explorer sections for ${scope}`,()=>{setLang('ko');const world=createWorld(42);const html=renderToStaticMarkup(<NavigationProvider><MarketWindow world={world} game={{command:()=>{}} as unknown as Game} scope={scope} onScope={()=>{}} mapRegionId={1} history={[]} good="food" onGood={()=>{}} onCompany={()=>{}} onBuildings={()=>{}}/></NavigationProvider>);for(const id of ['prices','resource','sources','history'])expect(html).toContain(`data-section="${id}"`);expect(html).toContain('resource-inspector');expect(html).toContain('src-break');});
 it('shows GDP charts and a monthly-history empty state',()=>{setLang('ko');const world=createWorld(42);world.metrics=[];const html=renderToStaticMarkup(<NavigationProvider><EconomyCharts world={world}/></NavigationProvider>);expect(html).toContain('경제 규모');expect(html).toContain('1인당 연간 GDP');expect(html).toContain('월별 기록 2개');});
});
