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
	log.Printf("echo maze game API listening on %s", addr)
	if err := http.ListenAndServe(addr, api.NewHandler()); err != nil {
		log.Fatal(err)
	}
}
