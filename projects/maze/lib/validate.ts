import { isWalkable, samePoint } from "./grid";
import { Layout, Point } from "./types";

const DIRS: Point[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

/**
 * BFS solvability check — does an unblocked path exist from start to goal?
 * Ported from maze/validate.go. Honors teleports as one-way edges.
 */
export function isSolvable(layout: Layout): boolean {
  if (!isWalkable(layout, layout.start) || !isWalkable(layout, layout.goal)) {
    return false;
  }
  const seen = new Set<number>();
  const idx = (p: Point) => p.row * layout.width + p.col;
  const queue: Point[] = [layout.start];
  seen.add(idx(layout.start));

  while (queue.length) {
    const cur = queue.shift()!;
    if (samePoint(cur, layout.goal)) return true;
    for (const d of DIRS) {
      let next: Point = { row: cur.row + d.row, col: cur.col + d.col };
      if (!isWalkable(layout, next)) continue;
      // Follow teleport edges so the goal can sit behind a portal.
      for (const t of layout.teleports) {
        if (t.from.row === next.row && t.from.col === next.col) {
          next = { ...t.to };
          break;
        }
      }
      if (seen.has(idx(next))) continue;
      seen.add(idx(next));
      queue.push(next);
    }
  }
  return false;
}
