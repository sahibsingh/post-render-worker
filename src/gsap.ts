import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { CustomEase } from "gsap/CustomEase";
import { useLayoutEffect, useRef } from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";

gsap.registerPlugin(SplitText, DrawSVGPlugin, CustomEase);
export { gsap, SplitText };

/**
 * GSAP inside Remotion: the timeline is built once, paused, and moved to the current frame's time on every render, so
 * every frame is a pure function of its number (which is what video rendering needs).
 */
export function useGsapTimeline(build: (tl: gsap.core.Timeline, root: HTMLDivElement) => void) {
  const root = useRef<HTMLDivElement>(null);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true });
      build(tl, root.current as HTMLDivElement);
      timeline.current = tl;
    }, root);
    return () => ctx.revert();
    // The timeline is built once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLayoutEffect(() => { timeline.current?.seek(frame / fps, false); });
  return root;
}
