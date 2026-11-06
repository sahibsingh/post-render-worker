export type Script = {
  title: string;
  subtitle: string;
  stat: { from: number; to: number; suffix: string; label: string } | null;
  beats: Array<{ head: string; line: string }>;
  closing: { handle: string; line: string };
};
export type Palette = { bg: string; fg: string; accent: string; mute: string; card: string; onAccent: string };
import type { Timing } from "./clock";
export type TemplateProps = { script: Script; palette: Palette; photos: string[]; audioUrl?: string | null; /** Scene lengths timed to the voice; without it the default timing is used. */ timing?: Timing | null };

export const SAMPLE_SCRIPT: Script = {
  title: "Cravings ko control karo.",
  subtitle: "3 baje ki bhookh sambhalo",
  stat: { from: 0, to: 10, suffix: "min", label: "Phir decide karo" },
  beats: [
    { head: "Pehle paani piyo", line: "Kabhi kabhi pyaas ko hum bhookh samajh lete hain. Ek glass paani lo." },
    { head: "Pet bharne wala snack", line: "Chana, dahi ya fruit lo. Fibre aur protein se pet bharta hai." },
    { head: "Ruko aur socho", line: "Das minute ruko. Agar bhookh ab bhi hai, to khao, bina guilt ke." },
    { head: "Neend poori lo", line: "Kam neend se cravings badhti hain. Saat se aath ghante zaroor soyo." },
  ],
  closing: { handle: "@singhfitnesspro", line: "Save karo, kal kaam aayega" },
};
export const SAMPLE_BOUTIQUE: Script = {
  title: "Naya kurti collection aa gaya.",
  subtitle: "Pure cotton, haath ki kadhai",
  stat: { from: 0, to: 799, suffix: "", label: "Rupees se shuru" },
  beats: [
    { head: "Pure cotton, naram", line: "Garmi mein bhi aaram. Din bhar pehno, thakaan nahi." },
    { head: "Haath ki kadhai", line: "Har piece mein karigar ki mehnat dikhti hai, gale aur aasteen par." },
    { head: "S se XXL tak", line: "Har size mein aati hai. Size chart DM par bhej denge." },
    { head: "Easy wash", line: "Ghar par dhoyein, rang nahi jaata. Pehli dhulai se pehle alag dhoyein." },
  ],
  closing: { handle: "@yourboutique", line: "DM karo, order karne ke liye" },
};

export const PALETTES: Record<string, Palette> = {
  masala: { bg: "#1b1512", fg: "#f6ede0", accent: "#f2a900", mute: "#a89b8c", card: "#2a211c", onAccent: "#1b1512" },
  thali: { bg: "#eaf1e6", fg: "#14301f", accent: "#d1600c", mute: "#5b7062", card: "#ffffff", onAccent: "#ffffff" },
};

const channel = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
export const luminance = (hex: string) => {
  const [r, g, b] = [0, 1, 2].map((i) => { const c = channel(hex, i); return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
/** The lighter of a style's two colours is the paper, the darker is the ink, so every style works on either ground. */
export function colours(p: Palette) {
  const [paper, ink] = luminance(p.bg) >= luminance(p.fg) ? [p.bg, p.fg] : [p.fg, p.bg];
  return { paper, ink, accent: p.accent, onAccent: p.onAccent };
}
/** A repeatable pseudo-random number in -1..1: renders must give the same frame every time, so no Math.random. */
export const wobble = (i: number, salt = 1) => Math.sin((i + 1) * 12.9898 * salt) * 0.999;
