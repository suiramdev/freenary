import { readFileSync } from "node:fs";
import { describe, expect, it } from "bun:test";

/**
 * Guards the focus-indicator tokens in `../styles/globals.css` (WCAG 2.2
 * non-text contrast, 3:1 minimum for focus indicators).
 *
 * The test reads the tokens straight from the stylesheet, so changing a
 * surface or focus token without re-checking the ratios fails here first.
 * Run with `bun test` from `packages/ui`; CI must verify it.
 */

const GLOBALS_CSS = new URL("../styles/globals.css", import.meta.url);

/** WCAG non-text contrast minimum for focus indicators. */
const MIN_CONTRAST = 3;

const SURFACES = [
  "--background",
  "--card",
  "--popover",
  "--muted",
  "--sidebar",
] as const;

const FOCUS_TOKENS = ["--focus-ring", "--ring"] as const;

/** Custom properties declared inside one theme block (`:root` or `.dark`). */
function parseBlock(css: string, selector: string): Map<string, string> {
  const start = css.indexOf(selector);
  if (start === -1) {
    throw new Error(`globals.css has no ${selector} block`);
  }
  const open = css.indexOf("{", start);
  if (open === -1) {
    throw new Error(`globals.css ${selector} block is missing "{"`);
  }
  let depth = 0;
  let end = open;
  for (; end < css.length; end += 1) {
    if (css[end] === "{") depth += 1;
    else if (css[end] === "}") {
      depth -= 1;
      if (depth === 0) break;
    }
  }
  const tokens = new Map<string, string>();
  for (const match of css
    .slice(open + 1, end)
    .matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens.set(match[1], match[2].trim());
  }
  return tokens;
}

/** Resolves `var(--token)` (with optional fallback) against the theme map. */
function resolveValue(value: string, tokens: Map<string, string>): string {
  const match = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(value);
  if (!match) return value;
  const resolved = tokens.get(match[1]);
  if (resolved !== undefined) return resolveValue(resolved, tokens);
  if (match[2] !== undefined) return resolveValue(match[2].trim(), tokens);
  throw new Error(`cannot resolve ${value}: no such token and no fallback`);
}

type Rgb = [number, number, number];

function parseHex(value: string): Rgb | null {
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (long) {
    return [1, 2, 3].map((i) => Number.parseInt(long[i], 16) / 255) as Rgb;
  }
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(value);
  if (short) {
    return [1, 2, 3].map(
      (i) => Number.parseInt(short[i] + short[i], 16) / 255,
    ) as Rgb;
  }
  return null;
}

/** Converts an `oklch(L C H)` color to sRGB channels in [0, 1]. */
function parseOklch(value: string): Rgb | null {
  const match =
    /^oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+%?)?\s*\)$/i.exec(
      value,
    );
  if (!match) return null;
  const l = Number.parseFloat(match[1]) * (match[2] ? 0.01 : 1);
  const c = Number.parseFloat(match[3]);
  const h = (Number.parseFloat(match[4]) * Math.PI) / 180;
  const a = c * Math.cos(h);
  const b = c * Math.sin(h);
  const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
  const l3 = l_ ** 3;
  const m3 = m_ ** 3;
  const s3 = s_ ** 3;
  return [
    4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3,
    -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3,
    -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3,
  ];
}

function parseColor(value: string): Rgb {
  const color = parseHex(value) ?? parseOklch(value);
  if (!color) {
    throw new Error(`unsupported color value in globals.css: ${value}`);
  }
  return color.map((channel) => Math.min(1, Math.max(0, channel))) as Rgb;
}

/** WCAG relative luminance of an sRGB color. */
function relativeLuminance([r, g, b]: Rgb): number {
  const linear = (channel: number) =>
    channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG contrast ratio between two colors. */
function contrastRatio(first: Rgb, second: Rgb): number {
  const [hi, lo] = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );
  return (hi + 0.05) / (lo + 0.05);
}

function tokenColor(tokens: Map<string, string>, name: string): Rgb {
  const raw = tokens.get(name);
  if (raw === undefined) {
    throw new Error(`globals.css is missing token ${name}`);
  }
  return parseColor(resolveValue(raw, tokens));
}

/** Widths (px) of every `outline` declared inside a `:focus-visible` rule. */
function focusOutlineWidths(css: string): number[] {
  const widths: number[] = [];
  for (const block of css.matchAll(/:focus-visible\s*\{([^}]*)\}/g)) {
    const match = /outline\s*:\s*([\d.]+)px/.exec(block[1]);
    if (match) widths.push(Number.parseFloat(match[1]));
  }
  return widths;
}

describe("focus indicator contrast", () => {
  const css = readFileSync(GLOBALS_CSS, "utf8");
  const light = parseBlock(css, ":root");
  // Dark tokens fall back to the light ones, mirroring CSS inheritance.
  const dark = new Map([...light, ...parseBlock(css, ".dark")]);

  for (const [theme, tokens] of [
    ["light", light],
    ["dark", dark],
  ] as const) {
    for (const focusToken of FOCUS_TOKENS) {
      for (const surface of SURFACES) {
        it(`${focusToken} is at least ${MIN_CONTRAST}:1 against ${surface} (${theme})`, () => {
          const ratio = contrastRatio(
            tokenColor(tokens, focusToken),
            tokenColor(tokens, surface),
          );
          expect(ratio).toBeGreaterThanOrEqual(MIN_CONTRAST);
        });
      }
    }
  }

  it("light --focus-ring is not the old #6b97ff value", () => {
    expect(
      resolveValue(light.get("--focus-ring") ?? "", light).toLowerCase(),
    ).not.toBe("#6b97ff");
  });

  it("global :focus-visible outline is at least 2px", () => {
    const widths = focusOutlineWidths(css);
    expect(widths.length).toBeGreaterThan(0);
    for (const width of widths) {
      expect(width).toBeGreaterThanOrEqual(2);
    }
  });
});
