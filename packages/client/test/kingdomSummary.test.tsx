import React from 'react';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {createWorld,isGovernment,isOwnerBuilding,playerCompany} from '@econ/sim';
import {KingdomSummary} from '../src/views/CompanyPanel';
describe('kingdom production summary',()=>{
 it('excludes government and owner institution profit from weekly production profit',()=>{
  const world=createWorld(42),government=playerCompany(world)!;
  const region=world.regions.find(r=>r.kingdomId===government.kingdomId)!;
  const owner=world.buildings.find(b=>isOwnerBuilding(b.typeId))!;
  const admin=world.buildings.find(b=>isGovernment(b.typeId))!;
  const producer=world.buildings.find(b=>!isOwnerBuilding(b.typeId)&&!isGovernment(b.typeId))!;
  world.buildings=[owner,admin,producer];
  for(const b of world.buildings)b.regionId=region.id;
  owner.profitEma=1000;admin.profitEma=100;producer.profitEma=2;
  const html=renderToStaticMarkup(<KingdomSummary world={world} government={government}/>);
  expect(html).toContain('+ƒ14.00');
  expect(html).not.toContain('+ƒ7,714.00');
 });
});
