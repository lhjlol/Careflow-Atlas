import { describe, it, expect } from 'vitest';
import { buildingFeatures, floorFeatures, footprintOf, FLOOR_HEIGHT, type MapBuilding } from './mapModel';

const building: MapBuilding = {
  id: 'test', name: 'Synthetic', longitude: 114.1418, latitude: 22.2863, color: '#aaa', status: 'unknown',
  floors: Array.from({ length: 8 }, (_, index) => ({ id: `f${index + 1}`, label: `${index + 1}F`, level: index + 1, hasFollowUp: index === 4, recorded: 0, total: 4 })),
};
describe('spatial adapter', () => {
  it('keeps an exploded building anchored to the same geographical footprint', () => {
    const closed = floorFeatures(building, 0);
    const open = floorFeatures(building, 1);
    expect(open.features.map(f => f.geometry)).toEqual(closed.features.map(f => f.geometry));
    expect(open.features[0].geometry.coordinates[0][0]).toEqual(open.features[0].geometry.coordinates[0].at(-1));
    expect(open.features[7].properties!.base).toBeGreaterThan(closed.features[7].properties!.height);
  });
  it('keeps finite ordered floor slabs with positive height throughout animation', () => {
    for (const t of [0, .2, .4, .6, .8, 1]) {
      const features = floorFeatures(building, t).features;
      features.forEach((f, i) => {
        expect(f.properties!.height).toBeGreaterThan(f.properties!.base);
        expect(f.properties!.height - f.properties!.base).toBeCloseTo(FLOOR_HEIGHT - .35);
        if (i) expect(f.properties!.base).toBeGreaterThan(features[i - 1].properties!.height);
      });
    }
  });
  it('isolates selected building geometry so the shell and floors do not double render', () => {
    expect(buildingFeatures([building], building.id).features).toHaveLength(0);
    expect(floorFeatures(undefined, 1).features).toHaveLength(0);
    expect(footprintOf(building)[0][0]).toBeLessThan(building.longitude);
    expect(footprintOf(building)[2][0]).toBeGreaterThan(building.longitude);
  });
});
