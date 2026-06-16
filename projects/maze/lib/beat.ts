import { BPM_DEFAULT, SCHED_AHEAD, SCHED_TICK_MS, SpeedMultiplier, bpmForSpeed, schedTickMsForSpeed } from "./types";

type BeatCallback = (beatNumber: number) => void;

/**
 * Low-latency beat scheduler on the Web Audio clock (ported from the `Beat`
 * object in game.js). A lookahead loop schedules oscillator "clicks" ahead of
 * time for tight timing, and fires `onBeat` on the main thread aligned to each
 * audio beat. AudioContext must be (re)started from a user gesture.
 */
export class BeatEngine {
  private audioCtx: AudioContext | null = null;
  private nextBeatTime = 0;
  private speed: SpeedMultiplier = 1;
  private baseBpm = BPM_DEFAULT;
  private intervalSec = 60 / BPM_DEFAULT;
  private schedTickMs = SCHED_TICK_MS;
  private timer: ReturnType<typeof setInterval> | null = null;
  private beatNumber = 0;

  onBeat: BeatCallback | null = null;
  /** Set to 1 on each beat by the scheduler; the render loop decays it. */
  pulse = 0;

  get currentBeat() {
    return this.beatNumber;
  }

  init() {
    if (this.audioCtx) void this.audioCtx.close();
    const Ctor =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.audioCtx = new Ctor();
    this.intervalSec = 60 / this.baseBpm;
    this.beatNumber = 0;
    this.pulse = 0;
  }

  setSpeedMultiplier(speed: SpeedMultiplier) {
    this.speed = speed;
    this.baseBpm = bpmForSpeed(speed);
    this.schedTickMs = schedTickMsForSpeed(speed);
    this.intervalSec = 60 / this.baseBpm;
    this.restartSchedulerIfRunning();
  }

  getSpeedMultiplier() {
    return this.speed;
  }

  getBaseBpm() {
    return this.baseBpm;
  }

  start() {
    if (!this.audioCtx) this.init();
    void this.audioCtx!.resume();
    this.nextBeatTime = this.audioCtx!.currentTime + 0.08;
    this.timer = setInterval(() => this.schedule(), this.schedTickMs);
  }

  stop() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  setBPM(bpm: number) {
    this.intervalSec = 60 / bpm;
  }

  resetBPM() {
    this.intervalSec = 60 / this.baseBpm;
  }

  private restartSchedulerIfRunning() {
    if (this.timer === null) return;
    clearInterval(this.timer);
    this.timer = setInterval(() => this.schedule(), this.schedTickMs);
  }

  private schedule() {
    const ctx = this.audioCtx;
    if (!ctx) return;
    const limit = ctx.currentTime + SCHED_AHEAD;
    while (this.nextBeatTime < limit) {
      this.scheduleBeat(this.nextBeatTime);
      this.nextBeatTime += this.intervalSec;
    }
  }

  private scheduleBeat(time: number) {
    const ctx = this.audioCtx!;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = this.beatNumber % 4 === 0 ? 1200 : 880; // accent the downbeat
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
    osc.start(time);
    osc.stop(time + 0.06);

    const delayMs = Math.max(0, (time - ctx.currentTime) * 1000);
    const captured = this.beatNumber;
    this.beatNumber++;
    setTimeout(() => {
      this.pulse = 1.0;
      this.onBeat?.(captured);
    }, delayMs);
  }
}
