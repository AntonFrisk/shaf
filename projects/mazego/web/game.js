'use strict';

// ── Constants ──────────────────────────────────────────────────────────────

const CELL_COUNT     = 15;
const BPM_DEFAULT    = 120;
const SLOWMO_FACTOR  = 0.6;
const SLOWMO_BEATS   = 8;
const STAR_BEATS     = 8;
const CHASER_SPAWN   = 10;   // beat number chaser spawns on
const SCHED_AHEAD    = 0.1;  // seconds audio scheduler looks ahead
const SCHED_TICK_MS  = 25;   // scheduler poll rate

const STATE = { TITLE: 'TITLE', COUNTDOWN: 'COUNTDOWN', PLAYING: 'PLAYING', WIN: 'WIN', LOSE: 'LOSE' };

const COLORS = {
  bg:          '#0d0d1a',
  wall:        '#1a1a2e',
  wallEdge:    '#0d0d1a',
  floor:       '#16213e',
  start:       '#0f3460',
  exit:        '#e94560',
  apple:       '#4caf50',
  star:        '#ffd700',
  portal:      '#4af0ff',
  player:      '#ffffff',
  playerStar:  '#ffd700',
  chaser:      '#e94560',
  hud:         '#e0e0e0',
  overlay:     'rgba(0,0,0,0.78)',
};

// ── Maze Layout ────────────────────────────────────────────────────────────

const MAZE_LAYOUT = {
  grid: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,1,0,1],
    [1,0,1,0,1,0,1,1,1,1,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,0,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,0,1,1,1,0,1,0,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,0,1,1,1],
    [1,0,0,0,1,0,1,0,0,0,0,0,1,0,1],
    [1,1,1,0,1,0,1,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  start:     { row: 1, col: 1 },
  goal:      { row: 13, col: 13 },
  teleports: [{ id: 'blue', from: { row: 5, col: 1 }, to: { row: 9, col: 13 }, color: '#4af0ff' }],
  width:     15,
  height:    15,
};

// Item overlay — portal entry at (5,1) teleports to (9,13); (9,13) is visual-only exit
const ITEM_DEFS = {
  '3,7':  { type: 'APPLE' },
  '9,3':  { type: 'APPLE' },
  '7,11': { type: 'STAR' },
  '5,1':  { type: 'PORTAL', partner: { row: 9, col: 13 } },
  '9,13': { type: 'PORTAL' },  // visual marker only, no partner → no teleport
};

// ── Game State ─────────────────────────────────────────────────────────────

let canvas, ctx, cellSize;
let gameState    = STATE.TITLE;
let playerPos    = { ...MAZE_LAYOUT.start };
let score        = 0;
let highScore    = 0;
let beatNumber   = 0;
let beatPulse    = 0;    // alpha, decays each frame
let slowLeft     = 0;    // beats remaining on apple slow-mo
let starLeft     = 0;    // beats remaining on star
let starActive   = false;
let activeItems  = {};   // mutable copy of ITEM_DEFS, items removed on pickup
let countdownVal = 3;

// ── Beat Engine ────────────────────────────────────────────────────────────

const Beat = {
  audioCtx:       null,
  nextBeatTime:   0,
  lastBeatTime:   0,
  intervalSec:    60 / BPM_DEFAULT,
  _timer:         null,
  onBeat:         null,

  init() {
    if (this.audioCtx) this.audioCtx.close();
    this.audioCtx    = new (window.AudioContext || window.webkitAudioContext)();
    this.intervalSec = 60 / BPM_DEFAULT;
  },

  start() {
    // Align first beat to just after now (not stale from init time)
    this.nextBeatTime = this.audioCtx.currentTime + 0.08;
    this.lastBeatTime = this.nextBeatTime - this.intervalSec;
    this._timer = setInterval(() => this._schedule(), SCHED_TICK_MS);
  },

  stop() {
    clearInterval(this._timer);
    this._timer = null;
  },

  setBPM(bpm) {
    this.intervalSec = 60 / bpm;
  },

  _schedule() {
    if (!this.audioCtx) return;
    const limit = this.audioCtx.currentTime + SCHED_AHEAD;
    while (this.nextBeatTime < limit) {
      this._scheduleBeat(this.nextBeatTime);
      this.lastBeatTime  = this.nextBeatTime;
      this.nextBeatTime += this.intervalSec;
    }
  },

  _scheduleBeat(time) {
    const osc  = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.connect(gain);
    gain.connect(this.audioCtx.destination);
    osc.frequency.value = (beatNumber % 4 === 0) ? 1200 : 880;
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.06);

    const delayMs = Math.max(0, (time - this.audioCtx.currentTime) * 1000);
    const capturedBeat = beatNumber;
    beatNumber++;
    setTimeout(() => {
      beatPulse = 1.0;
      if (this.onBeat) this.onBeat(capturedBeat);
    }, delayMs);
  },
};

