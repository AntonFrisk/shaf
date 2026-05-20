package maze

// Point is a grid cell (row, col).
type Point struct {
	Row int `json:"row"`
	Col int `json:"col"`
}

// TeleportPair links two portal cells of the same color id.
type TeleportPair struct {
	ID    string `json:"id"`
	From  Point  `json:"from"`
	To    Point  `json:"to"`
	Color string `json:"color,omitempty"`
}

// Layout is the canonical maze payload shared by API and WASM.
type Layout struct {
	Grid      [][]int         `json:"grid"`
	Start     Point           `json:"start"`
	Goal      Point           `json:"goal"`
	Teleports []TeleportPair  `json:"teleports,omitempty"`
	Width     int             `json:"width,omitempty"`
	Height    int             `json:"height,omitempty"`
}

// ValidateResult is returned by maze validation.
type ValidateResult struct {
	Solvable       bool     `json:"solvable"`
	PathLength     int      `json:"path_length,omitempty"`
	Path           []Point  `json:"path,omitempty"`
	VisitedCells   int      `json:"visited_cells,omitempty"`
	Error          string   `json:"error,omitempty"`
}
