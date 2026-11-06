import { AbsoluteFill } from "remotion";
import { planClock } from "../clock";
import { gsap, SplitText, useGsapTimeline } from "../gsap";
import { colours, type TemplateProps } from "../types";

const font = { Anton: "Anton, 'Arial Narrow', sans-serif", Body: "'Space Grotesk', system-ui, sans-serif" };

/** Corner brackets drawn around a box, like crop marks on a drawing. */
const Frame = ({ w, h, className, stroke }: { w: number; h: number; className: string; stroke: string }) => (
  <svg className={className} width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
    <path d={`M0 70 V0 H70 M${w - 70} 0 H${w} V70 M${w} ${h - 70} V${h} H${w - 70} M70 ${h} H0 V${h - 70}`} stroke={stroke} strokeWidth="8" fill="none" strokeLinecap="square" />
  </svg>
);

/** Blueprint: a drawing on graph paper. Every point is a callout: a node, a line that is drawn to it and a labelled box. */
export function Blueprint({ script, palette, timing }: TemplateProps) {
  const clock = planClock(script, timing);
  const { paper, ink, accent } = colours(palette);
  const titleText = script.title.replace(/[.!?]+$/, "");
  const titleSize = titleText.length <= 16 ? 170 : titleText.length <= 28 ? 136 : 108;
  const headSize = (t: string) => (t.length > 22 ? 92 : t.length > 14 ? 110 : 130);

  const root = useGsapTimeline((tl, el) => {
    const q = gsap.utils.selector(el);
    // The graph paper slowly drifts for the whole video.
    tl.to(q(".grid")[0], { x: -140, y: -140, duration: clock.total, ease: "none" }, 0);

    // Opening: the frame draws itself, the title is set inside it, the subtitle is typed in.
    gsap.set(q(".frame-open path"), { drawSVG: "0% 0%" });
    tl.to(q(".frame-open path"), { drawSVG: "0% 100%", duration: 0.9, ease: "power2.inOut" }, 0.1);
    const title = new SplitText(q(".title")[0], { type: "lines,words" });
    tl.from(title.words, { opacity: 0, x: -50, duration: 0.45, ease: "power3.out", stagger: 0.09 }, 0.7);
    const sub = q(".subtitle")[0];
    if (sub) { const full = sub.textContent ?? ""; const o = { n: 0 }; sub.textContent = ""; tl.to(o, { n: full.length, duration: 1.0, ease: "none", onUpdate: () => { sub.textContent = full.slice(0, Math.round(o.n)); } }, 1.5); }
    if (script.stat) {
      const counter = { v: script.stat.from };
      const node = q(".stat-num")[0];
      tl.from(q(".stat"), { opacity: 0, y: 40, duration: 0.5, ease: "power3.out" }, 2.0);
      tl.to(counter, { v: script.stat.to, duration: 1.8, ease: "power3.out", onUpdate: () => { node.textContent = Math.round(counter.v).toLocaleString("en-US"); } }, 2.0);
    }
    tl.to(q(".open"), { opacity: 0, duration: 0.35 }, clock.openEnd - 0.4);

    // Points: a node pops on the centre line, a leader line draws out to the box, the box is labelled with the heading and the text.
    q(".beat").forEach((beat, i) => {
      const t = clock.starts[i];
      const b = gsap.utils.selector(beat);
      gsap.set(b(".leader"), { drawSVG: "0% 0%" });
      gsap.set(b(".dim path"), { drawSVG: "0% 0%" });
      const head = new SplitText(b(".beat-head")[0], { type: "words" });
      tl.set(beat, { autoAlpha: 1 }, t - 0.02);
      tl.from(b(".node"), { scale: 0, duration: 0.4, ease: "back.out(3)" }, t);
      tl.to(b(".leader"), { drawSVG: "0% 100%", duration: 0.55, ease: "power2.inOut" }, t + 0.25);
      tl.to(b(".dim path"), { drawSVG: "0% 100%", duration: 0.6, ease: "power2.out", stagger: 0.1 }, t + 0.3);
      tl.from(b(".box"), { opacity: 0, scaleX: 0.2, transformOrigin: "left center", duration: 0.45, ease: "power3.out" }, t + 0.6);
      tl.from(head.words, { opacity: 0, y: 40, duration: 0.4, ease: "power3.out", stagger: 0.07 }, t + 0.8);
      tl.from(b(".beat-line"), { opacity: 0, duration: 0.6 }, t + 1.1);
      tl.to(beat, { opacity: 0, duration: 0.3 }, t + clock.holds[i] - 0.32);
    });

    // Closing: the frame draws around the handle, the call to action is set in a box with a cursor.
    const c = q(".close")[0];
    tl.set(c, { autoAlpha: 1 }, clock.closeAt);
    gsap.set(q(".frame-close path"), { drawSVG: "0% 0%" });
    tl.to(q(".frame-close path"), { drawSVG: "0% 100%", duration: 0.8, ease: "power2.inOut" }, clock.closeAt);
    const handle = new SplitText(q(".handle")[0], { type: "chars" });
    tl.from(handle.chars, { opacity: 0, y: 40, duration: 0.4, ease: "power3.out", stagger: 0.03 }, clock.closeAt + 0.5);
    tl.from(q(".cta"), { opacity: 0, x: -60, duration: 0.55, ease: "power3.out" }, clock.closeAt + 1.1);
    tl.fromTo(q(".cursor"), { opacity: 1 }, { opacity: 0, duration: 0.35, repeat: 9, yoyo: true, ease: "steps(1)" }, clock.closeAt + 1.4);
  });

  const handleSize = Math.min(150, Math.floor(780 / (Math.max(script.closing.handle.length, 6) * 0.52)));
  const gridLines = `linear-gradient(${paper}1c 2px, transparent 2px), linear-gradient(90deg, ${paper}1c 2px, transparent 2px)`;
  return (
    <AbsoluteFill style={{ background: ink, overflow: "hidden" }}>
      <div ref={root} style={{ position: "absolute", inset: 0 }}>
        <div className="grid" style={{ position: "absolute", left: -140, top: -140, width: 1360, height: 2200, backgroundImage: gridLines, backgroundSize: "70px 70px" }} />
        <div style={{ position: "absolute", left: 540 - 2, top: 0, bottom: 0, width: 4, background: `${paper}22` }} />

        <div className="open" style={{ position: "absolute", left: 90, top: 330, width: 900, height: 900 }}>
          <Frame w={900} h={900} className="frame-open" stroke={accent} />
          <div style={{ position: "absolute", left: 70, top: 90, width: 760 }}>
            <div className="title" style={{ fontFamily: font.Anton, fontSize: titleSize, lineHeight: 1, color: paper, textTransform: "uppercase" }}>{titleText}</div>
            {script.subtitle ? <div className="subtitle" style={{ marginTop: 44, fontFamily: font.Body, fontSize: 50, fontWeight: 500, color: accent }}>{script.subtitle}</div> : null}
            {script.stat ? (
              <div className="stat" style={{ marginTop: 50, display: "flex", alignItems: "baseline", gap: 20, color: paper }}>
                <span className="stat-num" style={{ fontFamily: font.Anton, fontSize: 190, lineHeight: 0.9 }}>{script.stat.from}</span>
                <span style={{ fontFamily: font.Body, fontSize: 50, fontWeight: 600 }}>{script.stat.suffix} {script.stat.label}</span>
              </div>
            ) : null}
          </div>
        </div>

        {script.beats.slice(0, clock.n).map((b, i) => {
          const left = i % 2 === 0;
          return (
            <div key={i} className="beat" style={{ position: "absolute", inset: 0, visibility: "hidden", opacity: 0 }}>
              <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", left: 0, top: 0 }}>
                <path className="leader" d={left ? "M540 700 H300 V560" : "M540 700 H780 V560"} stroke={accent} strokeWidth="6" fill="none" />
                <g className="dim">
                  <path d="M120 1560 H960" stroke={paper} strokeWidth="4" opacity="0.6" fill="none" />
                  <path d="M120 1530 V1590 M960 1530 V1590" stroke={paper} strokeWidth="4" opacity="0.6" fill="none" />
                </g>
              </svg>
              <div className="node" style={{ position: "absolute", left: 540 - 46, top: 700 - 46, width: 92, height: 92, borderRadius: 46, background: accent, color: ink, display: "grid", placeItems: "center", fontFamily: font.Anton, fontSize: 54 }}>{i + 1}</div>
              <div className="box" style={{ position: "absolute", left: 90, top: 760, width: 900, padding: "50px 56px", border: `6px solid ${paper}`, background: `${ink}f2` }}>
                <div className="beat-head" style={{ fontFamily: font.Anton, fontSize: headSize(b.head), lineHeight: 1, color: accent, textTransform: "uppercase" }}>{b.head}</div>
                <div className="beat-line" style={{ marginTop: 30, fontFamily: font.Body, fontSize: 58, lineHeight: 1.25, fontWeight: 500, color: paper }}>{b.line}</div>
              </div>
            </div>
          );
        })}

        <div className="close" style={{ position: "absolute", inset: 0, visibility: "hidden", opacity: 1 }}>
          <div style={{ position: "absolute", left: 90, top: 520, width: 900, height: 700 }}>
            <Frame w={900} h={700} className="frame-close" stroke={accent} />
            <div style={{ position: "absolute", left: 60, top: 150, width: 780 }}>
              <div className="handle" style={{ fontFamily: font.Anton, fontSize: handleSize, lineHeight: 1.05, color: paper, textTransform: "uppercase", whiteSpace: "nowrap" }}>{script.closing.handle}</div>
              <div className="cta" style={{ marginTop: 60, fontFamily: font.Body, fontSize: 58, fontWeight: 600, color: accent }}>{script.closing.line}<span className="cursor" style={{ display: "inline-block", width: 24, height: 58, background: accent, marginLeft: 14, verticalAlign: "bottom" }} /></div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
