import type { ComponentType } from "react";
import { Audio, Composition, interpolate } from "remotion";
import { loadFonts } from "./fonts";
import { Arch } from "./templates/Arch";
import { Plates } from "./templates/Plates";
import { Pulse } from "./templates/Pulse";
import { PALETTES, SAMPLE_BOUTIQUE, SAMPLE_SCRIPT, type TemplateProps } from "./types";

loadFonts();
const base = { fps: 30, width: 1080, height: 1920, durationInFrames: 750 } as const;
const props = (extra: Partial<TemplateProps> = {}): TemplateProps => ({ script: SAMPLE_SCRIPT, palette: PALETTES.masala, photos: [], audioUrl: null, ...extra });

/** Adds the page's music (when there is one): a short fade in, a fade out over the last second. */
const withAudio = (Template: ComponentType<TemplateProps>) =>
  function WithAudio(p: TemplateProps) {
    return (
      <>
        <Template {...p} />
        {p.audioUrl ? <Audio src={p.audioUrl} volume={(f) => interpolate(f, [0, 12, base.durationInFrames - 30, base.durationInFrames], [0, 0.85, 0.85, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} /> : null}
      </>
    );
  };

export const Root = () => (
  <>
    <Composition id="Pulse" component={withAudio(Pulse)} {...base} defaultProps={props()} />
    <Composition id="Arch" component={withAudio(Arch)} {...base} defaultProps={props({ script: SAMPLE_BOUTIQUE, palette: PALETTES.thali, photos: ["photos/p28512787.jpg", "photos/p35521738.jpg", "photos/p39287929.jpg"] })} />
    <Composition id="Plates" component={withAudio(Plates)} {...base} defaultProps={props()} />
  </>
);
