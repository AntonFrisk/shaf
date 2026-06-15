package maze

type cellKey struct{ r, c int }

// Validate checks that a walkable path exists from start to goal using BFS.
// Grid uses 1 for walls; teleports are traversed in one step.
func Validate(l Layout) ValidateResult {
	if err := l.Normalize(); err != nil {
		return ValidateResult{Solvable: false, Error: err.Error()}
	}
	if !l.IsWalkable(l.Start) {
		return ValidateResult{Solvable: false, Error: "start is not walkable"}
	}
	if !l.IsWalkable(l.Goal) {
		return ValidateResult{Solvable: false, Error: "goal is not walkable"}
	}

	visited := make(map[cellKey]bool)
	parent := make(map[cellKey]cellKey)
	queue := []Point{l.Start}
	visited[cellKey{l.Start.Row, l.Start.Col}] = true
	visitedCount := 1

	dirs := []Point{{-1, 0}, {1, 0}, {0, -1}, {0, 1}}

	for len(queue) > 0 {
		cur := queue[0]
		queue = queue[1:]
		if cur.Row == l.Goal.Row && cur.Col == l.Goal.Col {
			path := reconstruct(parent, l.Start, l.Goal)
			return ValidateResult{
				Solvable:     true,
				PathLength:   len(path),
				Path:         path,
				VisitedCells: visitedCount,
			}
		}
		for _, d := range dirs {
			next := Point{cur.Row + d.Row, cur.Col + d.Col}
			if !l.IsWalkable(next) {
				continue
			}
			if dest, ok := l.TeleportDest(next); ok && l.IsWalkable(dest) {
				next = dest
			}
			k := cellKey{next.Row, next.Col}
			if visited[k] {
				continue
			}
			visited[k] = true
			visitedCount++
			parent[k] = cellKey{cur.Row, cur.Col}
			queue = append(queue, next)
		}
	}

	return ValidateResult{Solvable: false, VisitedCells: visitedCount}
}

func reconstruct(parent map[cellKey]cellKey, start, goal Point) []Point {
	gk := cellKey{goal.Row, goal.Col}
	sk := cellKey{start.Row, start.Col}
	path := []Point{goal}
	for cur := gk; cur != sk; {
		p, ok := parent[cur]
		if !ok {
			return nil
		}
		path = append([]Point{{p.r, p.c}}, path...)
		cur = p
	}
	return path
}
