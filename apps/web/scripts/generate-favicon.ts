import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

import { brandAvatarFrame } from "@freenary/ui/lib/brand-avatar/engine";
import { INK_STYLES, VIEW_BOX_SIZE } from "@freenary/ui/lib/brand-avatar/frame";

/**
 * Writes `public/favicon.svg` from the avatar's `logo` state, so the tab icon
 * and the mark in the sidebar cannot drift apart: both come out of
 * `brandAvatarFrame`, which is a pure function of state and time.
 *
 * `logo` is the only state with no clock in it, so the frame this emits is
 * stable — a favicon has no rAF loop to run one.
 *
 * The face colour is the exception. In the app the ink is `currentColor` and
 * inherits the surface; a favicon is rendered outside the app, so the two
 * literals below stand in for it and the media query mirrors the `.dark` block.
 * `logo` closes its aperture over the face, so today it emits no ink and the
 * stylesheet is left out rather than shipped dead - which is why the tab icon
 * looks the same in light and dark.
 *
 * `public/favicon.png` is the raster fallback for browsers that ignore SVG
 * favicons (Safari). This script rewrites it when a rasterizer is on PATH.
 */

const INK_LIGHT = "#0a0a0a";
const INK_DARK = "#fafafa";

const SIZE = 256;
const PNG_SIZE = 32;

const frame = brandAvatarFrame("logo", 0);

const sectors = frame.sectors
  .map((sector) => `    <path d="${sector.d}" fill="${sector.fill}"/>`)
  .join("\n");

// `logo` draws no decoration and closes its aperture over the face, so this is
// empty today. It stays because the state is a pose like any other: reopen the
// aperture and the eyes come with it.
const ink = frame.ink
  .filter((draw) => draw.opacity > 0)
  .map((draw) => {
    const style = INK_STYLES[draw.slot];
    const rule = style.fillRule ? ` fill-rule="${style.fillRule}"` : "";
    const fill = style.fill === "currentColor" ? "var(--ink)" : style.fill;
    return `  <path d="${draw.d}" fill="${fill}"${rule} opacity="${draw.opacity}"/>\n`;
  })
  .join("");

const inkStyle = ink
  ? `  <style>
    :root { --ink: ${INK_LIGHT}; }
    @media (prefers-color-scheme: dark) {
      :root { --ink: ${INK_DARK}; }
    }
  </style>
`
  : "";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_BOX_SIZE} ${VIEW_BOX_SIZE}" width="${SIZE}" height="${SIZE}">
${inkStyle}  <defs>
    <clipPath id="mark" clip-rule="evenodd">
      <path d="${frame.clip}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#mark)">
${sectors}
  </g>
${ink}</svg>
`;

const publicDir = path.join(import.meta.dirname, "..", "public");
const svgPath = path.join(publicDir, "favicon.svg");

writeFileSync(svgPath, svg);
process.stdout.write(`wrote ${svgPath} (${svg.length} bytes)\n`);

const pngPath = path.join(publicDir, "favicon.png");

const rasterizers = [
  [
    "rsvg-convert",
    ["-w", `${PNG_SIZE}`, "-h", `${PNG_SIZE}`, "-o", pngPath, svgPath],
  ],
  ["resvg", ["-w", `${PNG_SIZE}`, "-h", `${PNG_SIZE}`, svgPath, pngPath]],
] as const;

for (const [command, args] of rasterizers) {
  const result = spawnSync(command, args, { stdio: "inherit" });

  if (result.status === 0) {
    process.stdout.write(`wrote ${pngPath} at ${PNG_SIZE}px\n`);
    process.exit(0);
  }
}

process.stdout.write(
  `no rasterizer on PATH; ${pngPath} left as it was. Install rsvg-convert (librsvg) or resvg and re-run to refresh it.\n`
);
