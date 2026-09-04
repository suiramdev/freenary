import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import path from "node:path";

import { AVATAR_EXPRESSIONS } from "../src/lib/avatar/expressions";
import {
  AVATAR_BODY_RADIUS,
  AVATAR_VIEW_BOX,
  avatarPaths,
} from "../src/lib/avatar/geometry";
import { AVATAR_SHADING } from "../src/lib/avatar/shading";

/**
 * Writes `public/favicon.svg` from the avatar's resting expression, so the tab
 * icon and the mark in the sidebar cannot drift apart: geometry comes from
 * `avatarPaths` and the lighting from `AVATAR_SHADING`, the same two modules the
 * React renderer draws from.
 *
 * Colors are the exception — literal here, because a favicon is rendered outside
 * the app where the theme tokens in `@freenary/ui` do not exist. They are the
 * sRGB values of `--avatar-*`, and the media query mirrors the `.dark` block.
 *
 * `public/favicon.png` is the raster fallback for browsers that ignore SVG
 * favicons (Safari). This script rewrites it when a rasterizer is on PATH.
 */

const BODY_LIGHT = "#1b827e";
const BODY_DARK = "#29a79f";
const SLOT_LIGHT = "#052a2a";
const SLOT_DARK = "#012222";
const RIM_LIGHT = "#000";
const RIM_DARK = "#fff";
const EYE = "#f8fdfc";

const SIZE = 256;
const PNG_SIZE = 32;

const paths = avatarPaths(AVATAR_EXPRESSIONS.neutral);
const { highlight, shade } = AVATAR_SHADING;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${AVATAR_VIEW_BOX}" width="${SIZE}" height="${SIZE}">
  <style>
    :root { --body: ${BODY_LIGHT}; --slot: ${SLOT_LIGHT}; --rim: ${RIM_LIGHT}; }
    @media (prefers-color-scheme: dark) {
      :root { --body: ${BODY_DARK}; --slot: ${SLOT_DARK}; --rim: ${RIM_DARK}; }
    }
  </style>
  <defs>
    <radialGradient id="light" cx="${highlight.cx}" cy="${highlight.cy}" r="${highlight.r}">
      <stop offset="0" stop-color="#fff" stop-opacity="${highlight.opacity}"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="shade" cx="${shade.cx}" cy="${shade.cy}" r="${shade.r}">
      <stop offset="0" stop-color="#000" stop-opacity="${shade.opacity}"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle r="${AVATAR_BODY_RADIUS}" fill="var(--body)"/>
  <circle r="${AVATAR_BODY_RADIUS}" fill="url(#light)"/>
  <circle r="${AVATAR_BODY_RADIUS}" fill="url(#shade)"/>
  <circle r="${AVATAR_BODY_RADIUS}" fill="none" stroke="var(--rim)" stroke-opacity="${AVATAR_SHADING.rimOpacity}" stroke-width="${AVATAR_SHADING.rimWidth}"/>
  <path d="${paths.slot}" fill="#fff" fill-opacity="${AVATAR_SHADING.slotLipOpacity}" transform="translate(0 ${AVATAR_SHADING.slotLipOffset})"/>
  <path d="${paths.slot}" fill="var(--slot)"/>
  <path d="${paths.leftEye}" fill="${EYE}"/>
  <path d="${paths.rightEye}" fill="${EYE}"/>
</svg>
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
