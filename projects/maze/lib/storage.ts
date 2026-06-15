const HS_KEY = "echo-maze-hs";

export function loadHighScore(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(window.localStorage.getItem(HS_KEY) || "0", 10) || 0;
}

export function saveHighScore(score: number): number {
  const current = loadHighScore();
  if (score > current) {
    window.localStorage.setItem(HS_KEY, String(score));
    return score;
  }
  return current;
}
