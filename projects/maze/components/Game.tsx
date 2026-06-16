"use client";

import { useEffect, useRef, useState } from "react";
import { nextStep } from "@/lib/astar";
import { BeatEngine } from "@/lib/beat";
import { generateMaze } from "@/lib/generate";
import { isWalkable, key, samePoint, step } from "@/lib/grid";
import { loadHighScore, loadCoins, loadUpgrades, saveHighScore, addCoins, buyUpgrade } from "@/lib/storage";
import { UPGRADES, upgradeCost } from "@/lib/upgrades";
import type { UpgradeLevels } from "@/lib/upgrades";
import {
  CHASER_LOOK_AHEAD,
  CHASER_SPAWN,
  COLORS,
  COIN_SCORE,
  COIN_VALUE,
  Direction,
  GameState,
  Item,
  ItemMap,
  Layout,
  Point,
  SLOWMO_BEATS,
  SLOWMO_FACTOR,
  SPEED_EMOJIS,
  SPEED_OPTIONS,
  SPEED_TOOLTIPS,
  STAR_BEATS,
  SNOWFLAKE_BEATS,
  SpeedMultiplier,
} from "@/lib/types";

const KEY_MAP: Record<string, Direction> = {
  ArrowUp: "up", w: "up", W: "up",
  ArrowDown: "down", s: "down", S: "down",
  ArrowLeft: "left", a: "left", A: "left",
  ArrowRight: "right", d: "right", D: "right",
};

const SIZES = [15, 21, 31];

interface Mutable {
  state: GameState;
  layout: Layout;
  items: ItemMap;
  playerPos: Point;
  score: number;
  highScore: number;
  coins: number;
  runCoins: number;
  upgrades: UpgradeLevels;
  slowLeft: number;
  starLeft: number;
  starActive: boolean;
  freezeLeft: number;
  countdownVal: number;
  pendingInput: Direction | null;
  chaserActive: boolean;
  chaserEliminated: boolean;
  chaserPos: Point;
  chaserVisual: { x: number; y: number };
  cellSize: number;
}

interface GameProps {
  onBack?: () => void;
}

