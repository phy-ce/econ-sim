import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BUILDING_TYPES, createWorld, harvestCondition, harvestLabel } from '@econ/sim';
import { HarvestBadge } from '../src/views/HarvestBadge';

describe('harvest UI', () => {
  it('shows the simulation label and only marks affected building land', () => {
    const world = createWorld(42);
    let regionId = 0;
    for (let tick = 90; tick <= 7200 && !regionId; tick += 90) {
      world.tick = tick;
      regionId = world.regions.find(r => harvestCondition(world, r.id))?.id ?? 0;
    }
    expect(regionId).toBeGreaterThan(0);
    const condition = harvestCondition(world, regionId)!;
    const markup = renderToStaticMarkup(<HarvestBadge world={world} regionId={regionId}/>);
    expect(markup).toContain(harvestLabel(world, regionId)!);
    const affected = BUILDING_TYPES.find(b => b.land && condition.lands.includes(b.land))!;
    expect(renderToStaticMarkup(<HarvestBadge world={world} regionId={regionId} typeId={affected.id}/>)).toContain(`−${Math.round(condition.cut*100)}%`);
    for (const typeId of ['school','admin']) {
      expect(renderToStaticMarkup(<HarvestBadge world={world} regionId={regionId} typeId={typeId}/>)).toBe('');
    }
  });
});
