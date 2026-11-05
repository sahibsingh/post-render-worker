/**
 * A job's payload comes from a database row, and this repository is public, so everything is checked before it reaches the
 * renderer: only known compositions, only text of a sane length, and only images and audio from hosts we expect.
 */
export const COMPOSITIONS = new Set(["Pulse", "Arch", "Plates"]);
const WEBGL = new Set(["Plates"]);
const HOSTS = [/^images\.pexels\.com$/, /^images\.unsplash\.com$/, /^[a-z0-9-]+\.supabase\.co$/];

const text = (value, max) => (typeof value === "string" ? value.replace(/[\u0000-\u001f]/g, " ").trim().slice(0, max) : "");
const safeUrl = (value) => {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" && HOSTS.some((h) => h.test(url.hostname)) ? url.toString() : null;
  } catch { return null; }
};

export function cleanPayload(composition, payload) {
  if (!COMPOSITIONS.has(composition)) throw new Error("Unknown composition.");
  const p = payload && typeof payload === "object" ? payload : {};
  const s = p.script && typeof p.script === "object" ? p.script : {};
  const beats = (Array.isArray(s.beats) ? s.beats : []).slice(0, 6).map((b) => ({ head: text(b?.head, 40), line: text(b?.line, 140) })).filter((b) => b.head && b.line);
  if (!text(s.title, 90) || beats.length < 3) throw new Error("The script is incomplete.");
  const stat = s.stat && typeof s.stat === "object" && Number.isFinite(Number(s.stat.to)) ? { from: Number(s.stat.from) || 0, to: Number(s.stat.to), suffix: text(s.stat.suffix, 12), label: text(s.stat.label, 40) } : null;
  const colour = (v, fallback) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback);
  const pal = p.palette && typeof p.palette === "object" ? p.palette : {};
  return {
    inputProps: {
      script: { title: text(s.title, 90), subtitle: text(s.subtitle, 90), stat, beats, closing: { handle: text(s.closing?.handle, 40) || "@yourpage", line: text(s.closing?.line, 60) } },
      palette: { bg: colour(pal.bg, "#1b1512"), fg: colour(pal.fg, "#f6ede0"), accent: colour(pal.accent, "#f2a900"), mute: colour(pal.mute, "#a89b8c"), card: colour(pal.card, "#2a211c"), onAccent: colour(pal.onAccent, "#1b1512") },
      photos: (Array.isArray(p.photos) ? p.photos : []).map(safeUrl).filter(Boolean).slice(0, 4),
      audioUrl: p.audioUrl ? safeUrl(p.audioUrl) : null,
    },
    webgl: WEBGL.has(composition),
  };
}
