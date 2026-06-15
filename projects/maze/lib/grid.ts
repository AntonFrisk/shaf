import { Direction, Layout, Point } from "./types";

const DELTA: Record<Direction, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

export function key(p: Point): string {
  return `${p.row},${p.col}`;
}

export function samePoint(a: Point, b: Point): boolean {
  return a.row === b.row && a.col === b.col;
}

/** A floor tile inside the grid bounds. */
export function isWalkable(layout: Layout, p: Point): boolean {
  if (p.row < 0 || p.row >= layout.height || p.col < 0 || p.col >= layout.width) {
    return false;
  }
  return layout.grid[p.row][p.col] === 0;
}

export function step(p: Point, dir: Direction): Point {
  const [dr, dc] = DELTA[dir];
  return { row: p.row + dr, col: p.col + dc };
}

/** If a teleport entry sits on `p`, return its destination (ported from grid.go). */
export function teleportDest(layout: Layout, p: Point): Point | null {
  for (const t of layout.teleports) {
    if (t.from.row === p.row && t.from.col === p.col) return { ...t.to };
  }
  return null;
}
