import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { cleanPayload } from "./payload.mjs";
import { beatCountFor, mixVoice, prepareVoice } from "./voice.mjs";

let serveUrl;

/**
 * Draws one job to an MP4 in a temp folder. The bundle is built once and reused for every job in this run.
 * With a voice, one line is spoken per scene first and the scenes are timed to those lines, so the picture and the voice move together.
 */
export async function renderJob(job) {
  const { inputProps, webgl, voiceSegments } = cleanPayload(job.composition, job.payload);
  serveUrl ??= await bundle({ entryPoint: path.resolve("src/index.ts") });
  const output = path.join(os.tmpdir(), `${job.id}.mp4`);
  const log = (message) => console.log(`job ${job.id} ${message}`);
  const voice = await prepareVoice({ segments: voiceSegments, beatCount: beatCountFor(inputProps.script), hasStat: Boolean(inputProps.script.stat), base: output, log });
  const props = { ...inputProps, timing: voice?.timing ?? null };

  const chromiumOptions = webgl ? { gl: "swangle" } : {};
  const browserExecutable = process.env.BROWSER_EXECUTABLE || null;
  // A custom Chromium (for example one Playwright installed) needs chromeMode set, usually "chrome-for-testing".
  const chromeMode = process.env.CHROME_MODE || undefined;
  const composition = await selectComposition({ serveUrl, id: job.composition, inputProps: props, browserExecutable, chromiumOptions, chromeMode });
  await renderMedia({
    composition, serveUrl, inputProps: props, outputLocation: output, codec: "h264", crf: 23,
    scale: Number(process.env.RENDER_SCALE || 2 / 3), concurrency: process.env.RENDER_CONCURRENCY ? Number(process.env.RENDER_CONCURRENCY) : null,
    browserExecutable, chromiumOptions, chromeMode, timeoutInMilliseconds: 180_000, logLevel: "error",
  });
  const finished = voice ? await mixVoice(output, voice, log) : output;
  return { path: finished, seconds: composition.durationInFrames / composition.fps };
}
