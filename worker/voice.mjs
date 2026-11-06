import { execFile } from "node:child_process";
import path from "node:path";
import { rm } from "node:fs/promises";

const FFMPEG = process.env.FFMPEG_BIN || "ffmpeg";
const FFPROBE = process.env.FFPROBE_BIN || "ffprobe";
const PYTHON = process.env.PYTHON_BIN || "python3";

export const VIDEO_SECONDS = 25;
const LEAD = 0.35;
const OPEN_TAIL = 0.7;
const BEAT_TAIL = 0.6;
const CLOSE_TAIL = 1.0;
const MIN_HOLD = 3.2;
const MIN_CLOSE = 4.2;
const MAX_TEMPO = 1.3;
const MAX_STRETCH = 1.3;

const run = (file, args, input) => new Promise((resolve, reject) => {
  const child = execFile(file, args, { timeout: 180_000, maxBuffer: 4 * 1024 * 1024 }, (error, stdout, stderr) => (error ? reject(new Error(`${path.basename(file)} failed: ${error.code === "ENOENT" ? "not installed" : String(stderr || error.message).replace(/\s+/g, " ").slice(0, 160)}`)) : resolve(String(stdout))));
  if (input !== undefined) child.stdin.end(input);
});

/**
 * The voiceover text comes from a database row and this repository is public, so it is reduced to Devanagari letters, digits and
 * plain punctuation before it reaches the speech program. Anything else is dropped; too little text means no voiceover.
 */
