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

export type ItemType = "APPLE" | "STAR" | "SNOWFLAKE" | "PORTAL" | "COIN";

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
export const MAX_ITEM_INV = 3; // max storable apples (and future consumables)
export const TRAIL_MAX_DOTS = 14;
export const TRAIL_FADE = 0.035;
export const STAR_BEATS = 8;
export const SNOWFLAKE_BEATS = 2;
export const CHASER_SPAWN = 10; // beat number the chaser spawns on
export const CHASER_LOOK_AHEAD = 2; // anticipation depth for "evil" AI
export const COIN_SCORE = 50; // points per coin collected
export const COIN_VALUE = 1; // persistent currency earned per coin
export const SCHED_AHEAD = 0.1; // seconds the audio scheduler looks ahead
export const SCHED_TICK_MS = 25; // base scheduler poll rate at 1× speed

export const SPEED_OPTIONS = [1, 2, 3, 4, 5] as const;
export type SpeedMultiplier = (typeof SPEED_OPTIONS)[number];

export const SPEED_EMOJIS: Record<SpeedMultiplier, string> = {
  1: "🐢",
  2: "🚶",
  3: "🏃",
  4: "💨",
  5: "🚀",
};

export const SPEED_TOOLTIPS: Record<SpeedMultiplier, string> = {
  1: "1× — relaxed pace (120 BPM). One move per beat.",
  2: "2× — brisk (240 BPM). Beats arrive twice as fast.",
  3: "3× — fast (360 BPM). Three beats per second.",
  4: "4× — very fast (480 BPM). Stay sharp!",
  5: "5× — maximum (600 BPM). Pure reflex mode.",
};

export const bpmForSpeed = (speed: SpeedMultiplier) => BPM_DEFAULT * speed;
export const schedTickMsForSpeed = (speed: SpeedMultiplier) =>
  Math.max(5, Math.round(SCHED_TICK_MS / speed));

export const COLORS = {
  bg: "#0d0d1a",
  wall: "#1a1a2e",
  wallEdge: "#0d0d1a",
  floor: "#16213e",
  start: "#0f3460",
  exit: "#e94560",
  apple: "#4caf50",
  star: "#ffd700",
  snowflake: "#a8e6ff",
  portal: "#4af0ff",
  coin: "#ffb347",
  player: "#ffffff",
  playerStar: "#ffd700",
  chaser: "#e94560",
  hud: "#e0e0e0",
  overlay: "rgba(0,0,0,0.78)",
};
