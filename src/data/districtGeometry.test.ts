import { describe, expect, it } from 'vitest';
import geometry from './districtGeometry.json';
import baseline from './demoGeometry.json';

describe('expanded district geometry', () => {
  it('preserves source provenance and closed distinct footprints within the demo district', () => {
    expect(geometry.source).toBe(baseline.source);
    expect(geometry.buildings).toHaveLength(16);
    const rings = new Set(baseline.buildings.map(b => JSON.stringify(b.footprint)));
    geometry.buildings.forEach((b, i) => {
      expect(b.id).toBe(`district-${String(i + 1).padStart(2, '0')}`);
      expect(b.sourceFeatureId).toBeGreaterThan(0);
      expect(b.footprint[0]).toEqual(b.footprint.at(-1));
      expect(rings.has(JSON.stringify(b.footprint))).toBe(false);
      rings.add(JSON.stringify(b.footprint));
      expect(b.coordinates.lng).toBeGreaterThan(114.1388);
      expect(b.coordinates.lng).toBeLessThan(114.1444);
      expect(b.coordinates.lat).toBeGreaterThan(22.2842);
      expect(b.coordinates.lat).toBeLessThan(22.2884);
      let inside = false;
      for (let i = 0, j = b.footprint.length - 1; i < b.footprint.length; j = i++) {
        const p = b.footprint[i], q = b.footprint[j];
        if ((p[1] > b.coordinates.lat) !== (q[1] > b.coordinates.lat) && b.coordinates.lng < (q[0] - p[0]) * (b.coordinates.lat - p[1]) / (q[1] - p[1]) + p[0]) inside = !inside;
      }
      expect(inside).toBe(true);
    });
  });
});
