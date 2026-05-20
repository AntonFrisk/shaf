package maze

import (
	"bytes"
	"compress/gzip"
	"encoding/base64"
	"encoding/json"
	"errors"
	"io"
)

var errInvalidShare = errors.New("invalid share payload")

// EncodeShare compresses a layout to a URL-safe base64 string.
func EncodeShare(l Layout) (string, error) {
	raw, err := json.Marshal(l)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	zw := gzip.NewWriter(&buf)
	if _, err := zw.Write(raw); err != nil {
		return "", err
	}
	if err := zw.Close(); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf.Bytes()), nil
}

// DecodeShare restores a layout from an encoded share string.
func DecodeShare(payload string) (Layout, error) {
	data, err := base64.RawURLEncoding.DecodeString(payload)
	if err != nil {
		return Layout{}, errInvalidShare
	}
	zr, err := gzip.NewReader(bytes.NewReader(data))
	if err != nil {
		return Layout{}, errInvalidShare
	}
	defer zr.Close()
	raw, err := io.ReadAll(zr)
	if err != nil {
		return Layout{}, errInvalidShare
	}
	var l Layout
	if err := json.Unmarshal(raw, &l); err != nil {
		return Layout{}, errInvalidShare
	}
	if err := l.Normalize(); err != nil {
		return Layout{}, err
	}
	return l, nil
}
