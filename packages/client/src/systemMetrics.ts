import {isLowerJob} from '@econ/sim';
import type { Kingdom, Region,World } from '@econ/sim';

export function lowerJobUnemployment(world:World,regionId:number):number{
 let total=0,idle=0;
 for(const p of world.pops){
  if(p.regionId!==regionId||!isLowerJob(p.prof))continue;
  total+=p.size;if(p.work===0)idle+=p.size;
 }
 return total>0?idle/total:0;
}

export function regionLivingStandard(region: Region): number {
  const households = Object.values(region.households);
  const population = households.reduce((sum, h) => sum + h.population, 0);
  return population > 0 ? households.reduce((sum, h) => sum + h.population * h.sol, 0) / population : 0;
}

export function taxCollectionRatio(kingdom?: Kingdom): number {
  return kingdom?.taxRatio ?? 1;
}