// ── Input Buffer ───────────────────────────────────────────────────────────

const Input = {
  pending: null,
  push(dir) { this.pending = dir; },
  flush()   { const v = this.pending; this.pending = null; return v; },
};

const KEY_MAP = {
  ArrowUp: 'up',   w: 'up',   W: 'up',
  ArrowDown:'down', s:'down',  S:'down',
  ArrowLeft:'left', a:'left',  A:'left',
  ArrowRight:'right',d:'right',D:'right',
};

// ── Chaser State ───────────────────────────────────────────────────────────

const Chaser = {
  active:      false,
  eliminated:  false,
  pos:         { row: 0, col: 0 },
  visual:      { x: 0, y: 0 },   // pixel position for lerp
  pending:     null,              // next tile from API

  spawn(pos) {
    this.active     = true;
    this.eliminated = false;
    this.pos        = { ...pos };
    this.visual     = tilePx(pos);
    this.pending    = null;
  },

  step() {
    if (this.pending) {
      this.pos     = { ...this.pending };
      this.pending = null;
    }
  },

  eliminate() {
    this.active     = false;
    this.eliminated = true;
    score += 500;
  },
};

// ── Grid Helpers ───────────────────────────────────────────────────────────

function walkable(pos) {
  if (pos.row < 0 || pos.row >= CELL_COUNT || pos.col < 0 || pos.col >= CELL_COUNT) return false;
  return MAZE_LAYOUT.grid[pos.row][pos.col] === 0;
}

function step(pos, dir) {
  const d = { up:[-1,0], down:[1,0], left:[0,-1], right:[0,1] }[dir];
  return { row: pos.row + d[0], col: pos.col + d[1] };
}

function tilePx(pos) {
  return { x: pos.col * cellSize + cellSize / 2, y: pos.row * cellSize + cellSize / 2 };
}

function key(pos) { return `${pos.row},${pos.col}`; }

// ── Game Logic ─────────────────────────────────────────────────────────────

function teleport() {
  const item = activeItems[key(playerPos)];
  if (item && item.type === 'PORTAL' && item.partner) {
    playerPos = { ...item.partner };
  }
}

function pickupItem() {
  const k    = key(playerPos);
  const item = activeItems[k];
  if (!item) return;
  if (item.type === 'APPLE') {
    slowLeft = SLOWMO_BEATS;
    Beat.setBPM(BPM_DEFAULT * SLOWMO_FACTOR);
    score += 100;
    delete activeItems[k];
  } else if (item.type === 'STAR') {
    starLeft   = STAR_BEATS;
    starActive = true;
    score += 200;
    delete activeItems[k];
  }
}

function tickPowerUps() {
  if (slowLeft > 0 && --slowLeft === 0) Beat.setBPM(BPM_DEFAULT);
  if (starLeft > 0 && --starLeft === 0) starActive = false;
}

function collision() {
  if (!Chaser.active) return;
  if (Chaser.pos.row !== playerPos.row || Chaser.pos.col !== playerPos.col) return;
  if (starActive) { Chaser.eliminate(); }
  else { transitionTo(STATE.LOSE); }
}

async function fetchStep(chaserPos, plPos) {
  const r = await fetch('/api/v1/game/chaser/step', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ layout: MAZE_LAYOUT, chaser: chaserPos, player: plPos, look_ahead: 2 }),
  });
  return r.json();
}

// ── Beat Callback ──────────────────────────────────────────────────────────

