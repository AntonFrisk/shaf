"use client";

import { useEffect } from "react";
import { COLORS } from "@/lib/types";

interface GuideProps {
  onPlay: () => void;
}

const ITEMS = [
  {
    color: COLORS.apple,
    label: "Slow-Mo Apple",
    desc: "Slows the beat to 60% for 8 beats — more time to plan your route.",
    glyph: "apple",
  },
  {
    color: COLORS.star,
    label: "Power Star",
    desc: "Turn invincible for 8 beats. Touch the chaser to destroy it for bonus points.",
    glyph: "star",
  },
  {
    color: COLORS.portal,
    label: "Portal",
    desc: "Paired cyan rings. Step in to teleport across the maze on the same beat.",
    glyph: "portal",
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
        <p className="guide-cta-hint">Press Enter to continue · pick maze size on the next screen</p>
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
              Press <strong>Enter</strong> on the settings screen to start, or to restart after a round.
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
    </div>
  );
}
