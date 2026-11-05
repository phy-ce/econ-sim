import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld} from '@econ/sim';
import {ownerHoldings,OwnerHoldings} from '../src/views/OwnerHoldings';
import {setLang} from '../src/i18n';

describe('owner holdings ledger',()=>{
 it('weights profit by owned levels, reads actual payout, and sorts by that profit',()=>{
  const w=createWorld(42),owner=w.buildings.find(b=>b.typeId==='manor')!,base=w.buildings.find(b=>b.typeId==='farm')!;
  const a={...base,id:8001,stateOwned:false,level:10,owners:{[owner.id]:2},profitEma:100,payout:{reserve:0,paid:{[owner.id]:37.25}}};
  const b={...a,id:8002,owners:{[owner.id]:10},profitEma:30,payout:{reserve:0,paid:{[owner.id]:2}}};
  w.buildings=[owner,a,b];const rows=ownerHoldings(w,owner);
  expect(rows.map(r=>r.building.id)).toEqual([8002,8001]);expect(rows[1].profit).toBe(140);expect(rows[1].dividend).toBe(37.25);
  setLang('en');const html=renderToStaticMarkup(<OwnerHoldings world={w} owner={owner} onBuilding={()=>{}}/>);
  expect(html).toContain('<tfoot>');expect(html).toContain('ƒ39.25');expect(html).toContain('Weekly profit');
 });
});
