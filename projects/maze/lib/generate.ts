import { key, samePoint } from "./grid";
import { isSolvable } from "./validate";
import { ItemMap, Layout, Point } from "./types";

export interface GeneratedMaze {
  layout: Layout;
  items: ItemMap;
}

const PORTAL_COLOR = "#4af0ff";

/**
 * Carve a "perfect" maze with a randomized recursive backtracker, then scatter
 * power-ups and a teleport pair. Size is forced odd so the wall/passage lattice
 * works out (e.g. 15, 21, 31). The result is always solvable because the carved
 * maze is fully connected and items never block tiles.
 */
export function generateMaze(size = 15): GeneratedMaze {
  const n = size % 2 === 0 ? size + 1 : size;
  const grid: number[][] = Array.from({ length: n }, () => Array<number>(n).fill(1));

  const inBounds = (r: number, c: number) => r > 0 && r < n - 1 && c > 0 && c < n - 1;
  const carve = (r: number, c: number) => {
    grid[r][c] = 0;
    for (const [dr, dc] of shuffle([
      [-2, 0],
      [2, 0],
      [0, -2],
      [0, 2],
    ])) {
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(nr, nc) && grid[nr][nc] === 1) {
        grid[r + dr / 2][c + dc / 2] = 0; // knock out the wall between cells
        carve(nr, nc);
      }
    }
  };
  carve(1, 1);

  const start: Point = { row: 1, col: 1 };
  const goal: Point = { row: n - 2, col: n - 2 };

  const layout: Layout = { grid, start, goal, teleports: [], width: n, height: n };

  // Collect candidate floor tiles, excluding start/goal.
  const floors: Point[] = [];
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const p = { row: r, col: c };
      if (grid[r][c] === 0 && !samePoint(p, start) && !samePoint(p, goal)) floors.push(p);
    }
  }
  shuffle(floors);

  const items: ItemMap = {};
  let i = 0;
  const take = () => floors[i++];

  // One teleport pair (two PORTAL tiles linked both ways).
  if (floors.length - i >= 2) {
    const a = take();
    const b = take();
    layout.teleports.push({ id: "blue", from: a, to: b, color: PORTAL_COLOR });
    layout.teleports.push({ id: "blue", from: b, to: a, color: PORTAL_COLOR });
    items[key(a)] = { type: "PORTAL", partner: b };
    items[key(b)] = { type: "PORTAL", partner: a };
  }

  // Scale power-ups with maze size.
  const appleCount = Math.max(2, Math.floor(n / 5));
  const starCount = Math.max(1, Math.floor(n / 12));
  const snowflakeCount = Math.max(1, Math.floor(n / 15));
  for (let k = 0; k < appleCount && i < floors.length; k++) items[key(take())] = { type: "APPLE" };
  for (let k = 0; k < starCount && i < floors.length; k++) items[key(take())] = { type: "STAR" };
  for (let k = 0; k < snowflakeCount && i < floors.length; k++) items[key(take())] = { type: "SNOWFLAKE" };

  // Belt-and-braces: carved mazes are always solvable, but assert it.
  if (!isSolvable(layout)) return generateMaze(size);

  return { layout, items };
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
