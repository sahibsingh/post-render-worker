import { continueRender, delayRender, staticFile } from "remotion";

const FONTS = [
  { family: "Anton", file: "fonts/Anton-Regular.ttf", weight: "400", style: "normal" },
  { family: "Space Grotesk", file: "fonts/SpaceGrotesk[wght].ttf", weight: "300 700", style: "normal" },
  { family: "Playfair Display", file: "fonts/PlayfairDisplay[wght].ttf", weight: "400 900", style: "normal" },
  { family: "Playfair Display", file: "fonts/PlayfairDisplay-Italic[wght].ttf", weight: "400 900", style: "italic" },
  { family: "Manrope", file: "fonts/Manrope[wght].ttf", weight: "200 800", style: "normal" },
];

/** Loads the bundled fonts before the first frame is drawn. */
export function loadFonts() {
  const handle = delayRender("fonts");
  Promise.all(FONTS.map(async (f) => {
    const face = new FontFace(f.family, `url(${staticFile(f.file).replace(/\[/g, "%5B").replace(/\]/g, "%5D")})`, { weight: f.weight, style: f.style });
    await face.load();
    (document.fonts as unknown as { add(f: FontFace): void }).add(face);
  })).then(() => continueRender(handle)).catch((error) => { console.error(error); continueRender(handle); });
}
