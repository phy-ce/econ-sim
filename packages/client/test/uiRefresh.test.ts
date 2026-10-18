import { describe, expect, it } from 'vitest';
import { createWorld, MAX_POINTS_PER_LEVEL_DAY, BUILDING_TYPES, GOOD_IDS, POP_CLASSES } from '@econ/sim';
import { captureConstruction, constructionActivity } from '../src/constructionActivity';
import { spriteAsset } from '../src/spriteAtlas';
import { windowTracks } from '../src/windowLayout';
describe('UI refresh invariants',()=>{
  it('keeps completed projects in daily construction totals and uses the level cap',()=>{
    const world=createWorld(42);
    const project={id:999,companyId:100,regionId:1,typeId:'farm',methodId:'',levels:2,points:5,required:100,spent:0,ticksElapsed:0};
    world.constructions=[project];
    const before=captureConstruction(world);
    project.points+=MAX_POINTS_PER_LEVEL_DAY*2;
    world.constructions=[];
    expect(constructionActivity(before,1).entries[0]).toMatchObject({id:999,points:MAX_POINTS_PER_LEVEL_DAY*2,capped:true});
    expect(constructionActivity([],2).entries).toEqual([]);
  });
  it('has distinct complete-cell sprites for goods, buildings and all regions',()=>{
    for(const b of BUILDING_TYPES) expect(spriteAsset(b.id,'building'),b.id).not.toBeNull();
    for(const g of GOOD_IDS) expect(spriteAsset(g,'goods'),g).not.toBeNull();
    for(const c of POP_CLASSES) expect(spriteAsset(`c-${c}`),c).not.toBeNull();
    for(let i=1;i<=7;i++) expect(spriteAsset(`region-${i}`)?.index).toBe(i-1);
    expect(spriteAsset('furniture','goods')?.file).not.toBe(spriteAsset('furniture','building')?.file);
    expect(spriteAsset('admin','building')?.index).not.toBe(spriteAsset('school','building')?.index);
  });
  it('provides explicit rows for all seven windows',()=>{
    expect(windowTracks(7,Array(7).fill(1),50,50).rows).toBe('repeat(4,minmax(0,1fr))');
  });
});
