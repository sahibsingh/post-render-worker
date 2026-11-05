import { createClient } from "@supabase/supabase-js";
import { processJob } from "./process.mjs";
import { renderJob } from "./render.mjs";

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_STORAGE_BUCKET } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !SUPABASE_STORAGE_BUCKET) {
  console.error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_STORAGE_BUCKET must be set.");
  process.exit(1);
}
const client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const only = process.env.JOB_ID || null;
const max = Math.max(1, Number(process.env.MAX_JOBS || 3));

let handled = 0;
for (let i = 0; i < max; i++) {
  const { data, error } = await client.rpc("claim_render_job", { p_job: only });
  if (error) { console.error("Could not claim a job."); process.exit(1); }
  const job = Array.isArray(data) ? data[0] : data;
  if (!job) break;
  await processJob(client, job, { bucket: SUPABASE_STORAGE_BUCKET, render: renderJob });
  handled += 1;
  if (only) break;
}
console.log(`${handled} job(s) handled`);