function onBeat(beatNum) {
  if (gameState !== STATE.PLAYING) return;

  score += 10;  // survival score

  // Spawn chaser at beat CHASER_SPAWN
  if (!Chaser.active && !Chaser.eliminated && beatNum === CHASER_SPAWN) {
    Chaser.spawn(MAZE_LAYOUT.start);
    fetchStep({ ...Chaser.pos }, { ...playerPos })
      .then(r => { if (r && r.next) Chaser.pending = r.next; })
      .catch(() => {});
  }

  // Advance chaser to pending tile
  if (Chaser.active && Chaser.pending) {
    Chaser.step();
    collision();
    if (gameState !== STATE.PLAYING) return;
  }

  // Queue next chaser step
  if (Chaser.active) {
    fetchStep({ ...Chaser.pos }, { ...playerPos })
      .then(r => { if (r && r.next) Chaser.pending = r.next; })
      .catch(() => {});
  }

  // Flush buffered player input
  const dir = Input.flush();
  if (dir) {
    const next = step(playerPos, dir);
    if (walkable(next)) {
      playerPos = next;
      teleport();
      pickupItem();
      collision();
      if (gameState !== STATE.PLAYING) return;
      if (playerPos.row === MAZE_LAYOUT.goal.row && playerPos.col === MAZE_LAYOUT.goal.col) {
        score += 1000;
        transitionTo(STATE.WIN);
        return;
      }
    }
  }

  tickPowerUps();
}

// ── State Machine ──────────────────────────────────────────────────────────

function transitionTo(state) {
  gameState = state;
  if (state === STATE.WIN)  { Beat.stop(); saveHigh(score); }
  if (state === STATE.LOSE) { Beat.stop(); }
}

function enterCountdown() {
  resetState();
  Beat.init();
  countdownVal = 3;
  gameState = STATE.COUNTDOWN;
  let n = 3;
  const t = setInterval(() => {
    n--;
    countdownVal = n;
    if (n <= 0) {
      clearInterval(t);
      setTimeout(() => {
        gameState = STATE.PLAYING;
        Beat.onBeat = onBeat;
        Beat.start();
      }, 600);
    }
  }, 1000);
}

function resetState() {
  playerPos   = { ...MAZE_LAYOUT.start };
  score       = 0;
  beatNumber  = 0;
  beatPulse   = 0;
  slowLeft    = 0;
  starLeft    = 0;
  starActive  = false;
  activeItems = JSON.parse(JSON.stringify(ITEM_DEFS));
  Chaser.active     = false;
  Chaser.eliminated = false;
  Chaser.pending    = null;
  Beat.intervalSec  = 60 / BPM_DEFAULT;
}

// ── Rendering ──────────────────────────────────────────────────────────────

function renderLoop() {
  requestAnimationFrame(renderLoop);

  // Lerp chaser visual toward logical position
  if (Chaser.active) {
    const t = tilePx(Chaser.pos);
    Chaser.visual.x += (t.x - Chaser.visual.x) * 0.18;
    Chaser.visual.y += (t.y - Chaser.visual.y) * 0.18;
  }

  beatPulse = Math.max(0, beatPulse - 0.04);

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawGrid();

  if (gameState !== STATE.TITLE && gameState !== STATE.COUNTDOWN) {
    if (Chaser.active) drawChaser();
    drawPlayer();
    drawHUD();
  }

  drawBeatPulse();
  drawOverlay();
}

function drawGrid() {
  for (let r = 0; r < CELL_COUNT; r++) {
    for (let c = 0; c < CELL_COUNT; c++) {
      drawCell(r, c);
    }
  }
}

