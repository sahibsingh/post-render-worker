import type { ComponentType } from "react";
import { Audio, Composition, interpolate } from "remotion";
import { loadFonts } from "./fonts";
import { Arch } from "./templates/Arch";
import { Plates } from "./templates/Plates";
import { Blueprint } from "./templates/Blueprint";
import { Countdown } from "./templates/Countdown";
import { Pulse } from "./templates/Pulse";
import { Stack } from "./templates/Stack";
import { Tag } from "./templates/Tag";
import { Ticker } from "./templates/Ticker";
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
    <Composition id="Ticker" component={withAudio(Ticker)} {...base} defaultProps={props({ palette: PALETTES.masala })} />
    <Composition id="Stack" component={withAudio(Stack)} {...base} defaultProps={props({ script: SAMPLE_BOUTIQUE, palette: PALETTES.thali })} />
    <Composition id="Tag" component={withAudio(Tag)} {...base} defaultProps={props({ script: SAMPLE_BOUTIQUE, palette: PALETTES.thali })} />
    <Composition id="Countdown" component={withAudio(Countdown)} {...base} defaultProps={props()} />
    <Composition id="Blueprint" component={withAudio(Blueprint)} {...base} defaultProps={props()} />
    <Composition id="Plates" component={withAudio(Plates)} {...base} defaultProps={props()} />
  </>
);
