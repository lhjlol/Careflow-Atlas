/** Spatial motion is deliberately slower than the 160–360ms interface motion. */
export const spatialMotion = { focus: 1350, overview: 1050, pitch: 680, floors: 760 };

export function easeInOutCubic(progress: number): number {
  const t = Math.max(0, Math.min(1, progress));
  return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function motionDuration(duration: number): number {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : duration;
}
