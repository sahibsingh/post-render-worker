# Postora render worker

Renders Postora's motion videos from a job queue in Supabase and puts the finished MP4 where the app expects its reel.
The compositions (React, GSAP, Three.js) are drawn with Remotion in a headless browser.

This repository is public on purpose: standard GitHub-hosted runners are free for public repositories. It holds no customer data and no secrets. The app's code is in a separate private repository.

## How a render happens
1. The app writes a row to `render_jobs` (template, script, colours, image links) and starts the **Render** workflow with the job id.
2. The workflow claims the job (`claim_render_job`), renders it and uploads the MP4 to the storage path in the job.
3. It writes the new reel (path, hash, length) on the post and marks the job `done`. A failed job goes back in the queue for up to three tries.
4. A scheduled run every 20 minutes picks up anything that was queued but not started.

## Setup (once)
Add these repository **Actions secrets** (Settings, Secrets and variables, Actions):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (full access to the project, so keep it only here and rotate it if this repository's settings are ever exposed)
- `SUPABASE_STORAGE_BUCKET` (the app's bucket name)

In the app's hosting environment add:
- `RENDER_WORKER_REPO` = `owner/post-render-worker`
- `RENDER_DISPATCH_TOKEN` = a fine-grained personal access token limited to this one repository with **Actions: read and write**

Without those two the app keeps its older subtitle templates and nothing here runs.

## Safety
- The workflow only runs on `workflow_dispatch` and `schedule`. It has no pull request or push trigger, so forks and contributors cannot run it with the secrets.
- Job data is validated before rendering (`worker/payload.mjs`): known compositions only, text length limits, images and audio only over https from Pexels, Unsplash or Supabase.
- Logs are public. They print job ids and short status lines only, never the script text, links or keys.
- GitHub marks scheduled workflows inactive after 60 days without repository activity; a commit or a manual run re-enables them.

## Run locally
```
npm install
npm run studio                                   # preview the compositions
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_STORAGE_BUCKET=... npm run worker
```
With a Chromium that Playwright installed: `BROWSER_EXECUTABLE=/opt/pw-browsers/chromium CHROME_MODE=chrome-for-testing`.

## Licences
- Remotion is free for individuals and for-profit organisations with up to 3 employees; larger companies need a paid Company License (https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).
- GSAP 3.13 and later, including its plugins, is free. Three.js is MIT.
- Fonts (Anton, Space Grotesk, Playfair Display, Manrope): SIL Open Font License 1.1.
- Sample photos in `public/photos` are from Pexels: Kunal Yadav Photography, Neha Mishra, michaelhidaeki.
