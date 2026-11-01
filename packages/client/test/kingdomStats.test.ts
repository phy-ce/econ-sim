import {describe,it,expect} from 'vitest';
import {createWorld,isGovernment,isOwnerBuilding,playerCompany} from '@econ/sim';
import {kingdomStats} from '../src/kingdomStats';

describe('kingdom comparison totals',()=>{
 it('uses territorial production and net private funds without counting owner income twice',()=>{
  const world=createWorld(42),government=playerCompany(world)!;
  const region=world.regions.find(r=>r.kingdomId===government.kingdomId)!;
  const producer=world.buildings.find(b=>!isOwnerBuilding(b.typeId)&&!isGovernment(b.typeId)&&b.typeId!=='subsistence')!;
  const owner=world.buildings.find(b=>isOwnerBuilding(b.typeId))!;
  world.buildings=[producer,owner];
  for(const b of world.buildings)b.regionId=region.id;
  producer.stateOwned=true;producer.profitEma=2;owner.profitEma=1000;
  const privateCompany=world.companies.find(c=>!c.state&&c.kingdomId===government.kingdomId)!;
  privateCompany.cash=100;privateCompany.debt=25;
  const data=kingdomStats(world,government.kingdomId);
  expect(data.profit).toBe(14);
  expect(data.levels).toBe(producer.level);
  expect(data.parts.royal).toBe(producer.level);
  expect(Object.values(data.parts).reduce((n,v)=>n+v,0)).toBe(data.levels);
  expect(Object.values(data.employment).reduce((n,v)=>n+v,0)).toBeCloseTo(data.employed);
  expect(Object.values(data.profits).reduce((n,v)=>n+v,0)).toBeCloseTo(data.profit);
  expect(data.privateFunds).toBe(75);
 });
});
