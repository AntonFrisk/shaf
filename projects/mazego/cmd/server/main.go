package main

import (
	"log"
	"net/http"
	"os"

	"github.com/softhouse-af/shaf/projects/maze/api"
)

func main() {
	addr := os.Getenv("PORT")
	if addr == "" {
		addr = "8080"
	}
	addr = ":" + addr
	log.Printf("echo maze game listening on %s", addr)

	mux := http.NewServeMux()
	mux.Handle("/api/", api.NewHandler())
	mux.Handle("/", http.FileServer(http.Dir("web")))

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatal(err)
	}
}
