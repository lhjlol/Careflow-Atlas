import { describe, it, expect } from 'vitest';
import { buildingFeatures, districtBounds, visibleDistrictLabels, floorFeatures, footprintOf, FLOOR_HEIGHT, type MapBuilding } from './mapModel';

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
  it('pads the declared footprint bounds rather than substituting a default rectangle', () => {
    const custom = { ...building, footprint: [[114.14, 22.28], [114.142, 22.28], [114.142, 22.282], [114.14, 22.282], [114.14, 22.28]] };
    const padded = footprintOf(custom, 1);
    expect(padded[0][0]).toBeLessThan(114.14);
    expect(padded[0][1]).toBeLessThan(22.28);
    expect(padded[2][0]).toBeGreaterThan(114.142);
    expect(padded[2][1]).toBeGreaterThan(22.282);
  });
  it('never intersects slabs across the full supported floor count, including interrupted transitions', () => {
    const tall = { ...building, floors: Array.from({ length: 100 }, (_, index) => ({ ...building.floors[0], id: `tall-${index}`, level: index + 1 })) };
    for (const progress of [0, .02, .1, .16, .3, .75, .4, .05, 0, 1]) {
      const features = floorFeatures(tall, progress).features;
      features.forEach((floor, index) => {
        expect(Number.isFinite(floor.properties!.height)).toBe(true);
        if (index) expect(floor.properties!.base - features[index - 1].properties!.height).toBeGreaterThan(.34);
      });
    }
  });
});


describe('district overview', () => {
  it('frames all declared footprint corners, not only building centres', () => {
    const wide = { ...building, id: 'wide', footprint: [[114.14, 22.28], [114.15, 22.28], [114.15, 22.29], [114.14, 22.29], [114.14, 22.28]] };
    expect(districtBounds([building, wide])).toEqual([[114.14, 22.28], [114.15, 22.29]]);
    expect(districtBounds([])).toBeUndefined();
  });
  it('declutters overlapping names while keeping separated labels and respecting controls', () => {
    const labels = [
      { id: 'first', x: 160, y: 240, width: 100 },
      { id: 'overlap', x: 170, y: 245, width: 100 },
      { id: 'next', x: 280, y: 240, width: 100 },
      { id: 'offscreen', x: -10, y: 210, width: 100 },
      { id: 'tools', x: 550, y: 240, width: 70 },
      { id: 'footer', x: 300, y: 495, width: 100 },
      { id: 'header', x: 160, y: 100, width: 100 },
    ];
    expect([...visibleDistrictLabels(labels, 600, 540)]).toEqual(['first', 'next']);
  });
});
