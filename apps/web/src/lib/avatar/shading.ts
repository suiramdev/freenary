/**
 * How the mark is shaded, shared by the React renderer and the favicon
 * generator. Both draw the same sphere from these numbers, so retuning the
 * lighting cannot leave the tab icon behind — which is the whole reason the
 * generator exists. Colors are not here: the app reads the `--avatar-*` tokens
 * and the favicon carries literals, because a tab icon has no theme.
 */

export interface AvatarSphereGradient {
  /** Centre of the gradient, as a fraction of the body's bounding box. */
  cx: number;
  cy: number;
  /** Radius, as a fraction of the same box. */
  r: number;
  /** Opacity at the centre; the outer stop is always transparent. */
  opacity: number;
}

export const AVATAR_SHADING = {
  /** White, off-centre towards the top left: the highlight. */
  highlight: { cx: 0.34, cy: 0.24, opacity: 0.26, r: 0.85 },
  /** Hairline around the silhouette, for depth against a matching background. */
  rimOpacity: 0.1,
  rimWidth: 2,
  /** Black, low and slightly right: the underside falling away. */
  shade: { cx: 0.6, cy: 0.92, opacity: 0.16, r: 0.7 },
  /**
   * The slot is drawn twice: a lit copy pushed down by this much, then the dark
   * opening over it. That lip is what turns a dark capsule into a hole.
   */
  slotLipOffset: 3,
  slotLipOpacity: 0.2,
} satisfies {
  highlight: AvatarSphereGradient;
  shade: AvatarSphereGradient;
  rimOpacity: number;
  rimWidth: number;
  slotLipOffset: number;
  slotLipOpacity: number;
};
