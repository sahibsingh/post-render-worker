import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { rm } from "node:fs/promises";

const FFMPEG = process.env.FFMPEG_BIN || "ffmpeg";
const FFPROBE = process.env.FFPROBE_BIN || "ffprobe";
const MAX_VOICE_SECONDS = 23;
const MAX_TEMPO = 1.3;
const VOICE_START_MS = 500;

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
  const text = value.replace(/[^ऀ-ॿ0-9\s.,!?।'-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 700);
  return (text.match(/[ऀ-ॿ]/g) ?? []).length >= 10 ? text : null;
}

/** How much to speed the voice up so it ends before the video does (never above 1.3x; beyond that the end is cut). */
export const tempoFor = (voiceSeconds) => Math.min(MAX_TEMPO, Math.max(1, voiceSeconds / MAX_VOICE_SECONDS));

/** ffmpeg arguments that lay the voice over the video. With music, the music drops to 30% so the voice stays clear. */
export function mixArgs({ video, voice, output, hasMusic, tempo, seconds }) {
  const speak = `[1:a]atempo=${tempo.toFixed(3)},adelay=${VOICE_START_MS}|${VOICE_START_MS},volume=1.5`;
  const graph = hasMusic
    ? `[0:a]volume=0.3[m];${speak}[v];[m][v]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`
    : `${speak},apad[a]`;
  return ["-y", "-loglevel", "error", "-i", video, "-i", voice, "-filter_complex", graph, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "128k", "-t", String(seconds), output];
}

const durationOf = async (file) => Number((await run(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file])).trim());
const hasAudio = async (file) => (await run(FFPROBE, ["-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", file])).trim() !== "";

/**
 * Speaks the text with Piper (a separate program, needs PIPER_MODEL) and mixes it into the video.
 * Returns the path of the finished file, or the original path if there is nothing to say or the voice could not be made:
 * a video without voice is better than a job that keeps failing.
 */
export async function addVoice(videoPath, rawText, log = () => {}) {
  const text = cleanVoiceText(rawText);
  const model = process.env.PIPER_MODEL;
  if (!text || !model) return videoPath;
  const wav = `${videoPath}.voice.wav`;
  const output = `${videoPath}.mixed.mp4`;
  try {
    await run(process.env.PYTHON_BIN || "python3", ["-m", "piper", "-m", model, "-f", wav], text);
    const [voiceSeconds, videoSeconds, music] = await Promise.all([durationOf(wav), durationOf(videoPath), hasAudio(videoPath)]);
    await run(FFMPEG, mixArgs({ video: videoPath, voice: wav, output, hasMusic: music, tempo: tempoFor(voiceSeconds), seconds: videoSeconds.toFixed(2) }));
    log(`voice added (${voiceSeconds.toFixed(1)} s)`);
    return output;
  } catch (error) {
    log(`voice skipped: ${error instanceof Error ? error.message : "failed"}`);
    await rm(output, { force: true });
    return videoPath;
  } finally {
    await rm(wav, { force: true });
  }
}

export const tempDir = os.tmpdir;
