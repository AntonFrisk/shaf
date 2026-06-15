Project Echo: Rhythm Maze (Web App Edition)

1. Product Overview

Echo is a rhythmic, turn-based maze chase game where every player movement is bound to the beat of the background music. Players navigate grid-based labyrinths using keyboard controls, racing to the exit before an aggressive AI chaser spawns and hunts them down. The web app version focuses on desktop accessibility, precise keyboard inputs, and an integrated browser-based maze editor.

2. Core Game Loop & Web Adaptation

Gameplay Mechanics

Rhythm-Locked Steps: The game does not run in fluid real-time. Instead, it is quantized. The player can only move exactly on the beat (or upbeats) of the track. If a player presses a directional key off-beat, the input is buffered and executes on the next valid beat.

The Chaser Spawn: A countdown timer (X seconds) triggers at the start of the level. When it hits zero, a "smart and evil" AI chaser spawns at the player's starting location or a designated spawn point.

The Chase: The chaser moves precisely one tile per beat, hunting the player down using optimized pathfinding.

Platform Shift: Smartphone to Web App

Feature

Smartphone App (Original)

Web App (Desktop Target)

Input Controls

Screen sides / Tap zones

Keyboard (WASD / Arrow Keys) for movement; Spacebar for specialized items.

Screen Layout

Vertical portrait orientation

Responsive Canvas (16:9 or 4:3) centered on screen, optimized for monitors.

Performance

Native mobile rendering (iOS/Android)

Web Graphics Library (WebGL) / HTML5 Canvas running at 60+ FPS across modern browsers.

Audio Engine

Mobile media players (latency risks)

Web Audio API to guarantee precise, low-latency audio scheduling and beat-matching.

3. Functional Requirements

3.1 Gameplay Elements & Power-ups

Slow-Mo Warp-Apples: Consuming an apple slows down the track's BPM (Beats Per Minute) by 30-50% for a set number of beats. This expands the real-time window between beats, granting the player more physical time to process routing decisions.

Stars (Power Pellets): Temporarily transforms the player into an "attacker" for a duration of 8-16 beats. During this state, touching the chaser eliminates it, granting massive bonus points and resetting its spawn timer.

Color-Coded Teleports: Paired portal tiles. Stepping into a blue portal instantly moves the player to the corresponding blue portal on the other side of the maze, preserving the rhythm step.

Maps: A collectible item that temporarily overlays a glowing path (the shortest route) toward the maze exit on the UI.

3.2 The Chaser AI Requirements

To make the AI feel "smart and evil," it utilizes a multi-state pathfinding engine rather than basic direct tracking:

A* Pathfinding Base: Calculates the shortest legal path to the player's current tile on every single beat.

Anticipation Logic (The "Evil" Factor): The AI analyzes the player's movement vectors. If the player is moving consistently in one direction, the AI calculates pathfinding 2-3 steps ahead to cut the player off at intersections rather than blindly trailing behind.

Flanking/Trap Behavior: In mazes with multiple paths, the AI prioritizes routing that cuts off known escape routes or teleports if it detects the player heading toward one.

3.3 Audio Engine & Beat Synchronization

Low-Latency Precision: Uses the Web Audio API to handle sound playback. Visual cues (e.g., a pulsing UI border or grid lines) must sync perfectly with audio timestamps.

Input Window: Generates a strict timing window (e.g., ±150ms around the exact beat peak) where player inputs are registered as "Perfect" or "Good." Inputs outside this window are buffered to prevent desynchronization.

4. Maze Editor & Sharing Tool

The web app includes an in-browser creation suite, utilizing mouse and keyboard layouts for quick building.

Editor Features

Grid Sandbox: Click-and-drag mechanics to place walls, paths, player spawns, chaser spawns, items (apples, stars, maps), and linked teleports.

Randomized Maze Generator: An integrated tool using standard maze-generation algorithms (like randomized Prim's or Kruskal's algorithm) to instantly deploy a valid, solvable maze layout based on user-defined dimensions (e.g., 15x15, 30x30).

Validation Check: A mandatory automated test run. The editor will not allow a user to save or export a maze unless the internal pathfinding algorithm verifies that a valid path exists from the Start tile to the Exit tile.

Web Export/Share: Generates a lightweight string payload (compressed JSON base64) containing the map data. Users can copy a unique URL slug to share their custom map directly with others.

5. Technical Stack & Architecture

Frontend Engine: GO paired with HTML5 Canvas API or a 2D web gaming library to manage the rendering loop.

Audio Pipeline: Web Audio API for accurate hardware-synced clock timing independent of main thread performance lags.

Storage: LocalStorage or IndexedDB for saving local high scores, custom maps, and editor drafts without requiring a mandatory user account.

6. Success Metrics & Quality Assurance

Audio-Visual Sync: Sub-10ms variance between visual beat pulses and audio track peaks across major browsers (Chrome, Safari, Firefox, Edge).

Input Responsiveness: No dropped keystrokes during rapid succession movement tests.

Solvability Guarantee: 100% of randomized mazes generated by the system must possess an open, unblocked path to the goal.