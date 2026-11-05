import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { cleanPayload } from "./payload.mjs";

let serveUrl;

/** Draws one job to an MP4 in a temp folder. The bundle is built once and reused for every job in this run. */
export async function renderJob(job) {
  const { inputProps, webgl } = cleanPayload(job.composition, job.payload);
  serveUrl ??= await bundle({ entryPoint: path.resolve("src/index.ts") });
  const chromiumOptions = webgl ? { gl: "swangle" } : {};
  const browserExecutable = process.env.BROWSER_EXECUTABLE || null;
  // A custom Chromium (for example one Playwright installed) needs chromeMode set, usually "chrome-for-testing".
  const chromeMode = process.env.CHROME_MODE || undefined;
  const composition = await selectComposition({ serveUrl, id: job.composition, inputProps, browserExecutable, chromiumOptions, chromeMode });
  const output = path.join(os.tmpdir(), `${job.id}.mp4`);
  await renderMedia({
    composition, serveUrl, inputProps, outputLocation: output, codec: "h264", crf: 23,
    scale: Number(process.env.RENDER_SCALE || 2 / 3), concurrency: process.env.RENDER_CONCURRENCY ? Number(process.env.RENDER_CONCURRENCY) : null,
    browserExecutable, chromiumOptions, chromeMode, timeoutInMilliseconds: 180_000, logLevel: "error",
  });
  return { path: output, seconds: composition.durationInFrames / composition.fps };
}
