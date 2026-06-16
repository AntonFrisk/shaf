"use client";

import { useEffect } from "react";
import { COLORS, SPEED_EMOJIS, SPEED_OPTIONS } from "@/lib/types";

interface GuideProps {
  onPlay: () => void;
}

const ITEMS = [
  {
    color: COLORS.apple,
    label: "Slow-Mo Apple",
    desc: "Collect up to 3. Press Space during a run to slow the beat to 60% for 8 beats — green trails show when slow-mo is active.",
    glyph: "apple",
  },
  {
    color: COLORS.star,
    label: "Power Star",
    desc: "Instant invincibility for 8 beats. Touch the chaser to destroy it for bonus points — it respawns from the start after 2 seconds.",
    glyph: "star",
  },
  {
    color: COLORS.snowflake,
    label: "Snowflake",
    desc: "Instantly freezes the chaser for 2 beats while you slip away.",
    glyph: "snowflake",
  },
  {
    color: COLORS.portal,
    label: "Portal",
    desc: "Paired cyan rings. Step in to teleport across the maze on the same beat.",
    glyph: "portal",
  },
  {
    color: COLORS.coin,
    label: "Coin",
    desc: "Orange coins sit off the shortest route. Collect them for score and persistent currency.",
    glyph: "coin",
  },
  {
    color: COLORS.exit,
    label: "Exit",
    desc: "Reach the glowing red goal tile before the chaser catches you.",
    glyph: "exit",
  },
] as const;

export default function Guide({ onPlay }: GuideProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter") onPlay();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onPlay]);

  return (
    <div className="guide">
      <header className="guide-hero">
        <div className="guide-logo" aria-hidden>
          <span className="guide-logo-echo">ECHO</span>
          <span className="guide-logo-sub">Rhythm Maze</span>
        </div>
        <p className="guide-tagline">
          Move on the beat. Escape the maze. Outrun the chaser.
        </p>
        <button type="button" className="guide-cta" onClick={onPlay}>
          Play now
        </button>
        <p className="guide-cta-hint">
          Press Enter to continue · maze size, speed &amp; upgrades on the next screen
        </p>
      </header>

      <section className="guide-section" aria-labelledby="how-to-play">
        <h2 id="how-to-play">How to play</h2>
        <div className="guide-cards">
          <article className="guide-card">
            <div className="guide-visual guide-visual-beat" aria-hidden>
              <div className="beat-ring beat-ring-1" />
              <div className="beat-ring beat-ring-2" />
              <div className="beat-core" />
            </div>
            <h3>On the beat</h3>
            <p>
              Every step happens on the music beat. Press early and your move
              buffers until the next beat — stay in rhythm to stay alive.
            </p>
          </article>

          <article className="guide-card">
            <div className="guide-visual guide-visual-maze" aria-hidden>
              <div className="mini-maze">
                <div className="mini-wall" />
                <div className="mini-path" />
                <div className="mini-player" />
                <div className="mini-chaser" />
                <div className="mini-exit">X</div>
              </div>
            </div>
            <h3>Race the chaser</h3>
            <p>
              You have 10 beats of head start. Then a smart AI spawns and hunts
              you with pathfinding — it even cuts you off at intersections.
            </p>
          </article>

          <article className="guide-card">
            <div className="guide-visual guide-visual-keys" aria-hidden>
              <kbd>W</kbd>
              <div className="keys-row">
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd>
              </div>
            </div>
            <h3>Controls</h3>
            <p>
              Use <strong>WASD</strong> or <strong>arrow keys</strong> to move.
              Press <strong>Space</strong> to activate a stored green apple.
              Press <strong>Enter</strong> on the settings screen to start.
              Press <strong>Esc</strong> to cancel back to the guide.
            </p>
          </article>

          <article className="guide-card">
            <div className="guide-visual guide-visual-speed" aria-hidden>
              {SPEED_OPTIONS.map((s) => (
                <span key={s} className="guide-speed-emoji">
                  {SPEED_EMOJIS[s]}
                </span>
              ))}
            </div>
            <h3>Settings screen</h3>
            <p>
              Choose maze size, set speed from 1× to 5×, and spend coins on
              upgrades before you press Enter to start a run.
            </p>
          </article>
        </div>
      </section>

      <section className="guide-section" aria-labelledby="power-ups">
        <h2 id="power-ups">Special items</h2>
        <ul className="guide-items">
          {ITEMS.map((item) => (
            <li key={item.label} className="guide-item">
              <div
                className={`guide-item-icon guide-item-icon-${item.glyph}`}
                style={{ "--item-color": item.color } as React.CSSProperties}
                aria-hidden
              />
              <div>
                <h3>{item.label}</h3>
                <p>{item.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="guide-section" aria-labelledby="upgrades">
        <h2 id="upgrades">Coins &amp; upgrades</h2>
        <div className="guide-cards">
          <article className="guide-card">
            <h3>Earn coins</h3>
            <p>
              Coins spawn on detour tiles away from the shortest path. Grab them
              during a run to boost your score and fill your persistent coin bank.
            </p>
          </article>
          <article className="guide-card">
            <h3>Upgrade shop</h3>
            <p>
              Spend coins in the sidebar to unlock chaser delay, longer power-ups,
              bigger coin bonuses, and extra survival score between runs.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
