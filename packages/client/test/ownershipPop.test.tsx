import {NavigationProvider} from '../src/NavigationHistory';
import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld} from '@econ/sim';
import {OwnershipBrowser} from '../src/views/OwnershipBrowser';
import {setLang} from '../src/i18n';
import {PopHoldings} from '../src/views/PopHoldings';
describe('ownership population destinations',()=>{
 it('values manor units independently of employment and shows a foreign kingdom',()=>{
  setLang('en');const world=createWorld(42),p=world.pops[0];
  const foreign=world.regions.find(r=>r.kingdomId!==world.regions.find(r=>r.id===p.regionId)!.kingdomId)!;
  const manor=world.buildings.find(b=>b.typeId==='manor'&&b.regionId===foreign.id)!;
  manor.nav=3.5;const owner={...p,work:0,fund:{id:[manor.id],u:[2.25]}};
  const html=renderToStaticMarkup(<PopHoldings world={world} pops={[owner]}/>);
  expect(html).toContain('Holding value');expect(html).toContain('2.25');expect(html).toContain('ƒ7.88');
  expect(html).toContain(world.kingdoms.find(k=>k.id===foreign.kingdomId)!.nameEn);
 });
 it('shows only the selected pop and after-tax income',()=>{setLang('ko');const world=createWorld(42),p=world.pops[0];p.lastIncome=123.45*p.size;const html=renderToStaticMarkup(<NavigationProvider><OwnershipBrowser world={world} initialPage={{pop:p.id}}>{()=>null}</OwnershipBrowser></NavigationProvider>);expect(html).toContain('123.45');expect(html).toContain('세후 현금 소득');expect(html).toContain('생활수준');expect(html).toContain('거주지');expect(html).toContain('이전 저장 데이터입니다');});
 it('handles a merged or missing pop without substituting another group',()=>{setLang('ko');const html=renderToStaticMarkup(<NavigationProvider><OwnershipBrowser world={createWorld(42)} initialPage={{pop:-999}}>{()=>null}</OwnershipBrowser></NavigationProvider>);expect(html).toContain('더 이상 존재하지 않습니다');expect(html).not.toContain('세후 현금 소득');});
 it('separates finance staff from investors',()=>{setLang('ko');const world=createWorld(42),b=world.buildings.find(b=>b.typeId==='finance')!;const html=renderToStaticMarkup(<NavigationProvider><OwnershipBrowser world={world} initialPage={b.id}>{()=>null}</OwnershipBrowser></NavigationProvider>);expect(html).toContain('투자자 구성');expect(html).toContain('직원 구성');expect(html).toContain('실제 고용처');});
});
