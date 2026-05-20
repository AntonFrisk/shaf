package api

import (
	"encoding/json"
	"net/http"

	"github.com/softhouse-af/shaf/projects/maze/chaser"
	"github.com/softhouse-af/shaf/projects/maze/maze"
)

// Handler serves stateless game API endpoints.
type Handler struct {
	mux *http.ServeMux
}

func NewHandler() *Handler {
	h := &Handler{mux: http.NewServeMux()}
	h.mux.HandleFunc("GET /health", h.health)
	h.mux.HandleFunc("POST /api/v1/game/maze/validate", h.validateMaze)
	h.mux.HandleFunc("POST /api/v1/game/maze/share/encode", h.encodeShare)
	h.mux.HandleFunc("POST /api/v1/game/maze/share/decode", h.decodeShare)
	h.mux.HandleFunc("POST /api/v1/game/chaser/step", h.chaserStep)
	return h
}

func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	h.mux.ServeHTTP(w, r)
}

func (h *Handler) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "echo-maze-game"})
}

func (h *Handler) validateMaze(w http.ResponseWriter, r *http.Request) {
	var body maze.Layout
	if !decodeJSON(w, r, &body) {
		return
	}
	writeJSON(w, http.StatusOK, maze.Validate(body))
}

func (h *Handler) encodeShare(w http.ResponseWriter, r *http.Request) {
	var body maze.Layout
	if !decodeJSON(w, r, &body) {
		return
	}
	payload, err := maze.EncodeShare(body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"payload": payload})
}

func (h *Handler) decodeShare(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Payload string `json:"payload"`
	}
	if !decodeJSON(w, r, &body) {
		return
	}
	layout, err := maze.DecodeShare(body.Payload)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, layout)
}

func (h *Handler) chaserStep(w http.ResponseWriter, r *http.Request) {
	var body chaser.StepRequest
	if !decodeJSON(w, r, &body) {
		return
	}
	writeJSON(w, http.StatusOK, chaser.NextStep(body))
}

func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) bool {
	if r.Method != http.MethodPost {
		writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return false
	}
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid json"})
		return false
	}
	return true
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
