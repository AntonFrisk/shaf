# Echo — Rhythm Maze (Next.js Edition)

A rhythm-locked maze chase. Every move is quantized to the beat: press a
direction off-beat and it buffers to the next beat. Reach the exit before the
A\*-driven chaser hunts you down.

This is a Next.js / React rewrite of the original Go + canvas game in
[`../mazego`](../mazego). All game logic — A\* pathfinding, BFS solvability,
maze generation, and the Web Audio beat clock — runs **client-side in
TypeScript**, so there is no backend and it deploys to Vercel with zero config.

## How to Play

The main page opens with a **how-to-play guide**. Click **Play now** or press
**Enter** to reach the settings screen, then press **Enter** again to start a
run. Press **Esc** to cancel back to the guide.

- **Enter** — continue from guide / start or restart a run on the settings screen
- **Esc** — cancel back to the guide (or abort an active run to settings)
- **WASD** or **Arrow keys** — move (only registers on the beat)
- **maze size** dropdown — 15×15 / 21×21 / 31×31, a fresh random maze each game
- **speed** slider — 1× to 5× beat tempo (🐢 → 🚀)
- **upgrade shop** — spend persistent coins on run bonuses between games

Power-ups:

- 🟢 **green (apple)** — slows the beat to 60% for 8 beats (more time to think)
- ⭐ **gold (star)** — invincible for 8 beats; touch the chaser to destroy it
- ❄️ **ice (snowflake)** — freezes the chaser for 2 beats
- 🔵 **cyan (portal)** — paired teleports, preserves your rhythm step
- 🟠 **orange (coin)** — off the shortest route; adds score and persistent coins

The chaser spawns after 10 beats and uses A\* with anticipation: it projects
your heading a couple of steps ahead to cut you off at intersections.

## Develop

```bash
npm install
npm run dev      # http://localhost:3000
```

```bash
npm run build    # production build (also what Vercel runs)
npm start        # serve the production build
```

Requires Node 18.18+ (developed on Node 22+).

## Deploy to Vercel

This app lives in a monorepo subdirectory. When importing the repo into Vercel:

1. **Root Directory** → set to `projects/maze`.
2. Framework preset auto-detects **Next.js**; no env vars are required.

Or from the CLI inside this folder: `npx vercel` (preview) / `npx vercel --prod`.

## Structure

```
app/                 Next.js App Router (layout, page, global styles)
components/
  Guide.tsx           landing-page how-to-play guide with Play now CTA
  Game.tsx            'use client' — canvas render loop, input, state machine, HUD
lib/
  types.ts            shared types + tunable constants (BPM, colors, spawn beat)
  grid.ts             walkability, stepping, teleport lookup
  astar.ts            A* chaser pathfinding with anticipation
  validate.ts         BFS start→goal solvability check
  generate.ts         randomized maze generator + power-up placement
  beat.ts             Web Audio lookahead beat scheduler
  storage.ts          localStorage high score, coins, and upgrades
  upgrades.ts         upgrade definitions and costs
  share.ts            base64 layout codec (for future shareable maps)
```
