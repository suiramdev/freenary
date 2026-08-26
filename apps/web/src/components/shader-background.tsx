import { FlutedGlass, MeshGradient } from "@paper-design/shaders-react";

/** Vibrant primary-derived palette: lime green, deep greens, dark base. */
const SHADER_COLORS = ["#4d7c0f", "#84cc16", "#1a2e0a", "#65a30d", "#0a0a0a"];

/**
 * Layered WebGL background: MeshGradient for flowing color, FlutedGlass on top
 * for ribbed glass texture. Used on login and onboarding pages.
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
    <FlutedGlass
      angle={90}
      blur={0.15}
      colorBack="#00000000"
      colorHighlight="#ffffff"
      colorShadow="#000000"
      distortion={0.3}
      distortionShape="prism"
      edges={0.2}
      highlights={0.08}
      margin={0}
      shadows={0.15}
      shape="lines"
      size={0.35}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
    />
  </>
);
