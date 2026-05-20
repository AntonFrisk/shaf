# shaf

SH AF repo.

## Echo Maze (Rhythm Maze)

Go game backend and WASM core live in [`projects/maze`](projects/maze):

- HTTP API: `make -C projects/maze run` (default port `8080`)
- WASM build: `make -C projects/maze wasm` (outputs `projects/maze/dist/`)
- Tests: `make -C projects/maze test`
