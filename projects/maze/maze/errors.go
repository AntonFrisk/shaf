package maze

import "errors"

var (
	errEmptyGrid  = errors.New("grid must not be empty")
	errRaggedGrid = errors.New("grid rows must have equal width")
)
