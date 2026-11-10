export type Gesture = 'left' | 'right' | 'up' | 'down' | null;
export type Point = { x: number; y: number };
export function detectGesture(start: Point, end: Point, minDistance = 65): Gesture {
  const dx = end.x - start.x, dy = end.y - start.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < minDistance) return null;
  if (Math.abs(dx) > Math.abs(dy) * 1.25) return dx < 0 ? 'left' : 'right';
  if (Math.abs(dy) > Math.abs(dx) * 1.25) return dy < 0 ? 'up' : 'down';
  return null;
}
