import assert from "node:assert/strict";
import { writeFile } from "node:fs/promises";
import test from "node:test";
import { cleanPayload } from "./payload.mjs";
import { processJob } from "./process.mjs";

const job = (extra = {}) => ({ id: "j1", post_id: "p1", composition: "Pulse", template_id: "motion-pulse", reel_hash: "abc", result_path: "w/p/reel.mp4", attempts: 1, payload: {}, ...extra });

function fakeClient(log, { uploadError = null } = {}) {
  const table = (name) => ({
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { metadata: { topic: "x", publish: { container: "old" }, reel: { path: "old" } } } }) }) }),
    update: (patch) => ({ eq: async (_c, id) => { log.push({ table: name, id, patch }); return { error: null }; } }),
  });
  return { from: table, storage: { from: () => ({ upload: async (path, bytes, opts) => { log.push({ upload: path, size: bytes.length, opts }); return { error: uploadError }; } }) } };
}
const render = async () => { await writeFile("/tmp/j1.mp4", "video"); return { path: "/tmp/j1.mp4", seconds: 25 }; };

test("a rendered job is stored, recorded on the post and marked done, and old publishing progress is dropped", async () => {
  const log = [];
  assert.equal(await processJob(fakeClient(log), job(), { bucket: "media", render }), "done");
  assert.deepEqual(log[0], { upload: "w/p/reel.mp4", size: 5, opts: { contentType: "video/mp4", upsert: true } });
  const post = log.find((l) => l.table === "posts");
  assert.equal(post.patch.metadata.reel.hash, "abc");
  assert.equal(post.patch.metadata.reel.durationSeconds, 25);
  assert.equal(post.patch.metadata.template_id, "motion-pulse");
  assert.equal(post.patch.metadata.publish, undefined);
  assert.equal(post.patch.metadata.topic, "x");
  assert.equal(log.find((l) => l.table === "render_jobs").patch.status, "done");
});

test("a failed render goes back to the queue until the third try, and the error text hides URLs", async () => {
  for (const [attempts, status] of [[1, "queued"], [2, "queued"], [3, "failed"]]) {
    const log = [];
    const result = await processJob(fakeClient(log), job({ attempts }), { bucket: "media", render: async () => { throw new Error("boom https://secret.example/x?token=1"); } });
    assert.equal(result, status);
    const patch = log.find((l) => l.table === "render_jobs").patch;
    assert.equal(patch.status, status);
    assert.ok(!patch.error.includes("secret.example"));
  }
});

test("a failed upload is a failed try, and the post is left alone", async () => {
  const log = [];
  assert.equal(await processJob(fakeClient(log, { uploadError: { message: "x" } }), job(), { bucket: "media", render }), "queued");
  assert.ok(!log.some((l) => l.table === "posts"));
});

const good = { script: { title: "Hi there", subtitle: "s", stat: null, beats: [1, 2, 3].map((n) => ({ head: `Head ${n}`, line: `Line ${n}` })), closing: { handle: "@a", line: "Go" } }, palette: { bg: "#111111", fg: "#eeeeee", accent: "#ff0000" }, photos: ["https://images.pexels.com/a.jpg", "http://images.pexels.com/b.jpg", "https://evil.example/c.jpg", "javascript:alert(1)"] };

test("the payload is cleaned: unknown compositions refused, hosts limited to https image hosts, colours and lengths bounded", () => {
  assert.throws(() => cleanPayload("Evil", good), /Unknown composition/);
  assert.throws(() => cleanPayload("Pulse", { script: { title: "x", beats: [] } }), /incomplete/);
  const { inputProps } = cleanPayload("Arch", { ...good, palette: { bg: "red", fg: "#abcdef" }, script: { ...good.script, title: "T".repeat(500) } });
  assert.deepEqual(inputProps.photos, ["https://images.pexels.com/a.jpg"]);
  assert.equal(inputProps.script.title.length, 90);
  assert.equal(inputProps.palette.bg, "#1b1512");
  assert.equal(inputProps.palette.fg, "#abcdef");
  assert.equal(inputProps.audioUrl, null);
  assert.equal(cleanPayload("Plates", good).webgl, true);
});

import { cleanVoiceText, mixArgs, tempoFor } from "./voice.mjs";

test("voice text keeps Devanagari and plain punctuation only, and needs enough of it", () => {
  assert.equal(cleanVoiceText("दिवाली की मिठाई से मोटे नहीं होते। <script>alert(1)</script> fit रहो"), "दिवाली की मिठाई से मोटे नहीं होते। 1 रहो");
  assert.equal(cleanVoiceText("hello world only"), null);
  assert.equal(cleanVoiceText(42), null);
  assert.ok(cleanVoiceText("क".repeat(2000)).length <= 700);
});

test("the voice is sped up only when it would run past the video, never beyond 1.3x", () => {
  assert.equal(tempoFor(12), 1);
  assert.ok(Math.abs(tempoFor(27.6) - 1.2) < 1e-9);
  assert.equal(tempoFor(60), 1.3);
});

test("the mix lowers the music when there is some and pads the voice when there is none", () => {
  const withMusic = mixArgs({ video: "a.mp4", voice: "v.wav", output: "o.mp4", hasMusic: true, tempo: 1, seconds: "25.00" }).join(" ");
  assert.match(withMusic, /volume=0\.3/);
  assert.match(withMusic, /amix=inputs=2/);
  const silent = mixArgs({ video: "a.mp4", voice: "v.wav", output: "o.mp4", hasMusic: false, tempo: 1.1, seconds: "25.00" }).join(" ");
  assert.doesNotMatch(silent, /amix/);
  assert.match(silent, /apad/);
  assert.match(silent, /-t 25\.00/);
});
