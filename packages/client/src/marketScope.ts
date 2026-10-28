import { GOOD_IDS, GOODS, playerCompany } from '@econ/sim';
import type { World, GoodId } from '@econ/sim';

export type MarketScope = 'world' | 'kingdom' | number;
export function validMarketScope(value: unknown, world: World): MarketScope {
  return value==='world'||value==='kingdom'?value:typeof value==='number'&&world.regions.some(r=>r.id===value)?value:'world';
}
export function scopeRegions(world: World, scope: MarketScope) {
  const kingdomId=playerCompany(world)?.kingdomId;
  return world.regions.filter(r=>scope==='world'||(scope==='kingdom'?r.kingdomId===kingdomId:r.id===scope));
}
/** Aggregate only market measurements; never fabricate a Region with unrelated population/buildings. */
export function marketOf(world: World, scope: MarketScope) {
  const regions=scopeRegions(world,scope);
  return Object.fromEntries(GOOD_IDS.map(g=>{
    const sum=(key:'volumeEma'|'supplyEma'|'demandEma'|'inventory')=>regions.reduce((n,r)=>n+r.market[g][key],0);
    const volumeEma=sum('volumeEma');
    const price=volumeEma>0?regions.reduce((n,r)=>n+r.market[g].price*r.market[g].volumeEma,0)/volumeEma:regions.length?regions.reduce((n,r)=>n+r.market[g].price,0)/regions.length:GOODS[g].basePrice;
    return [g,{price,ratio:price/GOODS[g].basePrice,volumeEma,supplyEma:sum('supplyEma'),demandEma:sum('demandEma'),inventory:sum('inventory')}];
  })) as Record<GoodId,{price:number;ratio:number;volumeEma:number;supplyEma:number;demandEma:number;inventory:number}>;
}
