.PHONY: test run wasm build

test:
	go test ./...

run:
	go run ./cmd/server

wasm:
	GOOS=js GOARCH=wasm go build -o dist/maze.wasm ./wasm
	cp "$(shell go env GOROOT)/misc/wasm/wasm_exec.js" dist/wasm_exec.js

build:
	go build -o bin/maze-server ./cmd/server
