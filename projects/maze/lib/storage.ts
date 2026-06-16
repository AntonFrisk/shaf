import { DEFAULT_UPGRADES, UpgradeId, UpgradeLevels } from "./upgrades";

const HS_KEY = "echo-maze-hs";
const COINS_KEY = "echo-maze-coins";
const UPGRADES_KEY = "echo-maze-upgrades";

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

export function loadCoins(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(window.localStorage.getItem(COINS_KEY) || "0", 10) || 0;
}

export function saveCoins(coins: number): void {
  window.localStorage.setItem(COINS_KEY, String(Math.max(0, coins)));
}

export function addCoins(amount: number): number {
  const next = loadCoins() + amount;
  saveCoins(next);
  return next;
}

export function spendCoins(amount: number): boolean {
  const current = loadCoins();
  if (current < amount) return false;
  saveCoins(current - amount);
  return true;
}

export function loadUpgrades(): UpgradeLevels {
  if (typeof window === "undefined") return { ...DEFAULT_UPGRADES };
  try {
    const raw = window.localStorage.getItem(UPGRADES_KEY);
    if (!raw) return { ...DEFAULT_UPGRADES };
    const parsed = JSON.parse(raw) as Partial<UpgradeLevels>;
    return { ...DEFAULT_UPGRADES, ...parsed };
  } catch {
    return { ...DEFAULT_UPGRADES };
  }
}

export function saveUpgrades(levels: UpgradeLevels): void {
  window.localStorage.setItem(UPGRADES_KEY, JSON.stringify(levels));
}

export function buyUpgrade(id: UpgradeId, maxLevel: number, cost: number): UpgradeLevels | null {
  const levels = loadUpgrades();
  if (levels[id] >= maxLevel || !spendCoins(cost)) return null;
  levels[id] += 1;
  saveUpgrades(levels);
  return levels;
}
