package maze

const wallCell = 1

// Normalize fills width/height and validates grid shape.
func (l *Layout) Normalize() error {
	if len(l.Grid) == 0 {
		return errEmptyGrid
	}
	h := len(l.Grid)
	w := len(l.Grid[0])
	for _, row := range l.Grid {
		if len(row) != w {
			return errRaggedGrid
		}
	}
	if l.Height == 0 {
		l.Height = h
	}
	if l.Width == 0 {
		l.Width = w
	}
	return nil
}

func (l *Layout) inBounds(p Point) bool {
	return p.Row >= 0 && p.Row < l.Height && p.Col >= 0 && p.Col < l.Width
}

// IsWalkable reports whether a cell can be entered (not a wall, in bounds).
func (l *Layout) IsWalkable(p Point) bool {
	if !l.inBounds(p) {
		return false
	}
	return l.Grid[p.Row][p.Col] != wallCell
}

// TeleportDest returns the paired portal destination when stepping on a portal.
func (l *Layout) TeleportDest(p Point) (Point, bool) {
	for _, tp := range l.Teleports {
		if tp.From.Row == p.Row && tp.From.Col == p.Col {
			return tp.To, true
		}
	}
	return Point{}, false
}
