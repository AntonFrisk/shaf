export type Language = "en" | "sv";

export const LANGUAGES: { code: Language; label: Record<Language, string> }[] = [
  { code: "en", label: { en: "English", sv: "Engelska" } },
  { code: "sv", label: { en: "Swedish", sv: "Svenska" } },
];

export interface Translations {
  metaTitle: string;
  metaDescription: string;
  boardAria: string;
  mazeSize: string;
  language: string;
  toolbarHint: string;
  rhythmMaze: string;
  pressEnterStart: string;
  moveOnBeat: string;
  greenSlowTime: string;
  goldInvincible: string;
  cyanPortal: string;
  beat: (n: number) => string;
  chaserInBeats: (n: number) => string;
  slowPower: (n: number) => string;
  starPower: (n: number) => string;
  best: (n: number) => string;
  go: string;
  youEscaped: string;
  caught: string;
  score: (n: number) => string;
  newHighScore: string;
  pressEnterRestart: string;
}

const en: Translations = {
  metaTitle: "Echo — Rhythm Maze",
  metaDescription:
    "A rhythm-locked maze chase. Move on the beat, escape before the chaser hunts you down.",
  boardAria: "Echo Rhythm Maze game board",
  mazeSize: "maze size",
  language: "language",
  toolbarHint: "Enter to play · WASD / arrows on the beat",
  rhythmMaze: "RHYTHM MAZE",
  pressEnterStart: "PRESS  ENTER  TO  START",
  moveOnBeat: "WASD / ARROWS  ·  move on the beat",
  greenSlowTime: "green = slow time",
  goldInvincible: "gold = invincible",
  cyanPortal: "cyan = portal",
  beat: (n) => `beat ${n}`,
  chaserInBeats: (n) => `chaser in ${n} beats`,
  slowPower: (n) => `slow  x${n}`,
  starPower: (n) => `star  x${n}`,
  best: (n) => `best: ${n}`,
  go: "GO!",
  youEscaped: "YOU ESCAPED!",
  caught: "CAUGHT!",
  score: (n) => `score: ${n}`,
  newHighScore: "NEW HIGH SCORE!",
  pressEnterRestart: "PRESS ENTER TO RESTART",
};

const sv: Translations = {
  metaTitle: "Echo — Rytmlabyrint",
  metaDescription:
    "En rytmstyrd labyrintjakt. Rör dig i takt och fly innan jägaren fångar dig.",
  boardAria: "Echo Rytmlabyrint spelplan",
  mazeSize: "labyrintstorlek",
  language: "språk",
  toolbarHint: "Tryck Enter för att spela · WASD / piltangenter i takt",
  rhythmMaze: "RYTMLABYRINT",
  pressEnterStart: "TRYCK  ENTER  FÖR  ATT  STARTA",
  moveOnBeat: "WASD / PILTANGENTER  ·  rör dig i takt",
  greenSlowTime: "grön = saktar ner tiden",
  goldInvincible: "guld = osårbar",
  cyanPortal: "cyan = portal",
  beat: (n) => `takt ${n}`,
  chaserInBeats: (n) => `jägare om ${n} takter`,
  slowPower: (n) => `långsamt  x${n}`,
  starPower: (n) => `stjärna  x${n}`,
  best: (n) => `bästa: ${n}`,
  go: "KÖR!",
  youEscaped: "DU SLAPP UT!",
  caught: "FÅNGAD!",
  score: (n) => `poäng: ${n}`,
  newHighScore: "NYTT REKORD!",
  pressEnterRestart: "TRYCK ENTER FÖR ATT SPELA IGEN",
};

export const translations: Record<Language, Translations> = { en, sv };

export function t(lang: Language): Translations {
  return translations[lang];
}
