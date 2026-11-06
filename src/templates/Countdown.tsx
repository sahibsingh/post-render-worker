import { AbsoluteFill } from "remotion";
import { planClock } from "../clock";
import { gsap, SplitText, useGsapTimeline } from "../gsap";
import { colours, type TemplateProps } from "../types";

const font = { Anton: "Anton, 'Arial Narrow', sans-serif", Body: "'Space Grotesk', system-ui, sans-serif" };
const R = 330;
const C = 2 * Math.PI * R;

/** Countdown: the points are numbered downward; a ring around the number runs out as the point is read, then the next number takes over. */
export function Countdown({ script, palette, timing }: TemplateProps) {
  const clock = planClock(script, timing);
  const { paper, ink, accent } = colours(palette);
  const n = clock.n;
  const titleText = script.title.replace(/[.!?]+$/, "");
  const titleSize = titleText.length <= 16 ? 190 : titleText.length <= 28 ? 150 : 120;
  const headSize = (t: string) => (t.length > 22 ? 96 : t.length > 14 ? 116 : 140);

  const root = useGsapTimeline((tl, el) => {
    const q = gsap.utils.selector(el);
    // Opening: three ticks of a ring pulse before the title is set.
    tl.fromTo(q(".pulse"), { scale: 0.4, opacity: 0.9 }, { scale: 2.4, opacity: 0, duration: 0.9, ease: "power2.out", stagger: 0.25 }, 0);
    const title = new SplitText(q(".title")[0], { type: "lines,words" });
    tl.from(title.words, { y: 90, opacity: 0, duration: 0.5, ease: "power4.out", stagger: 0.08 }, 0.7);
    tl.from(q(".subtitle"), { opacity: 0, y: 30, duration: 0.6 }, 1.5);
    if (script.stat) {
      const counter = { v: script.stat.from };
      const node = q(".stat-num")[0];
      tl.from(q(".stat"), { opacity: 0, scale: 0.7, duration: 0.5, ease: "back.out(2)" }, 1.9);
      tl.to(counter, { v: script.stat.to, duration: 1.8, ease: "power3.out", onUpdate: () => { node.textContent = Math.round(counter.v).toLocaleString("en-US"); } }, 1.9);
    }
    tl.to(q(".open"), { opacity: 0, scale: 0.9, duration: 0.35 }, clock.openEnd - 0.4);

    // Points: the ring is drawn full and runs out over the point's time; the number pops in, the heading and the text follow.
    q(".beat").forEach((beat, i) => {
      const t = clock.starts[i];
      const hold = clock.holds[i];
      const b = gsap.utils.selector(beat);
      const head = new SplitText(b(".beat-head")[0], { type: "words" });
      tl.set(beat, { autoAlpha: 1 }, t - 0.02);
      tl.from(b(".num"), { scale: 1.8, opacity: 0, duration: 0.45, ease: "expo.out" }, t);
      gsap.set(b(".ring-run"), { strokeDasharray: C, strokeDashoffset: 0 });
      tl.fromTo(b(".ring-run"), { strokeDashoffset: C }, { strokeDashoffset: 0, duration: 0.5, ease: "power2.out" }, t);
      tl.to(b(".ring-run"), { strokeDashoffset: -C, duration: Math.max(0.5, hold - 0.9), ease: "none" }, t + 0.5);
      tl.from(head.words, { y: 80, opacity: 0, duration: 0.45, ease: "expo.out", stagger: 0.06 }, t + 0.35);
      tl.from(b(".beat-line"), { opacity: 0, y: 30, duration: 0.5, ease: "power3.out" }, t + 0.7);
      tl.to(beat, { opacity: 0, x: -80, duration: 0.3, ease: "power2.in" }, t + hold - 0.32);
    });

    // Closing: the ring closes, "GO" lands, the handle and the call to action follow.
    const c = q(".close")[0];
    tl.set(c, { autoAlpha: 1 }, clock.closeAt);
    tl.from(q(".go"), { scale: 0.2, opacity: 0, duration: 0.5, ease: "back.out(2.4)" }, clock.closeAt);
    tl.fromTo(q(".ring-end"), { strokeDashoffset: C }, { strokeDashoffset: 0, duration: 0.9, ease: "power3.out" }, clock.closeAt);
    const handle = new SplitText(q(".handle")[0], { type: "chars" });
    tl.from(handle.chars, { yPercent: 130, opacity: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.03 }, clock.closeAt + 0.6);
    tl.from(q(".cta"), { y: 70, opacity: 0, duration: 0.55, ease: "power3.out" }, clock.closeAt + 1.2);
  });

  const handleSize = Math.min(150, Math.floor(860 / (Math.max(script.closing.handle.length, 6) * 0.52)));
  const ringSvg = (cls: string, stroke: string, width: number, dash = false) => (
    <svg width="740" height="740" viewBox="0 0 740 740" style={{ position: "absolute", left: 170, top: 190, transform: "rotate(-90deg)" }}>
      <circle className={cls} cx="370" cy="370" r={R} fill="none" stroke={stroke} strokeWidth={width} strokeLinecap="round" strokeDasharray={dash ? C : undefined} strokeDashoffset={dash ? C : undefined} />
    </svg>
  );
  return (
    <AbsoluteFill style={{ background: ink, overflow: "hidden" }}>
      <div ref={root} style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 38%, ${accent}22, transparent 60%)` }} />

        <div className="open" style={{ position: "absolute", inset: 0 }}>
          {[0, 1, 2].map((k) => <div key={k} className="pulse" style={{ position: "absolute", left: 540 - 220, top: 560 - 220, width: 440, height: 440, borderRadius: 220, border: `10px solid ${accent}` }} />)}
          <div style={{ position: "absolute", left: 90, top: 520, width: 900 }}>
            <div className="title" style={{ fontFamily: font.Anton, fontSize: titleSize, lineHeight: 1, color: paper, textTransform: "uppercase" }}>{titleText}</div>
            {script.subtitle ? <div className="subtitle" style={{ marginTop: 50, fontFamily: font.Body, fontSize: 54, fontWeight: 600, color: accent }}>{script.subtitle}</div> : null}
            {script.stat ? (
              <div className="stat" style={{ marginTop: 50, display: "flex", alignItems: "baseline", gap: 20, color: paper }}>
                <span className="stat-num" style={{ fontFamily: font.Anton, fontSize: 220, lineHeight: 0.9 }}>{script.stat.from}</span>
                <span style={{ fontFamily: font.Body, fontSize: 56, fontWeight: 700 }}>{script.stat.suffix} {script.stat.label}</span>
              </div>
            ) : null}
          </div>
        </div>

        {script.beats.slice(0, n).map((b, i) => (
          <div key={i} className="beat" style={{ position: "absolute", inset: 0, visibility: "hidden", opacity: 0 }}>
            {ringSvg("ring-base", `${paper}22`, 22)}
            <svg width="740" height="740" viewBox="0 0 740 740" style={{ position: "absolute", left: 170, top: 190, transform: "rotate(-90deg)" }}>
              <circle className="ring-run" cx="370" cy="370" r={R} fill="none" stroke={accent} strokeWidth="26" strokeLinecap="round" />
            </svg>
            <div className="num" style={{ position: "absolute", left: 170, top: 190, width: 740, height: 740, display: "grid", placeItems: "center", fontFamily: font.Anton, fontSize: 520, lineHeight: 1, color: paper }}>{n - i}</div>
            <div style={{ position: "absolute", left: 90, top: 1010, width: 900 }}>
              <div className="beat-head" style={{ fontFamily: font.Anton, fontSize: headSize(b.head), lineHeight: 1, color: accent, textTransform: "uppercase" }}>{b.head}</div>
              <div className="beat-line" style={{ marginTop: 34, fontFamily: font.Body, fontSize: 60, lineHeight: 1.25, fontWeight: 500, color: paper, opacity: 0.92 }}>{b.line}</div>
            </div>
          </div>
        ))}

        <div className="close" style={{ position: "absolute", inset: 0, visibility: "hidden", opacity: 1 }}>
          {ringSvg("ring-end", accent, 26, true)}
          <div className="go" style={{ position: "absolute", left: 170, top: 190, width: 740, height: 740, display: "grid", placeItems: "center", fontFamily: font.Anton, fontSize: 330, color: paper }}>GO</div>
          <div style={{ position: "absolute", left: 90, top: 1010, width: 900, overflow: "hidden" }}>
            <div className="handle" style={{ fontFamily: font.Anton, fontSize: handleSize, lineHeight: 1.05, color: accent, textTransform: "uppercase", whiteSpace: "nowrap" }}>{script.closing.handle}</div>
          </div>
          <div className="cta" style={{ position: "absolute", left: 90, top: 1260, padding: "30px 54px", background: accent, color: ink, borderRadius: 999, fontFamily: font.Body, fontSize: 58, fontWeight: 700 }}>{script.closing.line}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