export default function Game({ onBack }: GameProps = {}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardAreaRef = useRef<HTMLDivElement>(null);
  const beatRef = useRef<BeatEngine | null>(null);
  const gRef = useRef<Mutable | null>(null);
  const rafRef = useRef<number>(0);
  const countdownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const playTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onBackRef = useRef(onBack);
  const sizeRef = useRef(15);
  const speedRef = useRef<SpeedMultiplier>(1);

  onBackRef.current = onBack;

  // React state only for low-frequency UI (toolbar enable/disable).
  const [screen, setScreen] = useState<GameState>(GameState.TITLE);
  const [size, setSize] = useState(15);
  const [speed, setSpeed] = useState<SpeedMultiplier>(1);
  const [coins, setCoins] = useState(0);
  const [upgrades, setUpgrades] = useState<UpgradeLevels>(loadUpgrades);

  const chaserSpawnBeat = () => CHASER_SPAWN + gRef.current!.upgrades.chaserDelay * 2;
  const slowmoBeats = () => SLOWMO_BEATS + gRef.current!.upgrades.slowExt * 2;
  const starBeats = () => STAR_BEATS + gRef.current!.upgrades.starExt * 2;
  const coinScore = () => COIN_SCORE + gRef.current!.upgrades.coinBonus * 25;
  const survivalScore = () => 10 + gRef.current!.upgrades.survivalBoost * 5;

  // ── helpers bound to current mutable state ──────────────────────────────────
  const tilePx = (p: Point) => {
    const cs = gRef.current!.cellSize;
    return { x: p.col * cs + cs / 2, y: p.row * cs + cs / 2 };
  };

  const layoutCanvas = () => {
    const g = gRef.current!;
    const canvas = canvasRef.current!;
    const area = boardAreaRef.current;
    const n = g.layout.width;
    const availW = area?.clientWidth ?? window.innerWidth;
    const availH = area?.clientHeight ?? window.innerHeight;
    g.cellSize = Math.max(12, Math.floor(Math.min(availW, availH) / n));
    canvas.width = g.cellSize * n;
    canvas.height = g.cellSize * n;
  };

  const newMaze = () => {
    const g = gRef.current!;
    const { layout, items } = generateMaze(sizeRef.current);
    g.layout = layout;
    g.items = JSON.parse(JSON.stringify(items)) as ItemMap;
    g.playerPos = { ...layout.start };
    layoutCanvas();
  };

  const resetState = () => {
    const g = gRef.current!;
    g.score = 0;
    g.runCoins = 0;
    g.slowLeft = 0;
    g.starLeft = 0;
    g.starActive = false;
    g.freezeLeft = 0;
    g.pendingInput = null;
    g.chaserActive = false;
    g.chaserEliminated = false;
    g.chaserPos = { row: 0, col: 0 };
    beatRef.current!.resetBPM();
    newMaze();
  };

  const transition = (state: GameState) => {
    const g = gRef.current!;
    g.state = state;
    setScreen(state);
    if (state === GameState.WIN) {
      beatRef.current!.stop();
      g.highScore = saveHighScore(g.score);
    } else if (state === GameState.LOSE) {
      beatRef.current!.stop();
    }
  };

  // returns true if the game ended this beat
  const collision = (): boolean => {
    const g = gRef.current!;
    if (!g.chaserActive || !samePoint(g.chaserPos, g.playerPos)) return false;
    if (g.starActive) {
      g.chaserActive = false;
      g.chaserEliminated = true;
      g.score += 500;
      return false;
    }
    transition(GameState.LOSE);
    return true;
  };

  const teleport = () => {
    const g = gRef.current!;
    const item = g.items[key(g.playerPos)];
    if (item?.type === "PORTAL" && item.partner) g.playerPos = { ...item.partner };
  };

  const pickup = () => {
    const g = gRef.current!;
    const k = key(g.playerPos);
    const item = g.items[k];
    if (!item) return;
    if (item.type === "APPLE") {
      g.slowLeft = slowmoBeats();
      beatRef.current!.setBPM(beatRef.current!.getBaseBpm() * SLOWMO_FACTOR);
      g.score += 100;
      delete g.items[k];
    } else if (item.type === "STAR") {
      g.starLeft = starBeats();
      g.starActive = true;
      g.score += 200;
      delete g.items[k];
    } else if (item.type === "SNOWFLAKE") {
      g.freezeLeft = SNOWFLAKE_BEATS;
      g.score += 150;
      delete g.items[k];
    } else if (item.type === "COIN") {
      g.score += coinScore();
      g.runCoins += COIN_VALUE;
      g.coins = addCoins(COIN_VALUE);
      setCoins(g.coins);
      delete g.items[k];
    }
  };

  const tickPowerUps = () => {
    const g = gRef.current!;
    if (g.slowLeft > 0 && --g.slowLeft === 0) beatRef.current!.resetBPM();
    if (g.starLeft > 0 && --g.starLeft === 0) g.starActive = false;
  };

  // ── beat callback ───────────────────────────────────────────────────────────
  const onBeat = (beatNum: number) => {
    const g = gRef.current!;
    if (g.state !== GameState.PLAYING) return;

    g.score += survivalScore(); // survival points

    if (!g.chaserActive && !g.chaserEliminated && beatNum >= chaserSpawnBeat()) {
      g.chaserActive = true;
      g.chaserPos = { ...g.layout.start };
      g.chaserVisual = tilePx(g.chaserPos);
    } else if (g.chaserActive) {
      if (g.freezeLeft > 0) {
        g.freezeLeft--;
      } else {
        const res = nextStep(g.layout, g.chaserPos, g.playerPos, CHASER_LOOK_AHEAD);
        if (res.next) g.chaserPos = res.next;
      }
      if (collision()) return;
    }

    const dir = g.pendingInput;
    g.pendingInput = null;
    if (dir) {
      const next = step(g.playerPos, dir);
      if (isWalkable(g.layout, next)) {
        g.playerPos = next;
        teleport();
        pickup();
        if (collision()) return;
        if (samePoint(g.playerPos, g.layout.goal)) {
          g.score += 1000;
          transition(GameState.WIN);
          return;
        }
      }
    }

    tickPowerUps();
  };

  // ── countdown → play ────────────────────────────────────────────────────────
  const enterCountdown = () => {
    const g = gRef.current!;
    beatRef.current!.init();
    resetState();
    g.countdownVal = 2;   // count down timer
    transition(GameState.COUNTDOWN);
    let n = 2;
    let timeout1 = 600;
    let timeout2 = 1000;
    // new dynamic timeout value
    countdownTimer.current = setInterval(() => {
      n--;
      g.countdownVal = n;
      if (n <= 0) {
        if (countdownTimer.current) clearInterval(countdownTimer.current);
        playTimeoutRef.current = setTimeout(() => {
          g.state = GameState.PLAYING;
          setScreen(GameState.PLAYING);
          beatRef.current!.onBeat = onBeat;
          beatRef.current!.start();
        }, timeout1);
      }
    }, timeout2);
  };

  const cancelGame = () => {
    beatRef.current?.stop();
    if (countdownTimer.current) {
      clearInterval(countdownTimer.current);
      countdownTimer.current = null;
    }
    if (playTimeoutRef.current) {
      clearTimeout(playTimeoutRef.current);
      playTimeoutRef.current = null;
    }
    const g = gRef.current!;
    g.state = GameState.TITLE;
    setScreen(GameState.TITLE);
    resetState();
  };

  // ── render loop ─────────────────────────────────────────────────────────────
  const renderLoop = () => {
    rafRef.current = requestAnimationFrame(renderLoop);
    const g = gRef.current;
    const canvas = canvasRef.current;
    const beat = beatRef.current;
    if (!g || !canvas || !beat) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (g.chaserActive) {
      const t = tilePx(g.chaserPos);
      const lerp = g.freezeLeft > 0 ? 0.06 : 0.18;
      g.chaserVisual.x += (t.x - g.chaserVisual.x) * lerp;
      g.chaserVisual.y += (t.y - g.chaserVisual.y) * lerp;
    }
    beat.pulse = Math.max(0, beat.pulse - 0.04);

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawGrid(ctx, g);

    if (g.state !== GameState.TITLE && g.state !== GameState.COUNTDOWN) {
      if (g.chaserActive) drawChaser(ctx, g);
      drawPlayer(ctx, g);
      drawHUD(ctx, g, canvas, beat.currentBeat);
    }
    drawBeatPulse(ctx, canvas, beat.pulse);
    drawOverlay(ctx, g, canvas);
  };

  // ── drawing ─────────────────────────────────────────────────────────────────
  const drawGrid = (ctx: CanvasRenderingContext2D, g: Mutable) => {
    const cs = g.cellSize;
    const n = g.layout.width;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        const x = c * cs;
        const y = r * cs;
        const wall = g.layout.grid[r][c] === 1;
        ctx.fillStyle = wall ? COLORS.wallEdge : COLORS.floor;
        ctx.fillRect(x, y, cs, cs);
        if (wall) {
          ctx.fillStyle = COLORS.wallEdge;
          ctx.fillRect(x + 1, y + 1, cs - 2, cs - 2);
          continue;
        }
        if (samePoint({ row: r, col: c }, g.layout.start)) {
          ctx.fillStyle = COLORS.start;
          ctx.fillRect(x + 3, y + 3, cs - 6, cs - 6);
        }
        if (samePoint({ row: r, col: c }, g.layout.goal)) {
          const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 280);
          ctx.fillStyle = `rgba(233,69,96,${pulse * 0.7})`;
          ctx.fillRect(x + 3, y + 3, cs - 6, cs - 6);
          ctx.fillStyle = COLORS.exit;
          ctx.font = `bold ${Math.floor(cs * 0.5)}px monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("X", x + cs / 2, y + cs / 2 + 1);
        }
        drawItem(ctx, cs, x, y, g.items[`${r},${c}`]);
      }
    }
  };

  const drawItem = (ctx: CanvasRenderingContext2D, cs: number, x: number, y: number, item?: Item) => {
    if (!item) return;
    if (item.type === "APPLE") {
      ctx.fillStyle = COLORS.apple;
      ctx.beginPath();
      ctx.arc(x + cs / 2, y + cs / 2, cs * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#81c784";
      ctx.fillRect(x + cs / 2, y + cs / 2 - cs * 0.22, 4, 5);
    } else if (item.type === "STAR") {
      drawStar(ctx, x + cs / 2, y + cs / 2, cs * 0.26, COLORS.star);
    } else if (item.type === "SNOWFLAKE") {
      drawSnowflake(ctx, x + cs / 2, y + cs / 2, cs * 0.28, COLORS.snowflake);
    } else if (item.type === "PORTAL") {
      const a = 0.45 + 0.45 * Math.sin(Date.now() / 380);
      ctx.strokeStyle = `rgba(74,240,255,${a})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x + cs / 2, y + cs / 2, cs * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(74,240,255,${a * 0.25})`;
      ctx.fill();
    } else if (item.type === "COIN") {
      const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 220);
      ctx.fillStyle = COLORS.coin;
      ctx.beginPath();
      ctx.arc(x + cs / 2, y + cs / 2, cs * 0.22 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#ffd080";
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  };

  const drawStar = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (i * Math.PI) / 5 - Math.PI / 2;
      const dist = i % 2 === 0 ? r : r * 0.42;
      const fn = i === 0 ? "moveTo" : "lineTo";
      ctx[fn](cx + dist * Math.cos(angle), cy + dist * Math.sin(angle));
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawSnowflake = (ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const dx = r * Math.cos(angle);
      const dy = r * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(cx - dx, cy - dy);
      ctx.lineTo(cx + dx, cy + dy);
      ctx.stroke();
      const bx = cx + dx * 0.55;
      const by = cy + dy * 0.55;
      const wing = r * 0.28;
      const wingAngle = angle + Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(bx - wing * Math.cos(wingAngle), by - wing * Math.sin(wingAngle));
      ctx.lineTo(bx + wing * Math.cos(wingAngle), by + wing * Math.sin(wingAngle));
      ctx.stroke();
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawPlayer = (ctx: CanvasRenderingContext2D, g: Mutable) => {
    const p = tilePx(g.playerPos);
    const r = g.cellSize * 0.32;
    if (g.starActive) {
      ctx.strokeStyle = "rgba(255,215,0,0.45)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = g.starActive ? COLORS.playerStar : COLORS.player;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  };

  const drawChaser = (ctx: CanvasRenderingContext2D, g: Mutable) => {
    const r = g.cellSize * 0.3;
    const { x, y } = g.chaserVisual;
    const frozen = g.freezeLeft > 0;
    if (frozen) {
      ctx.strokeStyle = "rgba(168,230,255,0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = frozen ? COLORS.snowflake : COLORS.chaser;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (frozen) {
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + Date.now() / 1200;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + r * 0.85 * Math.cos(angle), y + r * 0.85 * Math.sin(angle));
        ctx.stroke();
      }
    }
    const er = r * 0.18;
    ctx.fillStyle = frozen ? "#1a3a4a" : "#000";
    for (const sx of [-0.32, 0.32]) {
      ctx.beginPath();
      ctx.arc(x + r * sx, y - r * 0.22, er, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawBeatPulse = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, pulse: number) => {
    if (pulse <= 0.02) return;
    ctx.strokeStyle = `rgba(255,255,255,${pulse * 0.3})`;
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
  };

  const drawHUD = (ctx: CanvasRenderingContext2D, g: Mutable, canvas: HTMLCanvasElement, beatNumber: number) => {
    const fs = Math.max(10, Math.floor(g.cellSize * 0.42));
    ctx.textBaseline = "top";

    if (g.state === GameState.PLAYING) {
      ctx.fillStyle = "rgba(224,224,224,0.7)";
      ctx.font = `${fs}px monospace`;
      ctx.textAlign = "left";
      ctx.fillText(`beat ${beatNumber}`, 6, 6);
    }

    ctx.fillStyle = COLORS.hud;
    ctx.font = `bold ${fs}px monospace`;
    ctx.textAlign = "right";
    ctx.fillText(String(g.score), canvas.width - 6, 6);

    if (g.state === GameState.PLAYING && !g.chaserActive && !g.chaserEliminated && beatNumber < chaserSpawnBeat()) {
      ctx.fillStyle = "rgba(233,69,96,0.9)";
      ctx.font = `${fs}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText(`chaser in ${chaserSpawnBeat() - beatNumber} beats`, canvas.width / 2, 6);
    }

    let py = Math.floor(g.cellSize * 0.55);
    ctx.textAlign = "left";
    if (g.slowLeft > 0) {
      ctx.fillStyle = COLORS.apple;
      ctx.font = `${fs}px monospace`;
      ctx.fillText(`slow  x${g.slowLeft}`, 6, py);
      py += fs + 4;
    }
    if (g.starLeft > 0) {
      ctx.fillStyle = COLORS.star;
      ctx.font = `${fs}px monospace`;
      ctx.fillText(`star  x${g.starLeft}`, 6, py);
      py += fs + 4;
    }
    if (g.freezeLeft > 0) {
      ctx.fillStyle = COLORS.snowflake;
      ctx.font = `${fs}px monospace`;
      ctx.fillText(`freeze  x${g.freezeLeft}`, 6, py);
      py += fs + 4;
    }
    if (g.runCoins > 0) {
      ctx.fillStyle = COLORS.coin;
      ctx.font = `${fs}px monospace`;
      ctx.fillText(`coins x${g.runCoins}`, 6, py);
    }

    ctx.fillStyle = "rgba(224,224,224,0.4)";
    ctx.font = `${Math.floor(fs * 0.85)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(`best: ${g.highScore}`, canvas.width / 2, canvas.height - 4);
  };

  const drawOverlay = (ctx: CanvasRenderingContext2D, g: Mutable, canvas: HTMLCanvasElement) => {
    if (g.state === GameState.TITLE) drawTitle(ctx, g, canvas);
    else if (g.state === GameState.COUNTDOWN) drawCountdown(ctx, g, canvas);
    else if (g.state === GameState.WIN) drawEnd(ctx, g, canvas, "YOU ESCAPED!", COLORS.apple);
    else if (g.state === GameState.LOSE) drawEnd(ctx, g, canvas, "CAUGHT!", COLORS.chaser);
  };

  const drawTitle = (ctx: CanvasRenderingContext2D, g: Mutable, canvas: HTMLCanvasElement) => {
    ctx.fillStyle = COLORS.overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const cs = g.cellSize;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.floor(cs * 1.4)}px monospace`;
    ctx.fillText("ECHO", cx, cy - cs * 1.8);
    ctx.fillStyle = "#aaa";
    ctx.font = `${Math.floor(cs * 0.52)}px monospace`;
    ctx.fillText("RHYTHM MAZE", cx, cy - cs * 0.7);
    if (Math.sin(Date.now() / 480) > 0) {
      ctx.fillStyle = COLORS.portal;
      ctx.font = `${Math.floor(cs * 0.46)}px monospace`;
      ctx.fillText("PRESS  ENTER  TO  START", cx, cy + cs * 0.6);
    }
    ctx.fillStyle = "#777";
    ctx.font = `${Math.floor(cs * 0.34)}px monospace`;
    ctx.fillText("WASD / ARROWS  ·  move on the beat", cx, cy + cs * 1.7);
    ctx.font = `${Math.floor(cs * 0.32)}px monospace`;
    const legendY = cy + cs * 2.35;
    const legendGap = cs * 0.42;
    ctx.fillStyle = COLORS.apple;
    ctx.fillText("green = slow time", cx, legendY);
    ctx.fillStyle = COLORS.star;
    ctx.fillText("gold = invincible", cx, legendY + legendGap);
    ctx.fillStyle = COLORS.snowflake;
    ctx.fillText("ice = freeze chaser", cx, legendY + legendGap * 2);
    ctx.fillStyle = COLORS.portal;
    ctx.fillText("cyan = portal", cx, legendY + legendGap * 3);
    ctx.fillStyle = COLORS.coin;
    ctx.fillText("orange = coin (off-route)", cx, legendY + legendGap * 4);
    ctx.fillStyle = "#666";
    ctx.font = `${Math.floor(cs * 0.28)}px monospace`;
    ctx.fillText(`bank: ${g.coins} coins`, cx, legendY + legendGap * 5.2);
  };

  const drawCountdown = (ctx: CanvasRenderingContext2D, g: Mutable, canvas: HTMLCanvasElement) => {
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.floor(g.cellSize * 2.8)}px monospace`;
    ctx.fillText(g.countdownVal > 0 ? String(g.countdownVal) : "GO!", canvas.width / 2, canvas.height / 2);
  };

  const drawEnd = (
    ctx: CanvasRenderingContext2D,
    g: Mutable,
    canvas: HTMLCanvasElement,
    msg: string,
    color: string
  ) => {
    ctx.fillStyle = COLORS.overlay;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const cs = g.cellSize;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = color;
    ctx.font = `bold ${Math.floor(cs * 0.95)}px monospace`;
    ctx.fillText(msg, cx, cy - cs * 0.9);
    ctx.fillStyle = "#fff";
    ctx.font = `${Math.floor(cs * 0.68)}px monospace`;
    ctx.fillText(`score: ${g.score}`, cx, cy + cs * 0.35);
    if (g.runCoins > 0) {
      ctx.fillStyle = COLORS.coin;
      ctx.font = `${Math.floor(cs * 0.48)}px monospace`;
      ctx.fillText(`+${g.runCoins} coin${g.runCoins === 1 ? "" : "s"} saved`, cx, cy + cs * 0.95);
    }
    if (g.score > 0 && g.score >= g.highScore) {
      ctx.fillStyle = COLORS.star;
      ctx.font = `${Math.floor(cs * 0.48)}px monospace`;
      ctx.fillText("NEW HIGH SCORE!", cx, cy + cs * (g.runCoins > 0 ? 1.55 : 1.15));
    }
    if (Math.sin(Date.now() / 500) > 0) {
      ctx.fillStyle = "#aaa";
      ctx.font = `${Math.floor(cs * 0.42)}px monospace`;
      ctx.fillText("PRESS ENTER TO RESTART", cx, cy + cs * (g.runCoins > 0 ? 2.35 : 1.95));
    }
  };

  // ── mount ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    beatRef.current = new BeatEngine();
    beatRef.current.setSpeedMultiplier(speedRef.current);
    const seed = generateMaze(sizeRef.current);
    gRef.current = {
      state: GameState.TITLE,
      layout: seed.layout,
      items: JSON.parse(JSON.stringify(seed.items)) as ItemMap,
      playerPos: { ...seed.layout.start },
      score: 0,
      highScore: loadHighScore(),
      coins: loadCoins(),
      runCoins: 0,
      upgrades: loadUpgrades(),
      slowLeft: 0,
      starLeft: 0,
      starActive: false,
      freezeLeft: 0,
      countdownVal: 3,
      pendingInput: null,
      chaserActive: false,
      chaserEliminated: false,
      chaserPos: { row: 0, col: 0 },
      chaserVisual: { x: 0, y: 0 },
      cellSize: 30,
    };
    setCoins(gRef.current.coins);
    setUpgrades(gRef.current.upgrades);
    layoutCanvas();

    const onResize = () => layoutCanvas();
    window.addEventListener("resize", onResize);

    const area = boardAreaRef.current;
    const ro = area ? new ResizeObserver(onResize) : null;
    ro?.observe(area!);

    const onKey = (e: KeyboardEvent) => {
      const g = gRef.current!;
      if (e.key === "Escape") {
        if (g.state === GameState.TITLE) onBackRef.current?.();
        else cancelGame();
        return;
      }
      if (e.key === "Enter") {
        if (g.state === GameState.TITLE) enterCountdown();
        else if (g.state === GameState.WIN || g.state === GameState.LOSE) {
          beatRef.current!.stop();
          g.state = GameState.TITLE;
          setScreen(GameState.TITLE);
          newMaze();
        }
        return;
      }
      if (g.state === GameState.PLAYING) {
        const dir = KEY_MAP[e.key];
        if (dir) {
          e.preventDefault();
          g.pendingInput = dir;
        }
      }
    };
    window.addEventListener("keydown", onKey);

    rafRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(rafRef.current);
      if (countdownTimer.current) clearInterval(countdownTimer.current);
      if (playTimeoutRef.current) clearTimeout(playTimeoutRef.current);
      beatRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSizeChange = (value: number) => {
    setSize(value);
    sizeRef.current = value;
    if (gRef.current && gRef.current.state === GameState.TITLE) newMaze();
  };

  const onSpeedChange = (value: SpeedMultiplier) => {
    setSpeed(value);
    speedRef.current = value;
    beatRef.current?.setSpeedMultiplier(value);
  };

  const onBuyUpgrade = (id: (typeof UPGRADES)[number]["id"]) => {
    if (gRef.current?.state !== GameState.TITLE) return;
    const def = UPGRADES.find((u) => u.id === id)!;
    const level = upgrades[id];
    if (level >= def.maxLevel) return;
    const cost = upgradeCost(def, level);
    const next = buyUpgrade(id, def.maxLevel, cost);
    if (!next) return;
    gRef.current!.upgrades = next;
    gRef.current!.coins = loadCoins();
    setUpgrades(next);
    setCoins(gRef.current!.coins);
  };

  const toolbarDisabled = screen === GameState.PLAYING || screen === GameState.COUNTDOWN;

  return (
    <div className="game-shell">
      <div className="toolbar">
        <div className="coin-bank">
          <span className="coin-icon">●</span>
          <span className="coin-count">{coins}</span>
          <span className="coin-label">coins</span>
        </div>
        <label>
          maze size
          <select value={size} disabled={toolbarDisabled} onChange={(e) => onSizeChange(Number(e.target.value))}>
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s}×{s}
              </option>
            ))}
          </select>
        </label>
        <label>
          speed
          <div className="speed-control">
            <input
              type="range"
              className="speed-slider"
              min={1}
              max={5}
              step={1}
              value={speed}
              disabled={toolbarDisabled}
              onChange={(e) => onSpeedChange(Number(e.target.value) as SpeedMultiplier)}
              title={SPEED_TOOLTIPS[speed]}
            />
            <div className="speed-ticks" aria-hidden="true">
              {SPEED_OPTIONS.map((s) => (
                <span
                  key={s}
                  className={`speed-tick${s === speed ? " active" : ""}`}
                  title={SPEED_TOOLTIPS[s]}
                >
                  {SPEED_EMOJIS[s]}
                </span>
              ))}
            </div>
          </div>
        </label>
        {onBack && (
          <button type="button" className="back-btn" onClick={onBack} disabled={toolbarDisabled}>
            ← guide
          </button>
        )}
        <div className="shop">
          <h2>Upgrades</h2>
          {UPGRADES.map((def) => {
            const level = upgrades[def.id];
            const maxed = level >= def.maxLevel;
            const cost = upgradeCost(def, level);
            const canAfford = coins >= cost;
            return (
              <button
                key={def.id}
                type="button"
                className={`upgrade-btn${maxed ? " maxed" : ""}${!maxed && !canAfford ? " disabled" : ""}`}
                disabled={screen !== GameState.TITLE || maxed || !canAfford}
                onClick={() => onBuyUpgrade(def.id)}
              >
                <span className="upgrade-name">{def.name}</span>
                <span className="upgrade-desc">{def.description}</span>
                <span className="upgrade-meta">
                  {maxed ? `MAX (${def.maxLevel})` : `${cost} coins · lv ${level}/${def.maxLevel}`}
                </span>
              </button>
            );
          })}
        </div>
        <span className="hint">Enter to play · Esc to cancel · WASD / arrows on the beat · coins off the short route</span>
      </div>
      <div className="board-area" ref={boardAreaRef}>
        <canvas ref={canvasRef} aria-label="Echo Rhythm Maze game board" />
      </div>
    </div>
  );
}
