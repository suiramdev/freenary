import type { BrandAvatarState } from "@freenary/ui/lib/brand-avatar/states";
import type { FocusEvent, FormEvent } from "react";
import { useEffect, useRef, useState } from "react";

/** What the sign-in flow's latest attempt came to. */
export interface AuthOutcome {
  kind: "error" | "success";
  /** Counts attempts, so a second refusal in a row is a second shake. */
  seq: number;
}

/** A refusal is a moment; the form's own error text is what stays. */
const ERROR_HOLD_MS = 1600;
/** Keystrokes closer than this read as one stretch of typing. */
const TYPING_HOLD_MS = 900;

/** The inputs a reader types prose or a code into — not a checkbox. */
const TEXT_INPUT_TYPES = new Set([
  "email",
  "number",
  "password",
  "tel",
  "text",
  "url",
]);

type FieldKind = "secret" | "text" | null;

const fieldKindOf = (target: EventTarget | null): FieldKind => {
  if (
    !(target instanceof HTMLInputElement) ||
    !TEXT_INPUT_TYPES.has(target.type)
  ) {
    return null;
  }
  return target.type === "password" ? "secret" : "text";
};

interface UseAuthAvatarOptions {
  /** A request is in flight, whichever door it is knocking on. */
  isBusy: boolean;
  outcome: AuthOutcome | null;
}

/** Goes on an ancestor of every field; focus and input bubble up to it. */
export interface AuthAvatarHandlers {
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onInput: (event: FormEvent<HTMLElement>) => void;
}

export interface AuthAvatar {
  handlers: AuthAvatarHandlers;
  state: BrandAvatarState;
}

const pickState = (
  reaction: AuthOutcome["kind"] | null,
  isBusy: boolean,
  field: FieldKind,
  isTyping: boolean
): BrandAvatarState => {
  if (reaction === "success") {
    return "success";
  }
  if (isBusy) {
    return "loading";
  }
  if (reaction === "error") {
    return "error";
  }
  // Eyes shut for a secret, whether or not it is being typed.
  if (field === "secret") {
    return "shy";
  }
  if (isTyping) {
    return "listening";
  }
  return field === null ? "idle" : "curious";
};

/**
 * Decides the face the sign-in screen's mark wears, from what the reader is
 * doing with the form. No field has to know the mark exists.
 */
export const useAuthAvatar = ({
  isBusy,
  outcome,
}: UseAuthAvatarOptions): AuthAvatar => {
  const [field, setField] = useState<FieldKind>(null);
  const [isTyping, setIsTyping] = useState(false);
  // The last refusal whose moment has passed. Success is never let go of:
  // the page is on its way out.
  const [expiredSeq, setExpiredSeq] = useState(0);
  const typingTimer = useRef(0);

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  useEffect(() => {
    if (outcome?.kind !== "error") {
      return;
    }
    const timer = setTimeout(() => setExpiredSeq(outcome.seq), ERROR_HOLD_MS);
    return () => clearTimeout(timer);
  }, [outcome]);

  const reaction =
    outcome === null || (outcome.kind === "error" && outcome.seq <= expiredSeq)
      ? null
      : outcome.kind;

  const handleFocus = (event: FocusEvent<HTMLElement>) => {
    setField(fieldKindOf(event.target));
  };

  // Where focus is going, not where it was: the next field's own focus event
  // then confirms it, instead of the mark dropping to rest for one frame.
  const handleBlur = (event: FocusEvent<HTMLElement>) => {
    setField(fieldKindOf(event.relatedTarget));
  };

  // Typing also says which field: the first one is focused before the page
  // hydrates, so its focus event is never seen here.
  const handleInput = (event: FormEvent<HTMLElement>) => {
    const kind = fieldKindOf(event.target);
    if (kind === null) {
      return;
    }
    setField(kind);
    setIsTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = window.setTimeout(
      () => setIsTyping(false),
      TYPING_HOLD_MS
    );
  };

  return {
    handlers: {
      onBlur: handleBlur,
      onFocus: handleFocus,
      onInput: handleInput,
    },
    state: pickState(reaction, isBusy, field, isTyping),
  };
};
