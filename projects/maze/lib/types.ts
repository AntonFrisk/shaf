// ── Core game types ──────────────────────────────────────────────────────────

export interface Point {
  row: number;
  col: number;
}

export interface TeleportPair {
  id: string;
  from: Point;
  to: Point;
  color: string;
}

export interface Layout {
  /** Row-major grid: 1 = wall, 0 = floor. */
  grid: number[][];
  start: Point;
  goal: Point;
  teleports: TeleportPair[];
  width: number;
  height: number;
}

export type ItemType = "APPLE" | "STAR" | "PORTAL";

export interface Item {
  type: ItemType;
  /** PORTAL only: tile the player is sent to on entry. Absent = visual-only exit. */
  partner?: Point;
}

/** Item overlay keyed by "row,col". */
export type ItemMap = Record<string, Item>;

export enum GameState {
  TITLE = "TITLE",
  COUNTDOWN = "COUNTDOWN",
  PLAYING = "PLAYING",
  WIN = "WIN",
  LOSE = "LOSE",
}

export type Direction = "up" | "down" | "left" | "right";

// ── Tunable constants ─────────────────────────────────────────────────────────

export const BPM_DEFAULT = 120;
export const SLOWMO_FACTOR = 0.6; // apple slows BPM to 60%
export const SLOWMO_BEATS = 8;
export const STAR_BEATS = 8;
export const CHASER_SPAWN = 10; // beat number the chaser spawns on
export const CHASER_LOOK_AHEAD = 2; // anticipation depth for "evil" AI
export const SCHED_AHEAD = 0.1; // seconds the audio scheduler looks ahead
export const SCHED_TICK_MS = 25; // scheduler poll rate

export const COLORS = {
  bg: "#0d0d1a",
  wall: "#1a1a2e",
  wallEdge: "#0d0d1a",
  floor: "#16213e",
  start: "#0f3460",
  exit: "#e94560",
  apple: "#4caf50",
  star: "#ffd700",
  portal: "#4af0ff",
  player: "#ffffff",
  playerStar: "#ffd700",
  chaser: "#e94560",
  hud: "#e0e0e0",
  overlay: "rgba(0,0,0,0.78)",
};
