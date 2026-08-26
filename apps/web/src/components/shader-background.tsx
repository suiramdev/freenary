import { DotGrid } from "@paper-design/shaders-react";

export const ShaderBackground = () => (
  <DotGrid
    colorBack="#00000000"
    colorFill="#333333"
    colorStroke="#33333300"
    gapX={24}
    gapY={24}
    opacityRange={0.3}
    shape="circle"
    size={1}
    sizeRange={0}
    strokeWidth={0}
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
  />
);
