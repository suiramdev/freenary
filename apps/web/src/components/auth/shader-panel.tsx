import { ShaderBackground } from "@/components/shader-background";

/** Branded split-screen side: animated shader + gradient scrim + headline. */
export const ShaderPanel = () => (
  <div className="relative hidden overflow-hidden bg-background lg:flex">
    <ShaderBackground />
    <div className="absolute inset-0 bg-linear-to-t from-background/90 via-background/30 to-transparent" />
    <div className="relative z-10 mt-auto p-12">
      <h2 className="text-5xl font-bold tracking-tight">freenary</h2>
      <p className="mt-2 text-lg italic text-muted-foreground">
        Your finances, understood.
      </p>
    </div>
  </div>
);
