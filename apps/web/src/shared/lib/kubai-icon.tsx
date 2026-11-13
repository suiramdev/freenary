import type {
  IconComponent,
  IconComponentProps,
} from "@freenary/ui/lib/icon-context";
import type { KubaiIconComponent, KubaiIconProps } from "kubai-icons-react";
import { useEffect, useState } from "react";

import type { ChartColorVar } from "./chart-colors";

type TogglePulse = "replay" | "play" | null;

const TRIGGER_HOST_SELECTOR = [
  "button",
  "a[href]",
  "[role='button']",
  "[role='link']",
  "[role='menuitem']",
  "[role='menuitemcheckbox']",
  "[role='menuitemradio']",
  "[role='option']",
  "[role='switch']",
  "[role='tab']",
].join(", ");

const TOGGLE_ATTRIBUTES = [
  "aria-checked",
  "aria-current",
  "aria-expanded",
  "aria-pressed",
  "aria-selected",
];

const KUBAI_MOTION_MS = 460;
const PLAY_HOLD_MS = KUBAI_MOTION_MS + 240;
const REPLAY_RETREAT_MS = 200;

const pulseDurationMs = (pulse: Exclude<TogglePulse, null>) =>
  pulse === "play" ? PLAY_HOLD_MS : REPLAY_RETREAT_MS;

const isMousePointer = (event: Event) =>
  !(event instanceof PointerEvent) ||
  event.pointerType === "" ||
  event.pointerType === "mouse";

const useTriggerHostMotion = (icon: SVGSVGElement | null) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocusVisible, setIsFocusVisible] = useState(false);
  const [pulse, setPulse] = useState<TogglePulse>(null);
  useEffect(() => {
    const host = icon?.parentElement?.closest(TRIGGER_HOST_SELECTOR) ?? icon;

    if (!host) {
      return;
    }

    let pulseTimer: ReturnType<typeof setTimeout> | undefined;
    let pointerInside = false;
    let focusVisible = false;

    const setPointerInside = (inside: boolean) => {
      pointerInside = inside;
      setIsHovered(inside);
    };

    const setFocusVisible = (visible: boolean) => {
      focusVisible = visible;
      setIsFocusVisible(visible);
    };

    const isToggle = (mutation: MutationRecord) =>
      mutation.attributeName !== null &&
      mutation.oldValue !== host.getAttribute(mutation.attributeName) &&
      !(
        mutation.attributeName === "aria-expanded" &&
        (pointerInside || focusVisible)
      );

    const startPulse = (mutations: MutationRecord[]) => {
      if (!mutations.some(isToggle)) {
        return;
      }

      const next = pointerInside || focusVisible ? "replay" : "play";
      clearTimeout(pulseTimer);
      setPulse(next);
      pulseTimer = setTimeout(() => setPulse(null), pulseDurationMs(next));
    };

    const handlePointerEnter = (event: Event) => {
      if (isMousePointer(event)) {
        setPointerInside(true);
      }
    };

    const handlePointerLeave = (event: Event) => {
      if (isMousePointer(event)) {
        setPointerInside(false);
      }
    };

    const handleFocusIn = () => setFocusVisible(host.matches(":focus-visible"));

    const handleFocusOut = () => setFocusVisible(false);

    host.addEventListener("pointerenter", handlePointerEnter);
    host.addEventListener("pointerleave", handlePointerLeave);
    host.addEventListener("focusin", handleFocusIn);
    host.addEventListener("focusout", handleFocusOut);

    const toggleObserver = new MutationObserver(startPulse);
    toggleObserver.observe(host, {
      attributeFilter: TOGGLE_ATTRIBUTES,
      attributeOldValue: true,
      attributes: true,
    });

    return () => {
      clearTimeout(pulseTimer);
      toggleObserver.disconnect();
      host.removeEventListener("pointerenter", handlePointerEnter);
      host.removeEventListener("pointerleave", handlePointerLeave);
      host.removeEventListener("focusin", handleFocusIn);
      host.removeEventListener("focusout", handleFocusOut);
    };
  }, [icon]);

  if (pulse === "play") {
    return true;
  }

  if (pulse === "replay") {
    return false;
  }

  return isHovered || isFocusVisible;
};

type HostAnimatedKubaiIconProps = Omit<KubaiIconProps, "hover" | "trigger"> & {
  icon: KubaiIconComponent;
};

export const HostAnimatedKubaiIcon = ({
  icon: Icon,
  ...props
}: HostAnimatedKubaiIconProps) => {
  const [iconElement, setIconElement] = useState<SVGSVGElement | null>(null);
  const hover = useTriggerHostMotion(iconElement);

  return <Icon {...props} hover={hover} ref={setIconElement} trigger="none" />;
};

const cache = new Map<KubaiIconComponent, Map<ChartColorVar, IconComponent>>();

export const kubaiIcon = (
  Icon: KubaiIconComponent,
  color: ChartColorVar
): IconComponent => {
  const byColor = cache.get(Icon) ?? new Map<ChartColorVar, IconComponent>();
  let adapted = byColor.get(color);

  if (!adapted) {
    adapted = ({ className, size }: IconComponentProps) => (
      <HostAnimatedKubaiIcon
        className={className}
        color={color}
        icon={Icon}
        size={size}
      />
    );

    byColor.set(color, adapted);
    cache.set(Icon, byColor);
  }

  return adapted;
};
