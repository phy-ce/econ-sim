import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld} from '@econ/sim';
import {OwnershipBrowser} from '../src/views/OwnershipBrowser';
import {setLang} from '../src/i18n';
describe('ownership population destinations',()=>{
 it('shows only the selected pop and after-tax income',()=>{setLang('ko');const world=createWorld(42),p=world.pops[0];p.lastIncome=123.45;const html=renderToStaticMarkup(<OwnershipBrowser world={world} initialPage={{pop:p.id}}>{()=>null}</OwnershipBrowser>);expect(html).toContain('123.45');expect(html).toContain('세후 현금 소득');expect(html).toContain('생활수준');expect(html).toContain('거주지');expect(html).toContain('이전 저장 데이터입니다');});
 it('handles a merged or missing pop without substituting another group',()=>{setLang('ko');const html=renderToStaticMarkup(<OwnershipBrowser world={createWorld(42)} initialPage={{pop:-999}}>{()=>null}</OwnershipBrowser>);expect(html).toContain('더 이상 존재하지 않습니다');expect(html).not.toContain('세후 현금 소득');});
 it('separates finance staff from investors',()=>{setLang('ko');const world=createWorld(42),b=world.buildings.find(b=>b.typeId==='finance')!;const html=renderToStaticMarkup(<OwnershipBrowser world={world} initialPage={b.id}>{()=>null}</OwnershipBrowser>);expect(html).toContain('투자자 구성');expect(html).toContain('직원 구성');expect(html).toContain('실제 고용처');});
});
