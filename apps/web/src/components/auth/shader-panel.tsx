import { MeshGradient } from "@paper-design/shaders-react";

const SHADER_COLORS = ["#0a0a0a", "#1a2e1a", "#2d4a2d", "#0d1f0d"];

export const ShaderPanel = () => (
  <div className="bg-background relative hidden overflow-hidden lg:flex">
    <MeshGradient
      className="pointer-events-none absolute inset-0"
      colors={SHADER_COLORS}
      distortion={0.4}
      speed={0.4}
      style={{ width: "100%", height: "100%" }}
      swirl={0.1}
    />
    <div className="from-background/90 via-background/30 absolute inset-0 bg-linear-to-t to-transparent" />
    <div className="relative z-10 mt-auto p-12">
      <h2 className="text-5xl font-bold tracking-tight">freenary</h2>
      <p className="text-muted-foreground mt-2 text-lg italic">
        Your finances, understood.
      </p>
    </div>
  </div>
);
