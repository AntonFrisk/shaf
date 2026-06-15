import type { Language } from "./i18n";

const HS_KEY = "echo-maze-hs";
const LANG_KEY = "echo-maze-lang";

export function loadHighScore(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(window.localStorage.getItem(HS_KEY) || "0", 10) || 0;
}

export function loadLanguage(): Language {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(LANG_KEY);
  return stored === "sv" ? "sv" : "en";
}

export function saveLanguage(lang: Language): void {
  window.localStorage.setItem(LANG_KEY, lang);
}

export function saveHighScore(score: number): number {
  const current = loadHighScore();
  if (score > current) {
    window.localStorage.setItem(HS_KEY, String(score));
    return score;
  }
  return current;
}
