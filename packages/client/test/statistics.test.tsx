import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld} from '@econ/sim';
import {EconomyCharts} from '../src/views/EconomyCharts';
import {BottomPanel} from '../src/views/BottomPanel';
import {NavigationProvider} from '../src/NavigationHistory';
describe('statistics navigation and chart groups',()=>{
 for(const [group,count] of [['economy',3],['living',4],['finance',3]] as const)it(`${group} keeps its metric sections together`,()=>{
  const html=renderToStaticMarkup(<EconomyCharts world={createWorld(42)} group={group}/>);
  expect(html.match(/data-chart=/g)).toHaveLength(count);
  if(group==='living'){expect(html).toContain('data-chart="classes"');expect(html).toContain('data-chart="rates"');}
 });
 it('opens incoming kingdom links in comparison without the old pop/news sections',()=>{
  const world=createWorld(42),html=renderToStaticMarkup(<NavigationProvider><BottomPanel world={world} kingdomId={world.kingdoms[1].id} onViewKingdom={()=>{}} onBuilding={()=>{}}/></NavigationProvider>);
  expect(html).toContain('kingdom-comparison');expect(html).not.toContain('trends-v2');expect(html).not.toContain('notice-timeline');expect(html).not.toContain('pop-table');
 });
});
