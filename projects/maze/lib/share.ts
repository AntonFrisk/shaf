import { Layout } from "./types";

/**
 * Lightweight map-sharing codec — JSON → URL-safe base64. Mirrors the intent of
 * maze/share.go (which used gzip+base64); kept dependency-free for the browser.
 * Provided for shareable map URLs once the editor lands.
 */
export function encodeLayout(layout: Layout): string {
  const json = JSON.stringify(layout);
  const b64 = typeof window === "undefined" ? Buffer.from(json).toString("base64") : window.btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeLayout(payload: string): Layout {
  const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
  const json =
    typeof window === "undefined"
      ? Buffer.from(b64, "base64").toString("utf-8")
      : decodeURIComponent(escape(window.atob(b64)));
  return JSON.parse(json) as Layout;
}