export function cleanVoiceText(value) {
  if (typeof value !== "string") return null;
  const text = value.replace(/[^ऀ-ॿ0-9\s.,!?।'-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 400);
  return (text.match(/[ऀ-ॿ]/g) ?? []).length >= 6 ? text : null;
}

/** One cleaned line per scene: the title, each point and the closing line. Missing or unusable lines become null (that scene stays silent). */
export function cleanSegments(value) {
  return (Array.isArray(value) ? value : []).slice(0, 8).map((v) => cleanVoiceText(v));
}

/** How many points the video shows (the same rule as src/clock.ts, which cannot be imported from plain JavaScript). */
export const beatCountFor = (script) => Math.max(1, Math.min(script.beats.length, Math.floor((VIDEO_SECONDS - MIN_CLOSE - (script.stat ? 4.6 : 3.6)) / MIN_HOLD)));

const total = (t) => t.open + t.holds.reduce((a, b) => a + b, 0) + t.close;

/** Scene lengths for voice lines of the given lengths (seconds, title first and closing last), the voice played `tempo` times faster. */
export function planTiming(durations, hasStat, tempo = 1) {
  const n = durations.length - 2;
  return {
    open: Math.max(hasStat ? 4.6 : 3.6, durations[0] / tempo + LEAD + OPEN_TAIL),
    holds: durations.slice(1, 1 + n).map((d) => Math.max(MIN_HOLD, d / tempo + LEAD + BEAT_TAIL)),
    close: Math.max(MIN_CLOSE, durations[n + 1] / tempo + LEAD + CLOSE_TAIL),
  };
}

/** The slowest the voice may be spoken (never above 1.3) so that the scenes still fit in 25 seconds; below 1.05 it is not worth redoing. */
export function stretchFor(durations, hasStat) {
  let best = 1;
  for (let s = 1; s <= MAX_STRETCH + 1e-9; s += 0.02) {
    if (total(planTiming(durations.map((d) => d * s), hasStat)) <= VIDEO_SECONDS) best = s; else break;
  }
  return best;
}

/**
 * Fits scene lengths and voice speed into 25 seconds: speeds the voice up (at most 1.3x) when the lines are long, and hands any
 * time left over to the points so the video always lasts the full 25 seconds. Returns the timing, the tempo and each scene's start.
 */
export function fitTiming(durations, hasStat) {
  let tempo = 1;
  let timing = planTiming(durations, hasStat, tempo);
  while (total(timing) > VIDEO_SECONDS && tempo < MAX_TEMPO - 1e-9) { tempo = Math.min(MAX_TEMPO, tempo + 0.05); timing = planTiming(durations, hasStat, tempo); }
  const over = total(timing) - VIDEO_SECONDS;
  if (over > 0) {
    // Still too long at the fastest speed: take the rest out of the points (never below 2.6 seconds each).
    const room = timing.holds.reduce((a, h) => a + Math.max(0, h - 2.6), 0);
    const cut = room > 0 ? Math.min(1, over / room) : 0;
    timing = { ...timing, holds: timing.holds.map((h) => h - Math.max(0, h - 2.6) * cut) };
  } else if (over < 0 && timing.holds.length) {
    const extra = -over / timing.holds.length;
    timing = { ...timing, holds: timing.holds.map((h) => h + extra) };
  }
  const starts = [0, timing.open];
  timing.holds.forEach((h, i) => starts.push(starts[i + 1] + h));
  return { timing, tempo, starts };
}

/** ffmpeg arguments laying each voice line at the start of its scene over the video; with music, the music drops to 30%. */
export function mixArgs({ video, voices, output, hasMusic, tempo, seconds }) {
  const inputs = ["-i", video, ...voices.flatMap((v) => ["-i", v.file])];
  const parts = voices.map((v, i) => `[${i + 1}:a]atempo=${tempo.toFixed(3)},adelay=${Math.round(v.start * 1000)}|${Math.round(v.start * 1000)},volume=1.5[v${i}]`);
  const labels = voices.map((_, i) => `[v${i}]`).join("");
  const graph = hasMusic
    ? `${parts.join(";")};[0:a]volume=0.3[m];[m]${labels}amix=inputs=${voices.length + 1}:duration=first:dropout_transition=0:normalize=0[a]`
    : `${parts.join(";")};${labels}amix=inputs=${voices.length}:duration=longest:dropout_transition=0:normalize=0[mx];[mx]apad[a]`;
  return ["-y", "-loglevel", "error", ...inputs, "-filter_complex", graph, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-t", String(seconds), output];
}

const durationOf = async (file) => Number((await run(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file])).trim());
const hasAudio = async (file) => (await run(FFPROBE, ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file])).trim() !== "";

async function speak(texts, base, lengthScale) {
  const files = [];
  const durations = [];
  for (let i = 0; i < texts.length; i += 1) {
    const file = `${base}.voice-${i}.wav`;
    if (!texts[i]) { files.push(null); durations.push(0); continue; }
    await run(PYTHON, ["-m", "piper", "-m", process.env.PIPER_MODEL, "-f", file, "--length-scale", lengthScale.toFixed(2)], texts[i]);
    files.push(file);
    durations.push(await durationOf(file));
  }
  return { files, durations };
}

/**
 * Speaks one line per scene and works out the scene lengths that follow the voice. Returns null when there is nothing to say or the
 * voice cannot be made (a video without voice is better than a job that keeps failing); the caller renders with the default timing.
 * `segments` is title, points..., closing; `beatCount` is how many points the video shows.
 */
export async function prepareVoice({ segments, beatCount, hasStat, base, log = () => {} }) {
  if (!process.env.PIPER_MODEL) return null;
  const all = cleanSegments(segments);
  if (all.length < 3 || all.filter(Boolean).length < 2) return null;
  const texts = [all[0], ...all.slice(1, 1 + beatCount), all[all.length - 1]];
  const made = [];
  try {
    let { files, durations } = await speak(texts, base, 1);
    made.push(...files);
    const stretch = stretchFor(durations, hasStat);
    if (stretch > 1.05) {
      const slower = await speak(texts, base, stretch);
      made.push(...slower.files);
      files = slower.files; durations = slower.durations;
      log(`voice slowed to ${stretch.toFixed(2)}x to fill the video`);
    }
    const fit = fitTiming(durations, hasStat);
    const voices = files.map((file, i) => (file ? { file, start: fit.starts[i] + LEAD } : null)).filter(Boolean);
    log(`voice fitted: ${durations.reduce((a, b) => a + b, 0).toFixed(1)} s of speech, tempo ${fit.tempo.toFixed(2)}`);
    return { timing: fit.timing, tempo: fit.tempo, voices, files: [...new Set(made.filter(Boolean))] };
  } catch (error) {
    log(`voice skipped: ${error instanceof Error ? error.message : "failed"}`);
    await Promise.all(made.filter(Boolean).map((f) => rm(f, { force: true })));
    return null;
  }
}

/** Mixes the prepared voice into the rendered video. Returns the finished path, or the original if mixing fails. */
export async function mixVoice(videoPath, prepared, log = () => {}) {
  const output = `${videoPath}.mixed.mp4`;
  try {
    const seconds = (await durationOf(videoPath)).toFixed(2);
    const music = await hasAudio(videoPath);
    await run(FFMPEG, mixArgs({ video: videoPath, voices: prepared.voices, output, hasMusic: music, tempo: prepared.tempo, seconds }));
    log("voice added");
    return output;
  } catch (error) {
    log(`voice skipped: ${error instanceof Error ? error.message : "failed"}`);
    await rm(output, { force: true });
    return videoPath;
  } finally {
    await Promise.all(prepared.files.map((f) => rm(f, { force: true })));
  }
}
