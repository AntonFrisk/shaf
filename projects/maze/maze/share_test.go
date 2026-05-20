package maze

import "testing"

func TestShareRoundTrip(t *testing.T) {
	layout := Layout{
		Grid: [][]int{{0, 0}, {0, 0}},
		Start: Point{0, 0},
		Goal:  Point{1, 1},
	}
	payload, err := EncodeShare(layout)
	if err != nil {
		t.Fatal(err)
	}
	got, err := DecodeShare(payload)
	if err != nil {
		t.Fatal(err)
	}
	if got.Goal.Row != layout.Goal.Row || got.Goal.Col != layout.Goal.Col {
		t.Fatalf("goal mismatch: %+v", got.Goal)
	}
}
