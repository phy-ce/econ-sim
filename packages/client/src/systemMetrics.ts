import type { Kingdom, Region } from '@econ/sim';

export function regionLivingStandard(region: Region): number {
  const households = Object.values(region.households);
  const population = households.reduce((sum, h) => sum + h.population, 0);
  return population > 0 ? households.reduce((sum, h) => sum + h.population * h.sol, 0) / population : 0;
}

export function taxCollectionRatio(kingdom?: Kingdom): number {
  return kingdom?.taxRatio ?? 1;
}


