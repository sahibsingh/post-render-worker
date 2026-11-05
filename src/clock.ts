import type { Script } from "./types";

/** Same timing rules as the app's subtitle engine: 25 seconds, fixed opening and closing, the points share the rest. */
export const VIDEO_SECONDS = 25;
const CLOSE = 4.2;
const MIN_HOLD = 3.2;
const words = (t: string) => t.split(/\s+/).filter(Boolean).length;

export function planClock(script: Script) {
  const openEnd = script.stat ? 4.6 : 3.6;
  const window = VIDEO_SECONDS - CLOSE - openEnd;
  const n = Math.max(1, Math.min(script.beats.length, Math.floor(window / MIN_HOLD)));
  const weights = script.beats.slice(0, n).map((b) => 0.7 + Math.min(1.2, words(`${b.head} ${b.line}`) / 14));
  const sum = weights.reduce((a, b) => a + b, 0);
  const holds = weights.map((w) => (window * w) / sum);
  const starts: number[] = [];
  let t = openEnd;
  for (const h of holds) { starts.push(t); t += h; }
  return { openEnd, n, holds, starts, closeAt: t, total: VIDEO_SECONDS };
}
