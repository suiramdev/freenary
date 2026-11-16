import { FlutedGlass } from "@paper-design/shaders-react";
import { useSyncExternalStore } from "react";

const BACKDROP_IMAGE = "/onboarding/pastel-clouds.webp";
const BACKDROP_WIDTH = 1800;
const BACKDROP_HEIGHT = 1362;
const WIDE_SCREEN = "(min-width: 64rem)";
const TRANSPARENT = "#00000000";
const SHADOW = "#1f2a44";
const HIGHLIGHT = "#ffffff";

const BACKDROP_LOOK = {
  angle: 0,
  blur: 0.5,
  distortion: 0.4,
  distortionShape: "contour",
  edges: 0.5,
  grainMixer: 0.04,
  grainOverlay: 0.04,
  highlights: 0.04,
  scale: 1.6,
  shadows: 0.06,
  shape: "wave",
  size: 0.95,
  stretch: 0.6,
} as const;

const subscribeToWidth = (onChange: () => void) => {
  const query = window.matchMedia(WIDE_SCREEN);

  query.addEventListener("change", onChange);

  return () => query.removeEventListener("change", onChange);
};

const isWideScreen = (): boolean => window.matchMedia(WIDE_SCREEN).matches;
const isServerWide = (): boolean => false;

export const FlutedBackdrop = () => {
  const showsShader = useSyncExternalStore(
    subscribeToWidth,
    isWideScreen,
    isServerWide
  );

  return (
    <div className="absolute inset-0">
      <img
        alt=""
        className="absolute inset-0 size-full scale-110 object-cover blur-2xl"
        height={BACKDROP_HEIGHT}
        src={BACKDROP_IMAGE}
        width={BACKDROP_WIDTH}
      />
      {showsShader ? (
        <FlutedGlass
          {...BACKDROP_LOOK}
          className="absolute inset-0"
          colorBack={TRANSPARENT}
          colorHighlight={HIGHLIGHT}
          colorShadow={SHADOW}
          fit="cover"
          height="100%"
          image={BACKDROP_IMAGE}
          margin={0}
          shift={0}
          width="100%"
        />
      ) : null}
      <div className="absolute inset-0 bg-white/10 dark:bg-black/45" />
    </div>
  );
};
