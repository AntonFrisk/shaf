# Echo Maze — game backend

Go HTTP API and shared game logic for the **maze** project (Echo / Rhythm Maze). Implemented in [SOF-18](https://linear.app/softhouse-af/issue/SOF-18/create-backend-for-the-game); lives in the `shaf` monorepo under `projects/maze`.

## Prerequisites

- [Go](https://go.dev/dl/) **1.22+** (`go version` should report 1.22 or newer)
- Optional: `make` (Windows: use Git Bash, WSL, or run the `go` commands below directly)

## Run in development

From the repo root:

```bash
make -C projects/maze run
```

Or from this directory:

```bash
cd projects/maze
go run ./cmd/server
```

The API listens on **`:8080`** by default. Override the port:

```bash
# Linux / macOS / Git Bash
PORT=3000 go run ./cmd/server

# PowerShell
$env:PORT = "3000"; go run ./cmd/server
```

You should see:

```text
echo maze game API listening on :8080
```

CORS is enabled for browser clients (`Access-Control-Allow-Origin: *`).

## Test

### Automated tests

```bash
make -C projects/maze test
# or
cd projects/maze && go test ./...
```

Covers maze validation, share encode/decode, chaser pathfinding, and HTTP handlers.

### Manual API checks

With the server running, use these examples (adjust host/port if needed).

**Health**

```bash
curl -s http://localhost:8080/health
```

Expected: `{"status":"ok","service":"echo-maze-game"}`

**Validate maze** — `POST /api/v1/game/maze/validate`

Grid cells: `0` = walkable, `1` = wall. `start` and `goal` must be on walkable cells.

```bash
curl -s -X POST http://localhost:8080/api/v1/game/maze/validate \
  -H "Content-Type: application/json" \
  -d '{"grid":[[0,0],[0,0]],"start":{"row":0,"col":0},"goal":{"row":1,"col":1}}'
```

Expected: `"solvable":true` (and optional `path`, `path_length`).

**Share encode / decode** — `POST /api/v1/game/maze/share/encode` and `.../decode`

```bash
# Encode layout to a share payload string
curl -s -X POST http://localhost:8080/api/v1/game/maze/share/encode \
  -H "Content-Type: application/json" \
  -d '{"grid":[[0,0],[0,0]],"start":{"row":0,"col":0},"goal":{"row":1,"col":1}}'

# Decode (use payload from encode response)
curl -s -X POST http://localhost:8080/api/v1/game/maze/share/decode \
  -H "Content-Type: application/json" \
  -d '{"payload":"<paste-payload-here>"}'
```

**Chaser step** — `POST /api/v1/game/chaser/step`

Returns the chaser’s next tile for one beat (A* toward the player; optional `look_ahead` for anticipation).

```bash
curl -s -X POST http://localhost:8080/api/v1/game/chaser/step \
  -H "Content-Type: application/json" \
  -d '{
    "layout": {"grid":[[0,0,0],[0,1,0],[0,0,0]],"start":{"row":0,"col":0},"goal":{"row":2,"col":2}},
    "chaser": {"row":0,"col":2},
    "player": {"row":2,"col":0},
    "look_ahead": 2
  }'
```

Expected: `"next"` with the next chaser cell, or `"blocked":true` if no move exists.

### PowerShell alternative

```powershell
Invoke-RestMethod -Uri http://localhost:8080/health
```

Use `-Method Post -ContentType "application/json" -Body '{"grid":...}'` for POST endpoints.

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness check |
| `POST` | `/api/v1/game/maze/validate` | BFS solvability check (start → goal) |
| `POST` | `/api/v1/game/maze/share/encode` | Layout → share payload string |
| `POST` | `/api/v1/game/maze/share/decode` | Share payload → layout |
| `POST` | `/api/v1/game/chaser/step` | One chaser movement step |

All POST bodies are JSON. Errors return JSON with an `error` field and appropriate HTTP status.

## Project layout

```text
projects/maze/
├── api/           # HTTP handlers
├── cmd/server/    # Dev server entrypoint
├── maze/          # Layout, validation, share codec
├── chaser/        # Chaser pathfinding (A*)
├── wasm/          # WASM build (client-side core)
├── Makefile
└── go.mod
```

## Other commands

```bash
make -C projects/maze build   # binary → projects/maze/bin/maze-server
make -C projects/maze wasm    # WASM → projects/maze/dist/
```

## Related

- Monorepo overview: [`README.md`](../../README.md)
- Frontend work: [SOF-19](https://linear.app/softhouse-af/issue/SOF-19/create-frontend-for-the-maze-game)
