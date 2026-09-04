/**
 * Time-independent scalar helpers for the brand avatar. Every function here is
 * pure and clock-free so a frame can be reproduced from `(state, time)` alone.
 */

export const TAU = Math.PI * 2;
export const DEG = TAU / 360;

export const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

export const clamp01 = (value: number): number => clamp(value, 0, 1);

export const lerp = (from: number, to: number, weight: number): number =>
  from + (to - from) * weight;

/**
 * Exponential ease-out. The reference this avatar imitates never overshoots on
 * the body, so transitions use this rather than a spring.
 */
export const easeOutExpo = (t: number): number => {
  const x = clamp01(t);
  return x >= 1 ? 1 : 1 - 2 ** (-10 * x);
};

export const easeOutCubic = (t: number): number => 1 - (1 - clamp01(t)) ** 3;

/** Signed oscillation in -1..1 at `hz` cycles per unit of time. */
export const wave = (time: number, hz: number, phase = 0): number =>
  Math.sin((time * hz + phase) * TAU);

/** Unsigned oscillation in 0..1. */
export const oscillate = (time: number, hz: number, phase = 0): number =>
  0.5 + wave(time, hz, phase) / 2;

/** Hop envelope in 0..1 that lands hard and leaves soft. */
export const hop = (time: number, hz: number, phase = 0): number =>
  Math.abs(Math.sin((time * hz + phase) * Math.PI));

/** Deterministic 0..1 value for an integer key — used to schedule blinks. */
const hash01 = (key: number): number => {
  const x = Math.sin(key * 127.1 + 311.7) * 43_758.545_3;
  return x - Math.floor(x);
};

/**
 * Smooth aperiodic drift in -1..1. Three incommensurable sines read as organic
 * over any window a viewer will watch, and cost three `sin` calls.
 */
export const drift = (time: number, seed = 0): number =>
  (Math.sin(time * 1.13 + seed * 1.7) +
    0.62 * Math.sin(time * 0.47 + seed * 4.1) +
    0.4 * Math.sin(time * 0.19 + seed * 8.3)) /
  2.02;

/** Fractional part, always in 0..1 including for negative input. */
export const fract = (value: number): number => value - Math.floor(value);

/**
 * Blink closure in 0..1 (1 = shut). Blinks are scheduled from a hash of the
 * interval index, so the rhythm is irregular yet identical on every replay.
 */
export const blink = (time: number, period: number, seed = 0): number => {
  const index = Math.floor(time / period);
  const jitter = hash01(index + seed) * period * 0.62;
  const local = time - index * period - jitter;
  const CLOSE = 0.115;
  if (local < 0 || local > CLOSE) {
    // A second blink follows the first often enough to notice its absence.
    const doubled = hash01(index + seed + 0.5) > 0.68;
    const second = local - CLOSE - 0.09;
    if (!doubled || second < 0 || second > CLOSE) {
      return 0;
    }
    return Math.sin((second / CLOSE) * Math.PI);
  }
  return Math.sin((local / CLOSE) * Math.PI);
};