function drawCell(r, c) {
  const x = c * cellSize;
  const y = r * cellSize;
  const wall = MAZE_LAYOUT.grid[r][c] === 1;

  ctx.fillStyle = wall ? COLORS.wall : COLORS.floor;
  ctx.fillRect(x, y, cellSize, cellSize);

  if (wall) {
    ctx.fillStyle = COLORS.wallEdge;
    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    return;
  }

  // Start tile
  if (r === MAZE_LAYOUT.start.row && c === MAZE_LAYOUT.start.col) {
    ctx.fillStyle = COLORS.start;
    ctx.fillRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
  }

  // Exit tile
  if (r === MAZE_LAYOUT.goal.row && c === MAZE_LAYOUT.goal.col) {
    const pulse = 0.55 + 0.45 * Math.sin(Date.now() / 280);
    ctx.fillStyle = `rgba(233,69,96,${pulse * 0.7})`;
    ctx.fillRect(x + 3, y + 3, cellSize - 6, cellSize - 6);
    ctx.fillStyle = COLORS.exit;
    ctx.font = `bold ${Math.floor(cellSize * 0.5)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('X', x + cellSize / 2, y + cellSize / 2 + 1);
  }

  // Items
  const item = activeItems[`${r},${c}`];
  if (!item) return;

  if (item.type === 'APPLE') {
    ctx.fillStyle = COLORS.apple;
    ctx.beginPath();
    ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // leaf
    ctx.fillStyle = '#81c784';
    ctx.fillRect(x + cellSize / 2, y + cellSize / 2 - cellSize * 0.22, 4, 5);
  } else if (item.type === 'STAR') {
    drawStar(x + cellSize / 2, y + cellSize / 2, cellSize * 0.26, COLORS.star);
  } else if (item.type === 'PORTAL') {
    const a = 0.45 + 0.45 * Math.sin(Date.now() / 380);
    ctx.strokeStyle = `rgba(74,240,255,${a})`;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x + cellSize / 2, y + cellSize / 2, cellSize * 0.3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = `rgba(74,240,255,${a * 0.25})`;
    ctx.fill();
  }
}

function drawStar(cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const angle = (i * Math.PI / 5) - Math.PI / 2;
    const dist  = i % 2 === 0 ? r : r * 0.42;
    i === 0
      ? ctx.moveTo(cx + dist * Math.cos(angle), cy + dist * Math.sin(angle))
      : ctx.lineTo(cx + dist * Math.cos(angle), cy + dist * Math.sin(angle));
  }
  ctx.closePath();
  ctx.fill();
}

function drawPlayer() {
  const p = tilePx(playerPos);
  const r = cellSize * 0.32;

  if (starActive) {
    ctx.strokeStyle = 'rgba(255,215,0,0.45)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.fillStyle = starActive ? COLORS.playerStar : COLORS.player;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawChaser() {
  const r = cellSize * 0.3;
  ctx.fillStyle = COLORS.chaser;
  ctx.beginPath();
  ctx.arc(Chaser.visual.x, Chaser.visual.y, r, 0, Math.PI * 2);
  ctx.fill();

  // eyes
  const er = r * 0.18;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.arc(Chaser.visual.x - r * 0.32, Chaser.visual.y - r * 0.22, er, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(Chaser.visual.x + r * 0.32, Chaser.visual.y - r * 0.22, er, 0, Math.PI * 2);
  ctx.fill();
}

function drawBeatPulse() {
  if (beatPulse <= 0.02) return;
  ctx.strokeStyle = `rgba(255,255,255,${beatPulse * 0.3})`;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
}

function drawHUD() {
  const fs = Math.max(10, Math.floor(cellSize * 0.42));
  ctx.textBaseline = 'top';

  // Beat counter (top-left)
  if (gameState === STATE.PLAYING) {
    ctx.fillStyle = 'rgba(224,224,224,0.7)';
    ctx.font = `${fs}px monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(`beat ${beatNumber}`, 6, 6);
  }

  // Score (top-right)
  ctx.fillStyle = COLORS.hud;
  ctx.font = `bold ${fs}px monospace`;
  ctx.textAlign = 'right';
  ctx.fillText(score, canvas.width - 6, 6);

  // Chaser countdown
  if (gameState === STATE.PLAYING && !Chaser.active && !Chaser.eliminated && beatNumber < CHASER_SPAWN) {
    ctx.fillStyle = 'rgba(233,69,96,0.9)';
    ctx.font = `${fs}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`chaser in ${CHASER_SPAWN - beatNumber} beats`, canvas.width / 2, 6);
  }

  // Power-up indicators
  let py = Math.floor(cellSize * 0.55);
  ctx.textAlign = 'left';
  if (slowLeft > 0) {
    ctx.fillStyle = COLORS.apple;
    ctx.font = `${fs}px monospace`;
    ctx.fillText(`slow  x${slowLeft}`, 6, py);
    py += fs + 4;
  }
  if (starLeft > 0) {
    ctx.fillStyle = COLORS.star;
    ctx.font = `${fs}px monospace`;
    ctx.fillText(`star  x${starLeft}`, 6, py);
  }

  // High score (bottom center)
  ctx.fillStyle = 'rgba(224,224,224,0.4)';
  ctx.font = `${Math.floor(fs * 0.85)}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(`best: ${highScore}`, canvas.width / 2, canvas.height - 4);
}

function drawOverlay() {
  if      (gameState === STATE.TITLE)     drawTitle();
  else if (gameState === STATE.COUNTDOWN) drawCountdown();
  else if (gameState === STATE.WIN)       drawEnd('YOU ESCAPED!', COLORS.apple);
  else if (gameState === STATE.LOSE)      drawEnd('CAUGHT!', COLORS.chaser);
}

function drawTitle() {
  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const cs = cellSize;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(cs * 1.4)}px monospace`;
  ctx.fillText('ECHO', cx, cy - cs * 1.6);

  ctx.fillStyle = '#aaa';
  ctx.font = `${Math.floor(cs * 0.52)}px monospace`;
  ctx.fillText('RHYTHM MAZE', cx, cy - cs * 0.55);

  const blink = Math.sin(Date.now() / 480) > 0;
  if (blink) {
    ctx.fillStyle = COLORS.portal;
    ctx.font = `${Math.floor(cs * 0.46)}px monospace`;
    ctx.fillText('PRESS  ENTER  TO  START', cx, cy + cs * 0.75);
  }

  ctx.fillStyle = '#555';
  ctx.font = `${Math.floor(cs * 0.36)}px monospace`;
  ctx.fillText('WASD / ARROWS to move  ·  move on the beat', cx, cy + cs * 1.75);

  ctx.fillStyle = COLORS.apple;
  ctx.fillText('green = slow time', cx - cs * 1.8, cy + cs * 2.45);
  ctx.fillStyle = COLORS.star;
  ctx.fillText('gold = invincible', cx, cy + cs * 2.45);
  ctx.fillStyle = COLORS.portal;
  ctx.fillText('cyan = portal', cx + cs * 1.7, cy + cs * 2.45);
}

function drawCountdown() {
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.floor(cellSize * 2.8)}px monospace`;
  ctx.fillText(countdownVal > 0 ? String(countdownVal) : 'GO!', canvas.width / 2, canvas.height / 2);
}

