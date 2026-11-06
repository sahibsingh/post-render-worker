import { AbsoluteFill } from "remotion";
import { planClock } from "../clock";
import { gsap, SplitText, useGsapTimeline } from "../gsap";
import { colours, type TemplateProps } from "../types";

const font = { Anton: "Anton, 'Arial Narrow', sans-serif", Body: "Manrope, system-ui, sans-serif" };
const STAR = "polygon(50% 0%, 61% 14%, 78% 7%, 80% 25%, 98% 28%, 90% 45%, 100% 60%, 83% 68%, 85% 87%, 67% 83%, 56% 100%, 44% 83%, 26% 90%, 21% 72%, 2% 65%, 12% 50%, 0% 35%, 17% 27%, 20% 8%, 39% 14%)";

/** Price tag: a tag swings in on a string with the title and the price; the points then build up as a ticked list; a starburst closes. */
export function Tag({ script, palette, timing }: TemplateProps) {
  const clock = planClock(script, timing);
  const { paper, ink, accent, onAccent } = colours(palette);
  const titleText = script.title.replace(/[.!?]+$/, "");
  const titleSize = titleText.length <= 16 ? 170 : titleText.length <= 28 ? 140 : 112;
  const rows = script.beats.slice(0, clock.n);
  const rowTop = (i: number) => 360 + i * Math.min(340, Math.floor(1350 / Math.max(rows.length, 1)));

  const root = useGsapTimeline((tl, el) => {
    const q = gsap.utils.selector(el);
    // Opening: the string draws down, the tag swings on it like a pendulum, the price sticker pops on.
    gsap.set(q(".string path"), { drawSVG: "0% 0%" });
    tl.to(q(".string path"), { drawSVG: "0% 100%", duration: 0.5, ease: "power2.out" }, 0);
    tl.fromTo(q(".tag"), { rotation: 24, y: -200, opacity: 0 }, { rotation: 0, y: 0, opacity: 1, duration: 1.8, ease: "elastic.out(1, 0.35)" }, 0.25);
    if (script.stat) {
      const counter = { v: script.stat.from };
      const node = q(".price-num")[0];
      tl.from(q(".price"), { scale: 0, rotation: -40, duration: 0.55, ease: "back.out(2.4)" }, 1.4);
      tl.to(counter, { v: script.stat.to, duration: 1.6, ease: "power3.out", onUpdate: () => { node.textContent = Math.round(counter.v).toLocaleString("en-US"); } }, 1.4);
    }
    tl.to(q(".open"), { y: -2600, rotation: 6, duration: 0.55, ease: "power3.in" }, clock.openEnd - 0.55);

    // Points: each one is added to a list with a tick that draws itself; the newest row is lit, the older rows settle.
    q(".row").forEach((row, i) => {
      const t = clock.starts[i];
      const b = gsap.utils.selector(row);
      gsap.set(b(".tick path"), { drawSVG: "0% 0%" });
      tl.set(row, { visibility: "visible" }, t - 0.02);
      tl.from(row, { x: 700, opacity: 0, duration: 0.55, ease: "expo.out" }, t);
      tl.from(b(".disc"), { scale: 0, duration: 0.4, ease: "back.out(2.4)" }, t + 0.25);
      tl.to(b(".tick path"), { drawSVG: "0% 100%", duration: 0.4, ease: "power2.out" }, t + 0.5);
      tl.from(b(".row-line"), { opacity: 0, y: 24, duration: 0.5, ease: "power3.out" }, t + 0.7);
      tl.fromTo(b(".glow"), { opacity: 0.9 }, { opacity: 0, duration: 1.2, ease: "power2.out" }, t + 0.3);
    });
    tl.to(q(".list"), { x: -1300, opacity: 0, duration: 0.45, ease: "power3.in" }, clock.closeAt - 0.45);

    // Closing: a starburst turns slowly behind the handle; the call to action sits on a tag.
    const c = q(".close")[0];
    tl.set(c, { autoAlpha: 1 }, clock.closeAt);
    tl.from(q(".burst"), { scale: 0, rotation: -90, duration: 0.8, ease: "back.out(1.6)" }, clock.closeAt);
    tl.to(q(".burst"), { rotation: 40, duration: 6, ease: "none" }, clock.closeAt + 0.8);
    const handle = new SplitText(q(".handle")[0], { type: "chars" });
    tl.from(handle.chars, { y: 120, opacity: 0, duration: 0.5, ease: "back.out(2)", stagger: 0.03 }, clock.closeAt + 0.5);
    tl.from(q(".cta"), { y: 80, opacity: 0, rotation: 4, duration: 0.6, ease: "back.out(1.8)" }, clock.closeAt + 1.1);
  });

  const handleSize = Math.min(150, Math.floor(820 / (Math.max(script.closing.handle.length, 6) * 0.52)));
  return (
    <AbsoluteFill style={{ background: paper, overflow: "hidden" }}>
      <div ref={root} style={{ position: "absolute", inset: 0 }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: `repeating-linear-gradient(135deg, ${accent}14 0 26px, transparent 26px 52px)` }} />

        <div className="open" style={{ position: "absolute", inset: 0 }}>
          <svg className="string" width="1080" height="500" viewBox="0 0 1080 500" style={{ position: "absolute", left: 0, top: 0 }}><path d="M540 0 V420" stroke={ink} strokeWidth="8" fill="none" /></svg>
          <div className="tag" style={{ position: "absolute", left: 120, top: 380, width: 840, transformOrigin: "50% 0%", padding: "150px 70px 90px", background: ink, borderRadius: 36, clipPath: "polygon(0 0, 100% 0, 100% 100%, 0 100%)" }}>
            <div style={{ position: "absolute", left: 540 - 120 - 36, top: 46, width: 72, height: 72, borderRadius: 36, background: paper }} />
            <div className="tag-title" style={{ fontFamily: font.Anton, fontSize: titleSize, lineHeight: 1, color: paper, textTransform: "uppercase" }}>{titleText}</div>
            {script.subtitle ? <div style={{ marginTop: 40, fontFamily: font.Body, fontSize: 52, fontWeight: 700, color: accent }}>{script.subtitle}</div> : null}
          </div>
          {script.stat ? (
            <div className="price" style={{ position: "absolute", right: 70, top: 1130, width: 440, height: 440, borderRadius: 220, background: accent, color: onAccent, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: "rotate(-8deg)", boxShadow: `0 0 0 14px ${paper}, 0 0 0 22px ${accent}` }}>
              <div className="price-num" style={{ fontFamily: font.Anton, fontSize: 170, lineHeight: 1 }}>{script.stat.from}</div>
              <div style={{ fontFamily: font.Body, fontSize: 42, fontWeight: 800, textAlign: "center", padding: "0 40px" }}>{script.stat.suffix} {script.stat.label}</div>
            </div>
          ) : null}
        </div>

        <div className="list" style={{ position: "absolute", inset: 0 }}>
          {rows.map((b, i) => (
            <div key={i} className="row" style={{ position: "absolute", left: 80, top: rowTop(i), width: 920, visibility: "hidden", display: "flex", gap: 36, alignItems: "flex-start" }}>
              <div className="glow" style={{ position: "absolute", inset: -14, background: `${accent}2e`, borderRadius: 24, opacity: 0 }} />
              <div className="disc" style={{ position: "relative", flex: "none", width: 120, height: 120, borderRadius: 60, background: accent, display: "grid", placeItems: "center" }}>
                <svg className="tick" width="70" height="70" viewBox="0 0 70 70"><path d="M12 38 L29 54 L58 16" stroke={onAccent} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
              </div>
              <div style={{ position: "relative", minWidth: 0 }}>
                <div style={{ fontFamily: font.Anton, fontSize: 96, lineHeight: 1, color: ink, textTransform: "uppercase" }}>{b.head}</div>
                <div className="row-line" style={{ marginTop: 14, fontFamily: font.Body, fontSize: 52, lineHeight: 1.25, fontWeight: 600, color: ink, opacity: 0.85 }}>{b.line}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="close" style={{ position: "absolute", inset: 0, visibility: "hidden", opacity: 1 }}>
          <div className="burst" style={{ position: "absolute", left: 140, top: 440, width: 800, height: 800, background: accent, clipPath: STAR }} />
          <div style={{ position: "absolute", left: 140, top: 760, width: 800, textAlign: "center", overflow: "hidden" }}>
            <div className="handle" style={{ fontFamily: font.Anton, fontSize: handleSize, lineHeight: 1.05, color: onAccent, textTransform: "uppercase", whiteSpace: "nowrap" }}>{script.closing.handle}</div>
          </div>
          <div className="cta" style={{ position: "absolute", left: 120, top: 1330, width: 840, padding: "36px 50px", background: ink, color: paper, borderRadius: 24, textAlign: "center", fontFamily: font.Body, fontSize: 60, fontWeight: 800 }}>{script.closing.line}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
