# Echo — Rhythm Maze (Next.js Edition)

A rhythm-locked maze chase. Every move is quantized to the beat: press a
direction off-beat and it buffers to the next beat. Reach the exit before the
A\*-driven chaser hunts you down.

This is a Next.js / React rewrite of the original Go + canvas game in
[`../mazego`](../mazego). All game logic — A\* pathfinding, BFS solvability,
maze generation, and the Web Audio beat clock — runs **client-side in
TypeScript**, so there is no backend and it deploys to Vercel with zero config.

## Play

- **Enter** — start / restart
- **WASD** or **Arrow keys** — move (only registers on the beat)
- **maze size** dropdown — 15×15 / 21×21 / 31×31, a fresh random maze each game

Power-ups:

- 🟢 **green (apple)** — slows the beat to 60% for 8 beats (more time to think)
- ⭐ **gold (star)** — invincible for 8 beats; touch the chaser to destroy it
- 🔵 **cyan (portal)** — paired teleports, preserves your rhythm step

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
components/Game.tsx   'use client' — canvas render loop, input, state machine, HUD
lib/
  types.ts            shared types + tunable constants (BPM, colors, spawn beat)
  grid.ts             walkability, stepping, teleport lookup
  astar.ts            A* chaser pathfinding with anticipation
  validate.ts         BFS start→goal solvability check
  generate.ts         randomized maze generator + power-up placement
  beat.ts             Web Audio lookahead beat scheduler
  storage.ts          localStorage high score
  share.ts            base64 layout codec (for future shareable maps)
```
