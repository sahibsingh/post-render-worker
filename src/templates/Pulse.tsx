import { AbsoluteFill } from "remotion";
import { planClock } from "../clock";
import { gsap, SplitText, useGsapTimeline } from "../gsap";
import { colours, wobble, type TemplateProps } from "../types";

const PX_PER_SEC = 330;
const PEN_X = 700;
const BASE_Y = 1630;

/** A heartbeat trace: flat, then a spike at every time in `spikes`. Returns the points so the pen can be timed against them. */
function trace(spikes: Array<{ t: number; big: number }>, total: number) {
  const pts: Array<[number, number]> = [[0, 0]];
  for (const s of spikes) {
    const x = s.t * PX_PER_SEC;
    const h = 250 * s.big;
    pts.push([x - 90, 0], [x - 62, -16], [x - 38, 0], [x - 20, 0], [x - 6, 24], [x, -h], [x + 20, h * 0.55], [x + 40, -h * 0.12], [x + 64, 0]);
  }
  pts.push([total * PX_PER_SEC + 1200, 0]);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  let len = 0;
  const cum = pts.map((p, i) => { if (i) len += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]); return len; });
  return { d, pts, cum, len };
}

export function Pulse({ script, palette }: TemplateProps) {
  const clock = planClock(script);
  const { paper, ink, accent, onAccent } = colours(palette);
  const spikes = [{ t: 0.55, big: 0.7 }, ...clock.starts.map((t) => ({ t: t + 0.18, big: 1 })), { t: clock.closeAt + 0.55, big: 1.25 }];
  const ecg = trace(spikes, clock.total);
  const headSize = (text: string) => (text.length > 20 ? 150 : text.length > 12 ? 176 : 200);
  const handleSize = Math.min(170, Math.floor(900 / (Math.max(script.closing.handle.length, 6) * 0.54)));

  const root = useGsapTimeline((tl, el) => {
    const q = gsap.utils.selector(el);
    const cam = q(".cam")[0];
    const flash = q(".flash")[0];
    const shake = (at: number, amp = 18) => {
      tl.to(cam, { x: amp, y: -amp * 0.6, duration: 0.04, repeat: 3, yoyo: true, ease: "power1.inOut" }, at)
        .to(cam, { x: amp * 0.45, y: amp * 0.3, duration: 0.04, repeat: 3, yoyo: true, ease: "power1.inOut" }, at + 0.17)
        .set(cam, { x: 0, y: 0 }, at + 0.34);
    };
    const hit = (at: number, strength = 0.32) => tl.fromTo(flash, { opacity: strength }, { opacity: 0, duration: 0.3, ease: "power2.out" }, at);

    // The ruler on the left edge runs upward for the whole video, like a lifting tracker.
    tl.to(q(".ruler")[0], { y: -480, duration: clock.total, ease: "none" }, 0);

    // The heartbeat trace is drawn by a pen that stays at one x while the page scrolls under it.
    const line = q(".ecg-path")[0] as unknown as SVGPathElement;
    const group = q(".ecg-group")[0];
    tl.fromTo(group, { x: PEN_X }, { x: PEN_X - clock.total * PX_PER_SEC, duration: clock.total, ease: "none" }, 0);
    gsap.set(line, { drawSVG: "0% 0%" });
    ecg.cum.forEach((c, i) => {
      if (!i) return;
      const t0 = ecg.pts[i - 1][0] / PX_PER_SEC, t1 = ecg.pts[i][0] / PX_PER_SEC;
      tl.to(line, { drawSVG: `0% ${((c / ecg.len) * 100).toFixed(3)}%`, duration: Math.max(0.0001, t1 - t0), ease: "none" }, t0);
    });

    // Opening: the title slams in character by character; its second line is an outline.
    const title = new SplitText(q(".title")[0], { type: "lines,chars" });
    title.lines.forEach((line, i) => { if (i % 2 === 1) gsap.set(line, { color: "transparent", webkitTextStroke: `4px ${accent}` }); });
    tl.from(title.chars, { scale: 2.6, opacity: 0, y: -150, rotation: (i: number) => wobble(i) * 14, duration: 0.5, ease: "back.out(2.4)", stagger: 0.03 }, 0.3);
    shake(0.62, 20); hit(0.62);
    tl.from(q(".subtitle"), { x: -60, opacity: 0, duration: 0.6, ease: "power3.out" }, 1.3);
    if (script.stat) {
      const counter = { v: script.stat.from };
      const node = q(".stat-num")[0];
      tl.from(q(".stat"), { opacity: 0, y: 70, duration: 0.5, ease: "expo.out" }, 1.9);
      tl.to(counter, { v: script.stat.to, duration: 2.0, ease: "power3.out", onUpdate: () => { node.textContent = Math.round(counter.v).toLocaleString("en-US"); } }, 1.9);
      tl.from(q(".stat-label"), { opacity: 0, x: -40, duration: 0.5, ease: "power3.out" }, 2.6);
    }
    tl.to(q(".open"), { x: -1300, skewX: -18, opacity: 0, duration: 0.3, ease: "power3.in" }, clock.openEnd - 0.34);

    // Points: each one is a rep. The index number bleeds off the corner, the heading is stamped in, the text follows.
    q(".beat").forEach((beat, i) => {
      const t = clock.starts[i];
      const b = gsap.utils.selector(beat);
      const heading = new SplitText(b(".beat-head")[0], { type: "words,chars" });
      const words = new SplitText(b(".beat-line")[0], { type: "words" });
      tl.set(beat, { autoAlpha: 1 }, t);
      tl.from(b(".beat-index"), { x: -420, opacity: 0, duration: 0.5, ease: "expo.out" }, t);
      tl.from(heading.chars, { scale: 3, opacity: 0, y: -170, rotation: (k: number) => wobble(k + i * 7) * 10, duration: 0.5, ease: "back.out(2.6)", stagger: 0.025 }, t + 0.05);
      shake(t + 0.2, 16); hit(t + 0.2, 0.26);
      tl.from(words.words, { y: 46, opacity: 0, duration: 0.5, ease: "power3.out", stagger: 0.04 }, t + 0.5);
      tl.to(beat, { x: -1300, skewX: -18, opacity: 0, duration: 0.3, ease: "power3.in" }, t + clock.holds[i] - 0.32);
    });

    // Closing: the trace spikes one last time, the handle is underlined by a drawn line, the call to action is a tag.
    const c = q(".close")[0];
    const handle = new SplitText(q(".handle")[0], { type: "chars" });
    tl.set(c, { autoAlpha: 1 }, clock.closeAt);
    tl.from(handle.chars, { y: 160, opacity: 0, duration: 0.55, ease: "expo.out", stagger: 0.03 }, clock.closeAt + 0.3);
    gsap.set(q(".underline path"), { drawSVG: "0% 0%" });
    tl.to(q(".underline path"), { drawSVG: "0% 100%", duration: 0.7, ease: "power3.inOut" }, clock.closeAt + 0.75);
    tl.from(q(".tag"), { x: -700, opacity: 0, duration: 0.7, ease: "back.out(1.6)" }, clock.closeAt + 1.1);
    shake(clock.closeAt + 0.55, 22); hit(clock.closeAt + 0.55, 0.38);
  });

  const font = { Anton: "Anton, 'Arial Narrow', sans-serif", Grotesk: "'Space Grotesk', system-ui, sans-serif" };
  const ticks = Array.from({ length: 60 }, (_, i) => i);
  return (
    <AbsoluteFill style={{ background: ink, overflow: "hidden" }}>
      <div ref={root} style={{ position: "absolute", inset: 0 }}>
        <div className="cam" style={{ position: "absolute", inset: 0 }}>
          <svg className="ruler" width="70" height="2900" style={{ position: "absolute", left: 0, top: -400, opacity: 0.28 }}>
            {ticks.map((i) => <line key={i} x1="0" x2={i % 5 === 0 ? 46 : 22} y1={i * 48 + 4} y2={i * 48 + 4} stroke={paper} strokeWidth={i % 5 === 0 ? 4 : 2} />)}
          </svg>

          <div className="open" style={{ position: "absolute", left: 100, top: 300, width: 900, display: "flex", flexDirection: "column", gap: 44 }}>
            <div className="title" style={{ fontFamily: font.Anton, fontSize: 176, lineHeight: 0.98, color: paper, textTransform: "uppercase" }}>{script.title.replace(/[.!?]+$/, "")}</div>
            {script.subtitle ? <div className="subtitle" style={{ fontFamily: font.Grotesk, fontSize: 54, fontWeight: 500, letterSpacing: 1, color: paper, opacity: 0.8 }}>{script.subtitle}</div> : null}
            {script.stat ? (
              <div className="stat" style={{ display: "flex", alignItems: "baseline", gap: 24, marginTop: 20 }}>
                <span className="stat-num" style={{ fontFamily: font.Anton, fontSize: 420, lineHeight: 0.9, color: accent }}>{script.stat.from}</span>
                <span style={{ fontFamily: font.Grotesk, fontSize: 96, fontWeight: 700, color: accent }}>{script.stat.suffix}</span>
              </div>
            ) : null}
            {script.stat?.label ? <div className="stat-label" style={{ fontFamily: font.Grotesk, fontSize: 58, fontWeight: 600, color: paper }}>{script.stat.label}</div> : null}
          </div>

          {script.beats.slice(0, clock.n).map((b, i) => (
            <div key={i} className="beat" style={{ position: "absolute", inset: 0, visibility: "hidden", opacity: 0 }}>
              <div className="beat-index" style={{ position: "absolute", left: -50, top: 40, fontFamily: font.Anton, fontSize: 760, lineHeight: 1, color: "transparent", WebkitTextStroke: `5px ${accent}`, opacity: 0.55 }}>{String(i + 1).padStart(2, "0")}</div>
              <div style={{ position: "absolute", left: 100, top: 640, width: 900 }}>
                <div className="beat-head" style={{ fontFamily: font.Anton, fontSize: headSize(b.head), lineHeight: 0.96, color: paper, textTransform: "uppercase" }}>{b.head}</div>
                <div className="beat-line" style={{ marginTop: 44, fontFamily: font.Grotesk, fontSize: 64, lineHeight: 1.22, fontWeight: 500, color: paper, opacity: 0.92 }}>{b.line}</div>
              </div>
            </div>
          ))}

          <div className="close" style={{ position: "absolute", left: 100, top: 560, width: 900, visibility: "hidden", opacity: 0 }}>
            <div className="handle" style={{ fontFamily: font.Anton, fontSize: handleSize, lineHeight: 1, color: paper, textTransform: "uppercase", whiteSpace: "nowrap" }}>{script.closing.handle}</div>
            <svg className="underline" width="900" height="30" viewBox="0 0 900 30" style={{ display: "block", marginTop: 14 }}><path d="M4 15 H896" stroke={accent} strokeWidth="14" strokeLinecap="butt" fill="none" /></svg>
            <div className="tag" style={{ marginTop: 70, display: "inline-block", padding: "34px 90px 34px 44px", background: accent, color: onAccent, fontFamily: font.Grotesk, fontSize: 60, fontWeight: 700, clipPath: "polygon(0 0, calc(100% - 46px) 0, 100% 50%, calc(100% - 46px) 100%, 0 100%)" }}>{script.closing.line}</div>
          </div>

          <svg width="1080" height="500" viewBox="0 0 1080 500" style={{ position: "absolute", left: 0, top: BASE_Y - 250, overflow: "visible", filter: `drop-shadow(0 0 16px ${accent})` }}>
            <g className="ecg-group" transform={`translate(0 250)`}>
              <path className="ecg-path" d={ecg.d} stroke={accent} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" fill="none" />
            </g>
          </svg>
        </div>
        <div className="flash" style={{ position: "absolute", inset: 0, background: paper, opacity: 0, mixBlendMode: "screen", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,.55) 100%)", pointerEvents: "none" }} />
      </div>
    </AbsoluteFill>
  );
}
