package chaser

import (
	"container/heap"

	"github.com/softhouse-af/shaf/projects/maze/maze"
)

// StepRequest is one beat of chaser movement.
type StepRequest struct {
	Layout    maze.Layout `json:"layout"`
	Chaser    maze.Point  `json:"chaser"`
	Player    maze.Point  `json:"player"`
	LookAhead int         `json:"look_ahead,omitempty"`
}

// StepResult is the next tile for the chaser.
type StepResult struct {
	Next     maze.Point   `json:"next"`
	Path     []maze.Point `json:"path,omitempty"`
	Distance int          `json:"distance,omitempty"`
	Blocked  bool         `json:"blocked"`
}

// NextStep runs A* toward the player (with optional anticipation offset).
func NextStep(req StepRequest) StepResult {
	layout := req.Layout
	if err := layout.Normalize(); err != nil {
		return StepResult{Blocked: true}
	}
	target := req.Player
	if req.LookAhead > 0 {
		target = anticipate(layout, req.Player, req.Chaser, req.LookAhead)
	}
	path, dist, ok := astar(layout, req.Chaser, target)
	if !ok || len(path) < 2 {
		return StepResult{Blocked: true, Distance: dist}
	}
	return StepResult{
		Next:     path[1],
		Path:     path,
		Distance: dist,
	}
}

func anticipate(layout maze.Layout, player, chaser maze.Point, steps int) maze.Point {
	dr := player.Row - chaser.Row
	dc := player.Col - chaser.Col
	if dr == 0 && dc == 0 {
		return player
	}
	if dr != 0 {
		dr = sign(dr)
	}
	if dc != 0 {
		dc = sign(dc)
	}
	t := player
	for i := 0; i < steps; i++ {
		n := maze.Point{t.Row + dr, t.Col + dc}
		if layout.IsWalkable(n) {
			t = n
		}
	}
	return t
}

func sign(v int) int {
	if v < 0 {
		return -1
	}
	return 1
}

type node struct {
	p     maze.Point
	g, f  int
	index int
}

type pq []*node

func (h pq) Len() int           { return len(h) }
func (h pq) Less(i, j int) bool { return h[i].f < h[j].f }
func (h pq) Swap(i, j int) {
	h[i], h[j] = h[j], h[i]
	h[i].index = i
	h[j].index = j
}
func (h *pq) Push(x any) {
	n := x.(*node)
	n.index = len(*h)
	*h = append(*h, n)
}
func (h *pq) Pop() any {
	old := *h
	n := len(old) - 1
	item := old[n]
	old[n] = nil
	item.index = -1
	*h = old[:n]
	return item
}

func astar(layout maze.Layout, start, goal maze.Point) ([]maze.Point, int, bool) {
	if !layout.IsWalkable(start) || !layout.IsWalkable(goal) {
		return nil, 0, false
	}
	key := func(p maze.Point) int { return p.Row*layout.Width + p.Col }
	open := &pq{}
	heap.Init(open)
	heap.Push(open, &node{p: start, g: 0, f: manhattan(start, goal)})

	cameFrom := map[int]maze.Point{}
	gScore := map[int]int{key(start): 0}
	closed := map[int]bool{}
	dirs := []maze.Point{{-1, 0}, {1, 0}, {0, -1}, {0, 1}}

	for open.Len() > 0 {
		cur := heap.Pop(open).(*node)
		ck := key(cur.p)
		if closed[ck] {
			continue
		}
		closed[ck] = true
		if cur.p.Row == goal.Row && cur.p.Col == goal.Col {
			return rebuildPath(cameFrom, key, start, goal), cur.g, true
		}
		for _, d := range dirs {
			next := maze.Point{cur.p.Row + d.Row, cur.p.Col + d.Col}
			if !layout.IsWalkable(next) {
				continue
			}
			if dest, ok := layout.TeleportDest(next); ok {
				next = dest
			}
			nk := key(next)
			if closed[nk] {
				continue
			}
			tentative := cur.g + 1
			if prev, ok := gScore[nk]; ok && tentative >= prev {
				continue
			}
			cameFrom[nk] = cur.p
			gScore[nk] = tentative
			heap.Push(open, &node{p: next, g: tentative, f: tentative + manhattan(next, goal)})
		}
	}
	return nil, 0, false
}

func manhattan(a, b maze.Point) int {
	dr, dc := a.Row-b.Row, a.Col-b.Col
	if dr < 0 {
		dr = -dr
	}
	if dc < 0 {
		dc = -dc
	}
	return dr + dc
}

func rebuildPath(cameFrom map[int]maze.Point, key func(maze.Point) int, start, goal maze.Point) []maze.Point {
	path := []maze.Point{goal}
	cur := goal
	for cur.Row != start.Row || cur.Col != start.Col {
		prev, ok := cameFrom[key(cur)]
		if !ok {
			return nil
		}
		path = append([]maze.Point{prev}, path...)
		cur = prev
	}
	return path
}
