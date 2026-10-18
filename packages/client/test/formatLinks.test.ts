import { describe,expect,it } from 'vitest';
import { createWorld } from '@econ/sim';
import type { GameEvent } from '@econ/sim';
import { compact,exactNumber,money,compactMoney,signedMoney,signedCompactMoney } from '../src/format';
import { eventDestination } from '../src/eventDestination';
describe('compact display with exact values',()=>{
  it('uses k/M consistently and carries rounded units',()=>{
    expect(compact(1321500)).toBe('1.3M');
    expect(compact(1200)).toBe('1.2k');
    expect(compact(-31500)).toBe('−31.5k');
    expect(compact(999999)).toBe('1M');
    expect(money(30000000)).toBe('ƒ30M');
    expect(exactNumber(1321500)).toBe('1,321,500');
    expect(exactNumber(1234.567)).toBe('1,234.567');
    for(const format of [money,compactMoney]){expect(format(.56)).toBe('ƒ0.56');expect(format(99.9)).toBe('ƒ99.90');expect(format(100)).toBe('ƒ100');expect(format(-.56)).toBe('−ƒ0.56');}
    for(const format of [signedMoney,signedCompactMoney]){expect(format(.56)).toBe('+ƒ0.56');expect(format(-.56)).toBe('−ƒ0.56');}
    expect(compact(Infinity)).toBe('—');
  });
});
describe('notification destinations',()=>{
  it('opens the referenced building before the region, and falls back when it has gone',()=>{
    const world=createWorld(42),b=world.buildings[0];
    const e:GameEvent={tick:0,text:'완공',companyId:b.companyId,regionId:b.regionId,buildingId:b.id,kind:'info'};
    expect(eventDestination(world,e)).toEqual({kind:'building',id:b.id,regionId:b.regionId});
    world.buildings=world.buildings.filter(x=>x.id!==b.id);
    expect(eventDestination(world,e)).toEqual({kind:'region',id:b.regionId});
  });
  it('routes research, finance and company-only notices without dead links',()=>{
    const world=createWorld(42),base={tick:0,kind:'info' as const,companyId:null};
    expect(eventDestination(world,{...base,text:'연구 완료'})).toEqual({kind:'research'});
    expect(eventDestination(world,{...base,text:'대출 한도'})).toEqual({kind:'finance'});
    expect(eventDestination(world,{...base,text:'소식',companyId:world.companies[0].id})).toEqual({kind:'company',id:world.companies[0].id});
    expect(eventDestination(world,{...base,text:'소식'})).toBeNull();
  });
});
