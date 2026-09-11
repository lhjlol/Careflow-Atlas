import type { Building, OutreachSnapshot } from '../domain/types';
import geometry from './demoGeometry.json';

/** Upgrade only the exact bundled demo locations, never geocode imported records. */
export function alignDemoBuilding(building: Building): Building {
  if (!building.isSynthetic || building.footprint) return building;
  const match = geometry.buildings.find(item => item.id === building.id && item.name === building.name && item.address === building.address);
  if (!match || ![match.legacyCoordinates, match.coordinates].some(point =>
    Math.abs(point.lng - building.coordinates.lng) < 1e-9 && Math.abs(point.lat - building.coordinates.lat) < 1e-9)) return building;
  return { ...building, coordinates: { ...match.coordinates }, footprint: match.footprint.map(point => [...point]) };
}

export function alignDemoSnapshot(snapshot: OutreachSnapshot): OutreachSnapshot {
  return { ...snapshot, buildings: snapshot.buildings.map(alignDemoBuilding) };
}
