//go:build js && wasm

package main

import (
	"encoding/json"
	"syscall/js"

	"github.com/softhouse-af/shaf/projects/maze/chaser"
	"github.com/softhouse-af/shaf/projects/maze/maze"
)

func main() {
	exports := js.Global().Get("GoMaze")
	if exports.IsUndefined() {
		exports = js.Global()
	}
	exports.Set("validateMaze", js.FuncOf(validateMaze))
	exports.Set("encodeShare", js.FuncOf(encodeShare))
	exports.Set("decodeShare", js.FuncOf(decodeShare))
	exports.Set("chaserStep", js.FuncOf(chaserStep))
	select {}
}

func validateMaze(_ js.Value, args []js.Value) any {
	in := args[0].String()
	var layout maze.Layout
	if err := json.Unmarshal([]byte(in), &layout); err != nil {
		return errString(err)
	}
	out, _ := json.Marshal(maze.Validate(layout))
	return string(out)
}

func encodeShare(_ js.Value, args []js.Value) any {
	in := args[0].String()
	var layout maze.Layout
	if err := json.Unmarshal([]byte(in), &layout); err != nil {
		return errString(err)
	}
	payload, err := maze.EncodeShare(layout)
	if err != nil {
		return errString(err)
	}
	out, _ := json.Marshal(map[string]string{"payload": payload})
	return string(out)
}

func decodeShare(_ js.Value, args []js.Value) any {
	in := args[0].String()
	var body struct {
		Payload string `json:"payload"`
	}
	if err := json.Unmarshal([]byte(in), &body); err != nil {
		return errString(err)
	}
	layout, err := maze.DecodeShare(body.Payload)
	if err != nil {
		return errString(err)
	}
	out, _ := json.Marshal(layout)
	return string(out)
}

func chaserStep(_ js.Value, args []js.Value) any {
	in := args[0].String()
	var req chaser.StepRequest
	if err := json.Unmarshal([]byte(in), &req); err != nil {
		return errString(err)
	}
	out, _ := json.Marshal(chaser.NextStep(req))
	return string(out)
}

func errString(err error) string {
	b, _ := json.Marshal(map[string]string{"error": err.Error()})
	return string(b)
}
