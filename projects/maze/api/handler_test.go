package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestValidateEndpoint(t *testing.T) {
	body := `{"grid":[[0,0],[0,0]],"start":{"row":0,"col":0},"goal":{"row":1,"col":1}}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/game/maze/validate", bytes.NewBufferString(body))
	rec := httptest.NewRecorder()
	NewHandler().ServeHTTP(rec, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("status %d body %s", rec.Code, rec.Body.String())
	}
	var res struct {
		Solvable bool `json:"solvable"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &res); err != nil || !res.Solvable {
		t.Fatalf("unexpected response: %s", rec.Body.String())
	}
}
