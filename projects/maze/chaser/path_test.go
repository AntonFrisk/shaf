package chaser

import (
	"testing"

	"github.com/softhouse-af/shaf/projects/maze/maze"
)

func TestNextStep_movesTowardPlayer(t *testing.T) {
	layout := maze.Layout{
		Grid: [][]int{
			{0, 0, 0, 0},
			{0, 1, 1, 0},
			{0, 0, 0, 0},
		},
		Start: maze.Point{0, 0},
		Goal:  maze.Point{2, 3},
		Width: 4,
		Height: 3,
	}
	res := NextStep(StepRequest{
		Layout: layout,
		Chaser: maze.Point{0, 0},
		Player: maze.Point{2, 3},
	})
	if res.Blocked {
		t.Fatal("expected chaser step")
	}
	if res.Next == (maze.Point{0, 0}) {
		t.Fatalf("chaser should move, got %+v", res)
	}
}
