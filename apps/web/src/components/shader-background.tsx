import { Dithering, MeshGradient } from "@paper-design/shaders-react";

/** Vibrant primary-derived palette: lime green, deep greens, dark base. */
const SHADER_COLORS = ["#4d7c0f", "#84cc16", "#1a2e0a", "#65a30d", "#0a0a0a"];

/**
 * Layered WebGL background: MeshGradient for flowing color, Dithering on top
 * for a retro dot-matrix texture. Used on login and onboarding pages.
 */
export const ShaderBackground = () => (
  <>
    <MeshGradient
      colors={SHADER_COLORS}
      distortion={0.6}
      speed={0.3}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      swirl={0.15}
    />
    <Dithering
      colorBack="#00000000"
      colorFront="#84cc16"
      scale={0.7}
      shape="warp"
      size={2}
      speed={0.4}
      style={{
        mixBlendMode: "overlay",
        opacity: 0.5,
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
      type="4x4"
    />
  </>
);
