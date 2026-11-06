import { AbsoluteFill } from "remotion";
import { planClock } from "../clock";
import { gsap, SplitText, useGsapTimeline } from "../gsap";
import { colours, type TemplateProps } from "../types";

const font = { Anton: "Anton, 'Arial Narrow', sans-serif", Grotesk: "'Space Grotesk', system-ui, sans-serif" };

/** One long row of words for a marquee strip; the row is twice as long as needed so it can loop. */
const strip = (words: string[]) => Array.from({ length: 3 }, () => words.map((w) => w.toUpperCase()).join("   ///   ")).join("   ///   ");

/** Ticker: a full-colour poster. Two marquee strips run in opposite directions all video long; big type is revealed through masks and wipes. */
export function Ticker({ script, palette, timing }: TemplateProps) {
  const clock = planClock(script, timing);
  const { ink, accent, onAccent } = colours(palette);
  const words = [script.title.replace(/[.!?]+$/, ""), ...script.beats.slice(0, clock.n).map((b) => b.head)];
  const text = onAccent;
  const slab = ink;

  const root = useGsapTimeline((tl, el) => {
    const q = gsap.utils.selector(el);
    tl.fromTo(q(".strip-a")[0], { x: 0 }, { x: -2400, duration: clock.total, ease: "none" }, 0);
    tl.fromTo(q(".strip-b")[0], { x: -2400 }, { x: 0, duration: clock.total, ease: "none" }, 0);

    // Opening: each line of the title rises through a mask; the subtitle slides onto a slab.
    const lines = new SplitText(q(".title")[0], { type: "lines", linesClass: "line" });
    lines.lines.forEach((line) => { const wrap = document.createElement("div"); wrap.style.overflow = "hidden"; line.parentNode?.insertBefore(wrap, line); wrap.appendChild(line); });
    tl.from(lines.lines, { yPercent: 115, duration: 0.7, ease: "expo.out", stagger: 0.14 }, 0.2);
    tl.from(q(".subtitle"), { x: -900, duration: 0.6, ease: "power4.out" }, 1.0);
    if (script.stat) {
      const counter = { v: script.stat.from };
      const node = q(".stat-num")[0];
      tl.from(q(".stat"), { scale: 0.4, opacity: 0, rotation: -8, duration: 0.5, ease: "back.out(2)" }, 1.7);
      tl.to(counter, { v: script.stat.to, duration: 1.8, ease: "power3.out", onUpdate: () => { node.textContent = Math.round(counter.v).toLocaleString("en-US"); } }, 1.7);
    }
    tl.to(q(".open"), { xPercent: -110, duration: 0.45, ease: "power3.in" }, clock.openEnd - 0.5);

    // Points: a slab wipes in from the left, the heading is set on it, the text follows below; it wipes out to the right.
    q(".beat").forEach((beat, i) => {
      const t = clock.starts[i];
      const b = gsap.utils.selector(beat);
      const head = new SplitText(b(".beat-head")[0], { type: "words" });
      tl.set(beat, { autoAlpha: 1 }, t - 0.02);
      tl.fromTo(b(".slab"), { scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", duration: 0.45, ease: "power4.out" }, t);
      tl.from(b(".badge"), { scale: 0, rotation: -120, duration: 0.5, ease: "back.out(2.4)" }, t + 0.25);
      tl.from(head.words, { yPercent: 120, opacity: 0, duration: 0.5, ease: "expo.out", stagger: 0.08 }, t + 0.3);
      tl.from(b(".beat-line"), { y: 60, opacity: 0, duration: 0.55, ease: "power3.out" }, t + 0.7);
      tl.to(b(".slab"), { scaleX: 0, transformOrigin: "right center", duration: 0.35, ease: "power3.in" }, t + clock.holds[i] - 0.4);
      tl.to([b(".beat-head"), b(".beat-line"), b(".badge")], { opacity: 0, duration: 0.2 }, t + clock.holds[i] - 0.42);
      tl.set(beat, { autoAlpha: 0 }, t + clock.holds[i]);
    });

    // Closing: a dark disc grows from the middle, the handle and the call to action land on it.
    const c = q(".close")[0];
    tl.set(c, { autoAlpha: 1 }, clock.closeAt);
    tl.fromTo(q(".disc"), { scale: 0 }, { scale: 1, duration: 0.8, ease: "expo.inOut" }, clock.closeAt);
    const handle = new SplitText(q(".handle")[0], { type: "chars" });
    tl.from(handle.chars, { yPercent: 130, opacity: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.03 }, clock.closeAt + 0.6);
    tl.from(q(".cta"), { y: 120, opacity: 0, duration: 0.6, ease: "power3.out" }, clock.closeAt + 1.2);
  });

  const handleSize = Math.min(190, Math.floor(900 / (Math.max(script.closing.handle.length, 6) * 0.52)));
  const headSize = (t: string) => (t.length > 22 ? 120 : t.length > 14 ? 150 : 180);
  const titleText = script.title.replace(/[.!?]+$/, "");
  const titleSize = titleText.length <= 14 ? 230 : titleText.length <= 26 ? 190 : 150;
  return (
    <AbsoluteFill style={{ background: accent, overflow: "hidden" }}>
      <div ref={root} style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", left: 0, right: 0, top: 70, height: 110, overflow: "hidden" }}>
          <div className="strip-a" style={{ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap", fontFamily: font.Anton, fontSize: 96, lineHeight: "110px", color: "transparent", WebkitTextStroke: `3px ${text}` }}>{strip(words)}</div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, height: 110, overflow: "hidden" }}>
          <div className="strip-b" style={{ position: "absolute", left: 0, top: 0, whiteSpace: "nowrap", fontFamily: font.Anton, fontSize: 96, lineHeight: "110px", color: text }}>{strip(words.slice().reverse())}</div>
        </div>

        <div className="open" style={{ position: "absolute", left: 90, top: 270, width: 900 }}>
          <div className="title" style={{ fontFamily: font.Anton, fontSize: titleSize, lineHeight: 0.96, color: text, textTransform: "uppercase" }}>{titleText}</div>
          {script.subtitle ? <div className="subtitle" style={{ display: "inline-block", marginTop: 44, padding: "20px 36px", background: slab, color: accent, fontFamily: font.Grotesk, fontSize: 52, fontWeight: 700 }}>{script.subtitle}</div> : null}
          {script.stat ? (
            <div className="stat" style={{ marginTop: 40, display: "flex", alignItems: "baseline", gap: 20, color: text }}>
              <span className="stat-num" style={{ fontFamily: font.Anton, fontSize: 200, lineHeight: 0.9 }}>{script.stat.from}</span>
              <span style={{ fontFamily: font.Grotesk, fontSize: 56, fontWeight: 700 }}>{script.stat.suffix} {script.stat.label}</span>
            </div>
          ) : null}
        </div>

        {script.beats.slice(0, clock.n).map((b, i) => (
          <div key={i} className="beat" style={{ position: "absolute", inset: 0, visibility: "hidden", opacity: 0 }}>
            <div className="slab" style={{ position: "absolute", left: 0, top: 380, width: 1080, height: 560, background: slab }} />
            <div className="badge" style={{ position: "absolute", left: 90, top: 330, width: 150, height: 150, borderRadius: 75, background: accent, color: text, display: "grid", placeItems: "center", fontFamily: font.Anton, fontSize: 90, border: `8px solid ${slab}` }}>{i + 1}</div>
            <div style={{ position: "absolute", left: 90, top: 520, width: 900, overflow: "hidden" }}>
              <div className="beat-head" style={{ fontFamily: font.Anton, fontSize: headSize(b.head), lineHeight: 1, color: accent, textTransform: "uppercase" }}>{b.head}</div>
            </div>
            <div className="beat-line" style={{ position: "absolute", left: 90, top: 1010, width: 900, fontFamily: font.Grotesk, fontSize: 66, lineHeight: 1.22, fontWeight: 600, color: text }}>{b.line}</div>
          </div>
        ))}

        <div className="close" style={{ position: "absolute", inset: 0, visibility: "hidden", opacity: 1 }}>
          <div className="disc" style={{ position: "absolute", left: 540 - 1300, top: 960 - 1300, width: 2600, height: 2600, borderRadius: 1300, background: slab }} />
          <div style={{ position: "absolute", left: 90, top: 640, width: 900 }}>
            <div style={{ overflow: "hidden" }}><div className="handle" style={{ fontFamily: font.Anton, fontSize: handleSize, lineHeight: 1.05, color: accent, textTransform: "uppercase", whiteSpace: "nowrap" }}>{script.closing.handle}</div></div>
            <div className="cta" style={{ marginTop: 70, display: "inline-block", padding: "30px 56px", background: accent, color: text, fontFamily: font.Grotesk, fontSize: 60, fontWeight: 700, borderRadius: 999 }}>{script.closing.line}</div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
