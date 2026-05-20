package maze

import "testing"

func TestValidate_solvableWithTeleports(t *testing.T) {
	layout := Layout{
		Grid: [][]int{
			{0, 0, 0},
			{1, 1, 0},
			{0, 0, 0},
		},
		Start: Point{0, 0},
		Goal:  Point{2, 2},
		Teleports: []TeleportPair{
			{ID: "blue", From: Point{0, 2}, To: Point{2, 0}, Color: "blue"},
		},
	}
	res := Validate(layout)
	if !res.Solvable {
		t.Fatalf("expected solvable maze, got %+v", res)
	}
	if res.PathLength < 3 {
		t.Fatalf("expected path length >= 3, got %d", res.PathLength)
	}
}

func TestValidate_blockedByWall(t *testing.T) {
	layout := Layout{
		Grid: [][]int{
			{0, 1, 0},
			{0, 1, 0},
			{0, 1, 0},
		},
		Start: Point{0, 0},
		Goal:  Point{2, 2},
	}
	res := Validate(layout)
	if res.Solvable {
		t.Fatal("expected unsolvable maze")
	}
}
