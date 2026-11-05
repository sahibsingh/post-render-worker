import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { planClock } from "../clock";
import { colours, type TemplateProps } from "../types";

const ease = (t: number) => 1 - (1 - Math.min(1, Math.max(0, t))) ** 4;

/** Weight plates slide onto a bar, one per point, under a slowly moving camera. Real lighting and depth, drawn with Three.js. */
export function Plates({ script, palette }: TemplateProps) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  const clock = planClock(script);
  const { paper, ink, accent } = colours(palette);
  const n = clock.n;
  const orbit = Math.sin(t * 0.35) * 0.55;
  const font = { display: "Anton, 'Arial Narrow', sans-serif", text: "'Space Grotesk', system-ui, sans-serif" };
  const current = Math.max(0, clock.starts.filter((s) => t >= s - 0.05).length - 1);
  const inBeats = t >= clock.openEnd - 0.2 && t < clock.closeAt;
  const beat = script.beats[current];
  const local = t - clock.starts[current];
  const fade = interpolate(local, [0, 0.35, clock.holds[current] - 0.35, clock.holds[current]], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ background: ink }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [Math.sin(orbit) * 13, 2.6, Math.cos(orbit) * 13], fov: 30 }} shadows>
        <color attach="background" args={[ink]} />
        <fog attach="fog" args={[ink, 14, 30]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 6, 5]} intensity={2.4} castShadow />
        <pointLight position={[-5, 2, -3]} intensity={30} color={accent} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.6, 0]} receiveShadow>
          <planeGeometry args={[40, 40]} />
          <meshStandardMaterial color={ink} roughness={0.9} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.09, 0.09, 8, 32]} />
          <meshStandardMaterial color={paper} metalness={0.9} roughness={0.25} />
        </mesh>
        {Array.from({ length: n }, (_, i) => {
          const start = clock.starts[i] - 0.2;
          const p = ease((t - start) / 1.1);
          const x = interpolate(p, [0, 1], [7, -2.4 + i * 0.7]);
          const spin = (1 - p) * 6 + t * 0.15;
          const lift = 0.35 + (1 - p) * 1.2;
          return (
            <group key={i} position={[x, lift, 0]} rotation={[spin, 0, 0]} visible={p > 0.001}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[1.25 - i * 0.07, 1.25 - i * 0.07, 0.3, 64]} />
                <meshStandardMaterial color={i % 2 ? paper : accent} metalness={0.75} roughness={0.32} />
              </mesh>
              <mesh rotation={[0, 0, Math.PI / 2]} position={[0.18, 0, 0]}>
                <cylinderGeometry args={[0.38, 0.38, 0.05, 48]} />
                <meshStandardMaterial color={ink} metalness={0.9} roughness={0.2} />
              </mesh>
            </group>
          );
        })}
      </ThreeCanvas>
      <AbsoluteFill style={{ padding: 90 }}>
        {t < clock.openEnd - 0.3 ? (
          <div style={{ marginTop: 160, opacity: interpolate(t, [0.2, 0.8, clock.openEnd - 0.7, clock.openEnd - 0.3], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <div style={{ fontFamily: font.display, fontSize: 190, lineHeight: 0.95, color: paper, textTransform: "uppercase" }}>{script.title.replace(/[.!?]+$/, "")}</div>
            <div style={{ marginTop: 36, fontFamily: font.text, fontSize: 54, color: paper, opacity: 0.8 }}>{script.subtitle}</div>
          </div>
        ) : null}
        {inBeats && beat ? (
          <div style={{ position: "absolute", left: 90, right: 90, bottom: 150, opacity: fade, transform: `translateY(${(1 - Math.min(1, fade * 2)) * 40}px)` }}>
            <div style={{ fontFamily: font.display, fontSize: 150, lineHeight: 0.98, color: accent, textTransform: "uppercase" }}>{beat.head}</div>
            <div style={{ marginTop: 28, fontFamily: font.text, fontSize: 60, lineHeight: 1.22, color: paper }}>{beat.line}</div>
          </div>
        ) : null}
        {t >= clock.closeAt ? (
          <div style={{ position: "absolute", left: 90, bottom: 200, opacity: interpolate(t - clock.closeAt, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }) }}>
            <div style={{ fontFamily: font.display, fontSize: 130, color: paper, textTransform: "uppercase", whiteSpace: "nowrap" }}>{script.closing.handle}</div>
            <div style={{ marginTop: 24, fontFamily: font.text, fontSize: 58, fontWeight: 700, color: accent }}>{script.closing.line}</div>
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
