import { describe, expect, it } from 'vitest';
import type { Kingdom, Region } from '@econ/sim';
import { regionLivingStandard, taxCollectionRatio } from '../src/systemMetrics';

describe('system UI metrics', () => {
  it('weights living standard by population independently of wealth', () => {
    const region = { households: { peasant: { population: 90, sol: 2, wealth: 10 }, skilled: { population: 10, sol: 8, wealth: 10 } } } as unknown as Region;
    expect(regionLivingStandard(region)).toBeCloseTo(2.6);
    expect(regionLivingStandard({ households: {} } as Region)).toBe(0);
  });
  it('uses the simulation tax curve rather than capacity divided by tax due', () => {
    expect(taxCollectionRatio({taxDue:100,taxCapacity:25,taxRatio:.6} as Kingdom)).toBe(.6);
    expect(taxCollectionRatio({taxRatio:0} as Kingdom)).toBe(0);
    expect(taxCollectionRatio({} as Kingdom)).toBe(1);
    expect(taxCollectionRatio()).toBe(1);
  });
});
