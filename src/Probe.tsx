import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
export const Probe = () => {
  const f = useCurrentFrame();
  return <AbsoluteFill style={{ background: "#101820", color: "#fff", alignItems: "center", justifyContent: "center", fontSize: 120, fontFamily: "sans-serif" }}><div style={{ transform: `translateY(${interpolate(f, [0, 30], [200, 0], { extrapolateRight: "clamp" })}px)` }}>Remotion {f}</div></AbsoluteFill>;
};
