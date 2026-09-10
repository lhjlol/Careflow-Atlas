import type { FeatureCollection, Polygon } from 'geojson';

/** Only spatial geometry and display summaries cross into the map. No people or notes. */
export interface MapFloor {
  id: string; label: string; level: number; hasFollowUp: boolean; recorded: number; total: number;
}
export interface MapBuilding {
  id: string; name: string; longitude: number; latitude: number;
  footprint?: number[][]; floors: MapFloor[]; status: string; color: string;
}

export const DISTRICT_CAMERA = { center: [114.14175, 22.2865] as [number, number], zoom: 16.5, pitch: 0, bearing: -12 };
export const FLOOR_HEIGHT = 3.2;
export const FLOOR_GAP = 3.5;

/** Declared synthetic geometry only; not an indoor survey or inferred subdivision. */
export function footprintOf(building: MapBuilding, paddingMetres = 0): number[][] {
  if (building.footprint && !paddingMetres) return building.footprint;
  const halfWidth = (13 + paddingMetres) / (111320 * Math.cos(building.latitude * Math.PI / 180));
  const halfDepth = (10 + paddingMetres) / 111320;
  return [
    [building.longitude - halfWidth, building.latitude - halfDepth],
    [building.longitude + halfWidth, building.latitude - halfDepth],
    [building.longitude + halfWidth, building.latitude + halfDepth],
    [building.longitude - halfWidth, building.latitude + halfDepth],
    [building.longitude - halfWidth, building.latitude - halfDepth],
  ];
}

export function floorFeatures(building: MapBuilding | undefined, separation: number, selectedFloorId?: string): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: building?.floors.map((floor, index) => {
      // Later floors begin a little later, while keeping the total motion under a second.
      const local = Math.max(0, Math.min(1, (separation - index * 0.018) / (1 - index * 0.018)));
      const gap = local * FLOOR_GAP;
      const base = index * (FLOOR_HEIGHT + gap) + 0.3;
      return {
        type: 'Feature', id: floor.id,
        geometry: { type: 'Polygon', coordinates: [footprintOf(building)] },
        properties: {
          id: floor.id, label: floor.label, base, height: base + FLOOR_HEIGHT - 0.35,
          color: selectedFloorId === floor.id ? '#e0a33e' : floor.hasFollowUp ? '#d4a35e' : floor.recorded > 0 ? '#78a899' : '#c8d5d0',
          selected: selectedFloorId === floor.id,
        },
      };
    }) ?? [],
  };
}

export function buildingFeatures(buildings: MapBuilding[], selectedId?: string): FeatureCollection<Polygon> {
  return { type: 'FeatureCollection', features: buildings.filter(b => b.id !== selectedId).map(b => ({
    type: 'Feature', id: b.id, properties: { id: b.id, color: b.color, height: Math.max(8, b.floors.length * FLOOR_HEIGHT) },
    geometry: { type: 'Polygon', coordinates: [footprintOf(b)] },
  })) };
}