function drawEnd(msg, color) {
  ctx.fillStyle = COLORS.overlay;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const cs = cellSize;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.fillStyle = color;
  ctx.font = `bold ${Math.floor(cs * 0.95)}px monospace`;
  ctx.fillText(msg, cx, cy - cs * 0.9);

  ctx.fillStyle = '#fff';
  ctx.font = `${Math.floor(cs * 0.68)}px monospace`;
  ctx.fillText(`score: ${score}`, cx, cy + cs * 0.35);

  if (score > 0 && score >= highScore) {
    ctx.fillStyle = COLORS.star;
    ctx.font = `${Math.floor(cs * 0.48)}px monospace`;
    ctx.fillText('NEW HIGH SCORE!', cx, cy + cs * 1.15);
  }

  const blink = Math.sin(Date.now() / 500) > 0;
  if (blink) {
    ctx.fillStyle = '#aaa';
    ctx.font = `${Math.floor(cs * 0.42)}px monospace`;
    ctx.fillText('PRESS ENTER TO RESTART', cx, cy + cs * 1.95);
  }
}

// ── Storage ────────────────────────────────────────────────────────────────

function saveHigh(s) {
  if (s > highScore) {
    highScore = s;
    localStorage.setItem('echo-maze-hs', s);
  }
}

function loadHigh() {
  highScore = parseInt(localStorage.getItem('echo-maze-hs') || '0', 10);
}

// ── Input ──────────────────────────────────────────────────────────────────

document.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    if (gameState === STATE.TITLE) {
      enterCountdown();
    } else if (gameState === STATE.WIN || gameState === STATE.LOSE) {
      Beat.stop();
      gameState = STATE.TITLE;
    }
    return;
  }
  if (gameState === STATE.PLAYING) {
    const dir = KEY_MAP[e.key];
    if (dir) { e.preventDefault(); Input.push(dir); }
  }
});

// ── Init ───────────────────────────────────────────────────────────────────

function initGame() {
  canvas = document.getElementById('game-canvas');
  ctx    = canvas.getContext('2d');

  const size = Math.min(window.innerWidth, window.innerHeight) * 0.9;
  cellSize   = Math.floor(Math.min(size, 630) / CELL_COUNT);
  canvas.width  = cellSize * CELL_COUNT;
  canvas.height = cellSize * CELL_COUNT;

  loadHigh();
  activeItems = JSON.parse(JSON.stringify(ITEM_DEFS));

  requestAnimationFrame(renderLoop);
}

window.addEventListener('load', initGame);
