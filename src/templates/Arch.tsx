import { AbsoluteFill, staticFile } from "remotion";
import { planClock } from "../clock";
import { gsap, SplitText, useGsapTimeline } from "../gsap";
import { colours, type TemplateProps } from "../types";

const ARCH_W = 640;
const ARCH_H = 900;
/** An arch window: straight sides, a half circle on top (the shape of a jharokha opening). */
const archPath = (w: number, h: number) => `M0 ${h} V${w / 2} A${w / 2} ${w / 2} 0 0 1 ${w} ${w / 2} V${h} Z`;

/** A jaali lattice: overlapping circles on a grid, drawn as thin lines. */
function jaali(w: number, h: number, r: number) {
  const parts: string[] = [];
  for (let y = 0; y <= h + r; y += r) for (let x = 0; x <= w + r; x += r) {
    const cx = x + ((y / r) % 2 ? r / 2 : 0);
    parts.push(`M${cx - r / 2} ${y} a${r / 2} ${r / 2} 0 1 0 ${r} 0 a${r / 2} ${r / 2} 0 1 0 ${-r} 0`);
  }
  return parts.join(" ");
}

export function Arch({ script, palette, photos }: TemplateProps) {
  const clock = planClock(script);
  const { paper, ink, accent, onAccent } = colours(palette);
  const body = "Manrope, system-ui, sans-serif";
  const serif = "'Playfair Display', Georgia, serif";
  const badge = `${script.closing.line.toUpperCase()}  •  ${script.closing.line.toUpperCase()}  •  `;
  const handleSize = Math.min(120, Math.floor(540 / (Math.max(script.closing.handle.length, 6) * 0.5)));
  const photoAt = (i: number) => (photos.length ? photos[i % photos.length] : null);
  const headSize = (t: string) => (t.length > 22 ? 84 : t.length > 14 ? 96 : 108);

  const root = useGsapTimeline((tl, el) => {
    const q = gsap.utils.selector(el);
    // The lattice draws itself once and then drifts.
    gsap.set(q(".jaali path"), { drawSVG: "0% 0%" });
    tl.to(q(".jaali path"), { drawSVG: "0% 100%", duration: 3.2, ease: "power2.inOut", stagger: { each: 0.0025, from: "start" } }, 0);
    tl.to(q(".jaali"), { x: -120, y: -120, duration: clock.total, ease: "none" }, 0);
    tl.to(q(".badge-text"), { rotation: 360, svgOrigin: "110 110", duration: 11, ease: "none", repeat: 3 }, 0);

    // Opening: the title rises through a mask line by line; the number sits in a drawn circle.
    const title = new SplitText(q(".title")[0], { type: "lines", mask: "lines" });
    tl.from(title.lines, { yPercent: 115, duration: 0.9, ease: "expo.out", stagger: 0.14 }, 0.4);
    tl.from(q(".subtitle"), { opacity: 0, y: 30, duration: 0.7, ease: "power3.out" }, 1.4);
    gsap.set(q(".ring"), { drawSVG: "0% 0%" });
    tl.to(q(".ring"), { drawSVG: "0% 100%", duration: 1.3, ease: "power3.inOut" }, 1.7);
    if (script.stat) {
      const counter = { v: script.stat.from }, node = q(".stat-num")[0];
      tl.from(q(".stat"), { opacity: 0, scale: 0.85, duration: 0.6, ease: "back.out(1.6)" }, 1.9);
      tl.to(counter, { v: script.stat.to, duration: 2, ease: "power3.out", onUpdate: () => { node.textContent = Math.round(counter.v).toLocaleString("en-US"); } }, 1.9);
    }
    tl.to(q(".open"), { y: -700, opacity: 0, duration: 0.55, ease: "power3.in" }, clock.openEnd - 0.5);

    // Points: an arch rises from the bottom holding a photo that drifts the other way; the heading comes through a mask.
    q(".beat").forEach((beat, i) => {
      const t = clock.starts[i], hold = clock.holds[i];
      const b = gsap.utils.selector(beat);
      const side = i % 2 === 0 ? -1 : 1;
      tl.set(beat, { autoAlpha: 1 }, t - 0.2);
      tl.from(b(".arch"), { y: 1300, rotation: side * 4, duration: 1.0, ease: "expo.out" }, t - 0.2);
      gsap.set(b(".arch-line"), { drawSVG: "0% 0%" });
      tl.to(b(".arch-line"), { drawSVG: "0% 100%", duration: 1.1, ease: "power2.inOut" }, t + 0.2);
      tl.fromTo(b(".arch-photo"), { y: 60 * side, scale: 1.18 }, { y: -60 * side, scale: 1.18, duration: hold + 0.8, ease: "none" }, t - 0.2);
      const head = new SplitText(b(".beat-head")[0], { type: "lines", mask: "lines" });
      tl.from(head.lines, { yPercent: 120, duration: 0.8, ease: "expo.out", stagger: 0.12 }, t + 0.35);
      const words = new SplitText(b(".beat-line")[0], { type: "words" });
      tl.from(words.words, { opacity: 0, y: 24, duration: 0.5, ease: "power2.out", stagger: 0.045 }, t + 0.8);
      tl.to(beat, { y: -1500, duration: 0.6, ease: "power3.in" }, t + hold - 0.5);
    });
    q(".dot").forEach((d, i) => {
      tl.to(d, { opacity: 1, duration: 0.2 }, clock.starts[i]);
      if (i) tl.to(q(".dot")[i - 1], { opacity: 0.3, duration: 0.2 }, clock.starts[i]);
    });

    // Closing: the arch settles in the middle, filled with the accent, and holds the handle.
    const c = q(".close")[0];
    tl.set(c, { autoAlpha: 1 }, clock.closeAt - 0.1);
    tl.from(q(".close-arch"), { y: 1400, duration: 1.0, ease: "expo.out" }, clock.closeAt - 0.1);
    const handle = new SplitText(q(".handle")[0], { type: "chars" });
    tl.from(handle.chars, { yPercent: 120, opacity: 0, duration: 0.6, ease: "back.out(2)", stagger: 0.03 }, clock.closeAt + 0.6);
    tl.from(q(".close-line"), { opacity: 0, y: 30, duration: 0.7, ease: "power3.out" }, clock.closeAt + 1.1);
  });

  const lattice = jaali(1400, 2100, 130);
  return (
    <AbsoluteFill style={{ background: paper, overflow: "hidden" }}>
      <div ref={root} style={{ position: "absolute", inset: 0, color: ink }}>
        <svg className="jaali" width="1400" height="2100" style={{ position: "absolute", left: -100, top: -100, opacity: 0.16 }}>
          <path d={lattice} stroke={ink} strokeWidth="2" fill="none" />
        </svg>

        <svg width="220" height="220" viewBox="0 0 220 220" style={{ position: "absolute", right: 50, top: 60, zIndex: 5 }}>
          <defs><path id="circ" d="M110 110 m-84 0 a84 84 0 1 1 168 0 a84 84 0 1 1 -168 0" /></defs>
          <circle cx="110" cy="110" r="108" fill={accent} />
          <g className="badge-text"><text fontFamily={body} fontWeight="800" fontSize="19" letterSpacing="3" fill={onAccent}><textPath href="#circ">{badge}</textPath></text></g>
          <circle cx="110" cy="110" r="44" fill="none" stroke={onAccent} strokeWidth="3" />
        </svg>

        <div className="open" style={{ position: "absolute", left: 90, top: 380, width: 780 }}>
          <div className="title" style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 600, fontSize: 164, lineHeight: 1.02, color: ink }}>{script.title}</div>
          {script.subtitle ? <div className="subtitle" style={{ marginTop: 40, fontFamily: body, fontSize: 48, fontWeight: 500, color: ink, opacity: 0.75 }}>{script.subtitle}</div> : null}
          {script.stat ? (
            <div className="stat" style={{ position: "relative", marginTop: 80, width: 520, height: 520 }}>
              <svg width="520" height="520" viewBox="0 0 520 520" style={{ position: "absolute", inset: 0 }}><circle className="ring" cx="260" cy="260" r="250" fill="none" stroke={accent} strokeWidth="8" /></svg>
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
                  <span className="stat-num" style={{ fontFamily: serif, fontWeight: 700, fontSize: 210, lineHeight: 1, color: accent }}>{script.stat.from}</span>
                  <span style={{ fontFamily: body, fontWeight: 700, fontSize: 56, color: accent }}>{script.stat.suffix}</span>
                </div>
                <div style={{ fontFamily: body, fontSize: 40, fontWeight: 600, marginTop: 8 }}>{script.stat.label}</div>
              </div>
            </div>
          ) : null}
        </div>

        {script.beats.slice(0, clock.n).map((b, i) => {
          const left = i % 2 === 0;
          const src = photoAt(i);
          return (
            <div key={i} className="beat" style={{ position: "absolute", inset: 0, visibility: "hidden", opacity: 0 }}>
              <div className="arch" style={{ position: "absolute", left: left ? 70 : 1080 - 70 - ARCH_W, top: 170, width: ARCH_W, height: ARCH_H }}>
                <svg width={ARCH_W} height={ARCH_H} viewBox={`0 0 ${ARCH_W} ${ARCH_H}`} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
                  <defs><clipPath id={`clip${i}`}><path d={archPath(ARCH_W, ARCH_H)} /></clipPath></defs>
                  <g clipPath={`url(#clip${i})`}>
                    <rect width={ARCH_W} height={ARCH_H} fill={i % 2 ? ink : accent} />
                    {src ? <image className="arch-photo" href={src.startsWith("http") ? src : staticFile(src)} x="0" y="-60" width={ARCH_W} height={ARCH_H + 120} preserveAspectRatio="xMidYMid slice" /> : null}
                    {!src ? <path className="arch-photo" d={jaali(ARCH_W + 160, ARCH_H + 160, 90)} transform="translate(-60 -60)" stroke={paper} strokeOpacity="0.35" strokeWidth="2" fill="none" /> : null}
                  </g>
                  <path className="arch-line" d={archPath(ARCH_W + 36, ARCH_H + 36)} transform="translate(-18 -18)" stroke={accent} strokeWidth="5" fill="none" />
                </svg>
              </div>
              <div style={{ position: "absolute", left: 90, top: 1130, width: 900, textAlign: left ? "left" : "right" }}>
                <div className="beat-head" style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 600, fontSize: headSize(b.head), lineHeight: 1.08, color: ink }}>{b.head}</div>
                <div className="beat-line" style={{ marginTop: 34, fontFamily: body, fontSize: 52, fontWeight: 500, lineHeight: 1.3, color: ink, opacity: 0.85 }}>{b.line}</div>
              </div>
            </div>
          );
        })}

        <div style={{ position: "absolute", left: 90, top: 70, display: "flex", gap: 14 }}>
          {script.beats.slice(0, clock.n).map((_, i) => (
            <svg key={i} className="dot" width="34" height="46" viewBox="0 0 34 46" style={{ opacity: 0.3 }}><path d={archPath(34, 46)} fill={accent} /></svg>
          ))}
        </div>

        <div className="close" style={{ position: "absolute", inset: 0, visibility: "hidden", opacity: 0 }}>
          <div className="close-arch" style={{ position: "absolute", left: 220, top: 250, width: 640, height: 1060 }}>
            <svg width="640" height="1060" viewBox="0 0 640 1060"><path d={archPath(640, 1060)} fill={accent} /><path d={archPath(604, 1024)} transform="translate(18 18)" stroke={onAccent} strokeOpacity="0.5" strokeWidth="3" fill="none" /></svg>
            <div style={{ position: "absolute", left: 0, right: 0, top: 560, textAlign: "center", overflow: "hidden" }}>
              <div className="handle" style={{ fontFamily: serif, fontStyle: "italic", fontWeight: 600, fontSize: handleSize, color: onAccent, whiteSpace: "nowrap" }}>{script.closing.handle}</div>
            </div>
          </div>
          <div className="close-line" style={{ position: "absolute", left: 90, right: 90, top: 1400, textAlign: "center", fontFamily: body, fontSize: 56, fontWeight: 700, color: ink }}>{script.closing.line}</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
