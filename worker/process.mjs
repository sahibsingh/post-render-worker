import { readFile } from "node:fs/promises";

const log = (message) => console.log(message);
const clip = (value) => String(value instanceof Error ? value.message : value).replace(/https?:\/\/\S+/g, "[url]").slice(0, 300);

/**
 * Renders one claimed job, stores the video where the app expects its reel and records the result on the post.
 * A failure puts the job back in the queue until it has been tried three times. Nothing sensitive is printed: this log is public.
 */
export async function processJob(client, job, { bucket, render }) {
  log(`job ${job.id} started (${job.composition}, try ${job.attempts})`);
  try {
    const file = await render(job);
    const bytes = await readFile(file.path);
    const upload = await client.storage.from(bucket).upload(job.result_path, bytes, { contentType: "video/mp4", upsert: true });
    if (upload.error) throw new Error("The video could not be stored.");

    const { data: post } = await client.from("posts").select("metadata").eq("id", job.post_id).maybeSingle();
    // A new video makes any earlier Instagram container for this post useless, so publishing progress starts over.
    const { publish: _stale, ...rest } = post?.metadata ?? {};
    const reel = { path: job.result_path, durationSeconds: file.seconds, hash: job.reel_hash, createdAt: new Date().toISOString() };
    const saved = await client.from("posts").update({ metadata: { ...rest, reel, template_id: job.template_id } }).eq("id", job.post_id);
    if (saved.error) throw new Error("The post could not be updated.");
    await client.from("render_jobs").update({ status: "done", error: null, finished_at: new Date().toISOString() }).eq("id", job.id);
    log(`job ${job.id} done`);
    return "done";
  } catch (error) {
    const final = job.attempts >= 3;
    await client.from("render_jobs").update({ status: final ? "failed" : "queued", error: clip(error), finished_at: final ? new Date().toISOString() : null }).eq("id", job.id);
    log(`job ${job.id} ${final ? "failed" : "will be tried again"}: ${clip(error)}`);
    return final ? "failed" : "queued";
  }
}
