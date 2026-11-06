import { AbsoluteFill } from "remotion";
import { planClock } from "../clock";
import { gsap, SplitText, useGsapTimeline } from "../gsap";
import { colours, wobble, type TemplateProps } from "../types";

const font = { Anton: "Anton, 'Arial Narrow', sans-serif", Body: "Manrope, system-ui, sans-serif" };

/** Stack: index cards on a ruled page. Every point lands as a new card on top of the last, with a marker line under its heading. */
export function Stack({ script, palette, timing }: TemplateProps) {
  const clock = planClock(script, timing);
  const { paper, ink, accent, onAccent } = colours(palette);
  const card = palette.card && palette.card.toLowerCase() !== ink.toLowerCase() ? "#ffffff" : paper;

  const root = useGsapTimeline((tl, el) => {
    const q = gsap.utils.selector(el);
    // Opening: the title is marked up line by line, the way a teacher underlines.
    const title = new SplitText(q(".title")[0], { type: "lines,words" });
    tl.from(title.words, { y: 60, opacity: 0, duration: 0.5, ease: "power3.out", stagger: 0.07 }, 0.2);
    tl.fromTo(q(".mark"), { scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", duration: 0.5, ease: "power2.inOut", stagger: 0.22 }, 0.7);
    tl.from(q(".subtitle"), { opacity: 0, y: 30, duration: 0.6 }, 1.5);
    if (script.stat) {
      const counter = { v: script.stat.from };
      const node = q(".stat-num")[0];
      tl.from(q(".stat"), { scale: 0.6, opacity: 0, duration: 0.5, ease: "back.out(2)" }, 1.9);
      tl.to(counter, { v: script.stat.to, duration: 1.8, ease: "power3.out", onUpdate: () => { node.textContent = Math.round(counter.v).toLocaleString("en-US"); } }, 1.9);
    }
    tl.to(q(".open"), { y: -2600, rotation: -4, duration: 0.5, ease: "power3.in" }, clock.openEnd - 0.5);

    // Points: each card drops in from above and settles with a small tilt; the earlier cards stay underneath, a little darker.
    const cards = q(".card");
    cards.forEach((c, i) => {
      const t = clock.starts[i];
      const b = gsap.utils.selector(c);
      const tilt = wobble(i + 3) * 4;
      tl.set(c, { autoAlpha: 1 }, t - 0.02);
      tl.fromTo(c, { y: -1700, rotation: tilt - 10 }, { y: 0, rotation: tilt, duration: 0.7, ease: "bounce.out" }, t);
      tl.from(b(".num"), { scale: 0, rotation: -90, duration: 0.5, ease: "back.out(2.4)" }, t + 0.45);
      tl.from(b(".card-head"), { x: -60, opacity: 0, duration: 0.5, ease: "power3.out" }, t + 0.5);
      tl.fromTo(b(".marker"), { scaleX: 0 }, { scaleX: 1, transformOrigin: "left center", duration: 0.5, ease: "power2.inOut" }, t + 0.8);
      tl.from(b(".card-line"), { opacity: 0, y: 30, duration: 0.55, ease: "power3.out" }, t + 1.0);
      if (i > 0) tl.to(cards[i - 1], { filter: "brightness(0.82)", scale: 0.96, duration: 0.4 }, t + 0.3);
    });
    tl.to(cards, { y: 2300, rotation: (i: number) => wobble(i) * 14, duration: 0.6, ease: "power3.in", stagger: 0.07 }, clock.closeAt - 0.35);

    // Closing: the handle on a dark band, the closing line stamped on at an angle.
    const c = q(".close")[0];
    tl.set(c, { autoAlpha: 1 }, clock.closeAt);
    tl.from(q(".band"), { xPercent: -100, duration: 0.6, ease: "expo.out" }, clock.closeAt + 0.1);
    const handle = new SplitText(q(".handle")[0], { type: "chars" });
    tl.from(handle.chars, { y: 100, opacity: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.03 }, clock.closeAt + 0.5);
    tl.from(q(".stamp"), { scale: 3, opacity: 0, rotation: 14, duration: 0.45, ease: "power4.in" }, clock.closeAt + 1.2);
  });

  const handleSize = Math.min(170, Math.floor(860 / (Math.max(script.closing.handle.length, 6) * 0.54)));
  const headSize = (t: string) => (t.length > 22 ? 100 : t.length > 14 ? 124 : 150);
  const rules = `repeating-linear-gradient(to bottom, transparent 0 107px, ${accent}33 107px 110px)`;
  return (
    <AbsoluteFill style={{ background: paper, overflow: "hidden" }}>
      <div ref={root} style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: rules }} />
        <div style={{ position: "absolute", left: 120, top: 0, bottom: 0, width: 4, background: `${accent}88` }} />

        <div className="open" style={{ position: "absolute", left: 170, top: 330, width: 800 }}>
          <div className="title" style={{ position: "relative", fontFamily: font.Anton, fontSize: script.title.length <= 20 ? 190 : script.title.length <= 30 ? 160 : 130, lineHeight: 1.04, color: ink, textTransform: "uppercase" }}>{script.title.replace(/[.!?]+$/, "")}</div>
          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 14 }}>
            <div className="mark" style={{ height: 22, width: 640, background: accent }} />
            <div className="mark" style={{ height: 22, width: 420, background: accent }} />
          </div>
          {script.subtitle ? <div className="subtitle" style={{ marginTop: 50, fontFamily: font.Body, fontSize: 58, fontWeight: 700, color: ink, opacity: 0.85 }}>{script.subtitle}</div> : null}
          {script.stat ? (
            <div className="stat" style={{ marginTop: 40, display: "flex", alignItems: "baseline", gap: 20, color: accent }}>
              <span className="stat-num" style={{ fontFamily: font.Anton, fontSize: 280, lineHeight: 0.9 }}>{script.stat.from}</span>
              <span style={{ fontFamily: font.Body, fontSize: 70, fontWeight: 800 }}>{script.stat.suffix} {script.stat.label}</span>
            </div>
          ) : null}
        </div>

        {script.beats.slice(0, clock.n).map((b, i) => (
          <div key={i} className="card" style={{ position: "absolute", left: 110, top: 430, width: 860, minHeight: 640, padding: "80px 70px 70px", background: card, borderRadius: 18, boxShadow: "0 30px 70px rgba(0,0,0,.28)", visibility: "hidden", opacity: 0, boxSizing: "border-box" }}>
            <div className="num" style={{ position: "absolute", right: 50, top: -40, width: 120, height: 120, borderRadius: 60, background: accent, color: onAccent, display: "grid", placeItems: "center", fontFamily: font.Anton, fontSize: 72 }}>{i + 1}</div>
            <div style={{ position: "relative", display: "inline-block" }}>
              <div className="marker" style={{ position: "absolute", left: -10, right: -10, bottom: 6, height: "42%", background: `${accent}66` }} />
              <div className="card-head" style={{ position: "relative", fontFamily: font.Anton, fontSize: headSize(b.head), lineHeight: 1.02, color: ink, textTransform: "uppercase" }}>{b.head}</div>
            </div>
            <div className="card-line" style={{ marginTop: 60, fontFamily: font.Body, fontSize: 64, lineHeight: 1.28, fontWeight: 600, color: ink }}>{b.line}</div>
          </div>
        ))}

        <div className="close" style={{ position: "absolute", inset: 0, visibility: "hidden", opacity: 1 }}>
          <div className="band" style={{ position: "absolute", left: 0, top: 560, width: 1080, height: 460, background: ink }} />
          <div className="handle" style={{ position: "absolute", left: 90, top: 640, width: 900, fontFamily: font.Anton, fontSize: handleSize, lineHeight: 1.05, color: accent, textTransform: "uppercase", whiteSpace: "nowrap" }}>{script.closing.handle}</div>
          <div className="stamp" style={{ position: "absolute", left: 120, top: 1130, maxWidth: 840, padding: "26px 48px", border: `12px solid ${accent}`, color: accent, background: paper, fontFamily: font.Anton, fontSize: 84, lineHeight: 1.1, textTransform: "uppercase", transform: "rotate(-5deg)", borderRadius: 14 }}>{script.closing.line}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
