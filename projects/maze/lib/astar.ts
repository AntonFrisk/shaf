import { isWalkable, teleportDest } from "./grid";
import { Layout, Point } from "./types";

export interface StepResult {
  next: Point | null;
  path: Point[];
  distance: number;
  blocked: boolean;
}

const DIRS: Point[] = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

function sign(v: number): number {
  return v < 0 ? -1 : 1;
}

function manhattan(a: Point, b: Point): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

/**
 * The "evil" factor: project the player a few steps along their current
 * direction so the chaser cuts them off instead of trailing. Ported from path.go.
 */
function anticipate(layout: Layout, player: Point, chaser: Point, steps: number): Point {
  let dr = player.row - chaser.row;
  let dc = player.col - chaser.col;
  if (dr === 0 && dc === 0) return player;
  if (dr !== 0) dr = sign(dr);
  if (dc !== 0) dc = sign(dc);
  let t = player;
  for (let i = 0; i < steps; i++) {
    const n: Point = { row: t.row + dr, col: t.col + dc };
    if (isWalkable(layout, n)) t = n;
  }
  return t;
}

interface ANode {
  p: Point;
  g: number;
  f: number;
}

/** Minimal binary min-heap keyed on f-score; grids are small so this is ample. */
class MinHeap {
  private data: ANode[] = [];
  get size() {
    return this.data.length;
  }
  push(n: ANode) {
    this.data.push(n);
    let i = this.data.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.data[parent].f <= this.data[i].f) break;
      [this.data[parent], this.data[i]] = [this.data[i], this.data[parent]];
      i = parent;
    }
  }
  pop(): ANode {
    const top = this.data[0];
    const last = this.data.pop()!;
    if (this.data.length) {
      this.data[0] = last;
      let i = 0;
      const n = this.data.length;
      for (;;) {
        const l = 2 * i + 1;
        const r = 2 * i + 2;
        let smallest = i;
        if (l < n && this.data[l].f < this.data[smallest].f) smallest = l;
        if (r < n && this.data[r].f < this.data[smallest].f) smallest = r;
        if (smallest === i) break;
        [this.data[smallest], this.data[i]] = [this.data[i], this.data[smallest]];
        i = smallest;
      }
    }
    return top;
  }
}

function astar(layout: Layout, start: Point, goal: Point): { path: Point[]; dist: number; ok: boolean } {
  if (!isWalkable(layout, start) || !isWalkable(layout, goal)) {
    return { path: [], dist: 0, ok: false };
  }
  const key = (p: Point) => p.row * layout.width + p.col;
  const open = new MinHeap();
  open.push({ p: start, g: 0, f: manhattan(start, goal) });

  const cameFrom = new Map<number, Point>();
  const gScore = new Map<number, number>([[key(start), 0]]);
  const closed = new Set<number>();

  while (open.size > 0) {
    const cur = open.pop();
    const ck = key(cur.p);
    if (closed.has(ck)) continue;
    closed.add(ck);
    if (cur.p.row === goal.row && cur.p.col === goal.col) {
      return { path: rebuild(cameFrom, key, start, goal), dist: cur.g, ok: true };
    }
    for (const d of DIRS) {
      let next: Point = { row: cur.p.row + d.row, col: cur.p.col + d.col };
      if (!isWalkable(layout, next)) continue;
      const tp = teleportDest(layout, next);
      if (tp) next = tp;
      const nk = key(next);
      if (closed.has(nk)) continue;
      const tentative = cur.g + 1;
      const prev = gScore.get(nk);
      if (prev !== undefined && tentative >= prev) continue;
      cameFrom.set(nk, cur.p);
      gScore.set(nk, tentative);
      open.push({ p: next, g: tentative, f: tentative + manhattan(next, goal) });
    }
  }
  return { path: [], dist: 0, ok: false };
}

function rebuild(cameFrom: Map<number, Point>, key: (p: Point) => number, start: Point, goal: Point): Point[] {
  const path: Point[] = [goal];
  let cur = goal;
  while (cur.row !== start.row || cur.col !== start.col) {
    const prev = cameFrom.get(key(cur));
    if (!prev) return [];
    path.unshift(prev);
    cur = prev;
  }
  return path;
}

/** Next tile for the chaser this beat, with optional anticipation. Ported from NextStep. */
export function nextStep(layout: Layout, chaser: Point, player: Point, lookAhead = 0): StepResult {
  const target = lookAhead > 0 ? anticipate(layout, player, chaser, lookAhead) : player;
  const { path, dist, ok } = astar(layout, chaser, target);
  if (!ok || path.length < 2) {
    return { next: null, path: [], distance: dist, blocked: true };
  }
  return { next: path[1], path, distance: dist, blocked: false };
}
