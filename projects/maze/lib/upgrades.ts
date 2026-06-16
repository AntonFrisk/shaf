export type UpgradeId = "chaserDelay" | "slowExt" | "starExt" | "coinBonus" | "survivalBoost";

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  description: string;
  cost: number;
  maxLevel: number;
}

export const UPGRADES: UpgradeDef[] = [
  {
    id: "chaserDelay",
    name: "Chaser Delay",
    description: "+2 beats before chaser spawns",
    cost: 50,
    maxLevel: 3,
  },
  {
    id: "slowExt",
    name: "Slow Extension",
    description: "+2 slow-mo beats per apple",
    cost: 40,
    maxLevel: 3,
  },
  {
    id: "starExt",
    name: "Star Extension",
    description: "+2 invincible beats per star",
    cost: 60,
    maxLevel: 3,
  },
  {
    id: "coinBonus",
    name: "Coin Bonus",
    description: "+25 score per coin collected",
    cost: 30,
    maxLevel: 3,
  },
  {
    id: "survivalBoost",
    name: "Survival Boost",
    description: "+5 score per beat survived",
    cost: 80,
    maxLevel: 2,
  },
];

export type UpgradeLevels = Record<UpgradeId, number>;

export const DEFAULT_UPGRADES: UpgradeLevels = {
  chaserDelay: 0,
  slowExt: 0,
  starExt: 0,
  coinBonus: 0,
  survivalBoost: 0,
};

export function upgradeCost(def: UpgradeDef, level: number): number {
  return def.cost * (level + 1);
}
