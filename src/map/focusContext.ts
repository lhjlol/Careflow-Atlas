import type { ExpressionSpecification } from 'maplibre-gl';
import type { MapBuilding } from './mapModel';

/** Position/bounds used to open a viewing corridor through foreground context. */
export function contextPosition(ring: number[][], focus: MapBuilding) {
  const metresX = 111320 * Math.cos(focus.latitude * Math.PI / 180);
  const xs = ring.map(point => (point[0] - focus.longitude) * metresX);
  const ys = ring.map(point => (point[1] - focus.latitude) * 111320);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return { east: (minX + maxX) / 2, north: (minY + maxY) / 2, radius: Math.hypot(maxX - minX, maxY - minY) / 2 };
}

/** Camera-relative cutaway, evaluated by MapLibre as bearing changes.
 * Leave ground footprints visible; the target itself never uses this expression.
 * The conservative corridor includes footprint bounds, so wide/merged polygons
 * are not classified using their centre alone. Its edge blends over 20 metres.
 */
export const focusHeight: ExpressionSpecification = ['let',
  'angle', ['*', ['number', ['global-state', 'focusBearing'], 0], Math.PI / 180],
  ['let',
  'side', ['-', ['*', ['get', 'east'], ['cos', ['var', 'angle']]], ['*', ['get', 'north'], ['sin', ['var', 'angle']]]],
  'front', ['-', 0, ['+', ['*', ['get', 'east'], ['sin', ['var', 'angle']]], ['*', ['get', 'north'], ['cos', ['var', 'angle']]]]],
  ['let',
  'facing', ['min', 1, ['max', 0, ['/', ['+', ['var', 'front'], ['get', 'radius'], 10], 20]]],
  'corridor', ['min', 1, ['max', 0, ['/', ['-', ['+', 48, ['get', 'radius']], ['abs', ['var', 'side']]], 20]]],
  ['let',
  'cut', ['*', ['var', 'facing'], ['var', 'corridor']],
  ['+', ['*', ['get', 'height'], ['-', 1, ['var', 'cut']]], ['*', ['min', 2, ['get', 'height']], ['var', 'cut']]],
]]]];
