/**
 * Keys on a computer (the polish lane's "Space and the speed keys"; the rest come with item 17+++a, "keys for
 * everything"): one table of actions and their keys, after Crusader Kings III's own, and one listener that runs them.
 * A new key is a row here and a handler where its action lives, so 17+++a extends this file rather than adding listeners.
 * No key acts while something is being typed (a letter, a name, a number), nor with Ctrl, Alt or the Command key held,
 * which belong to the browser.
 */
import { useEffect, useRef } from "react";

export type KeyAction = "pause" | "speed1" | "speed2" | "speed3" | "speed4" | "speed5" | "faster" | "slower";

/** Each action's keys, as `KeyboardEvent.code` values, and how a tooltip names them. Crusader Kings III's keys. */
export const KeyBindings: Record<KeyAction, { codes: readonly string[]; label: string }> = {
  pause: { codes: ["Space"], label: "Space" },
  speed1: { codes: ["Digit1", "Numpad1"], label: "1" },
  speed2: { codes: ["Digit2", "Numpad2"], label: "2" },
  speed3: { codes: ["Digit3", "Numpad3"], label: "3" },
  speed4: { codes: ["Digit4", "Numpad4"], label: "4" },
  speed5: { codes: ["Digit5", "Numpad5"], label: "5" },
  faster: { codes: ["Equal", "NumpadAdd"], label: "+" },
  slower: { codes: ["Minus", "NumpadSubtract"], label: "−" },
};

/** The game's speeds, slowest first, as the pause between seasons in milliseconds: keys 1 to 5 pick them. */
export const Speeds: readonly { ms: number; name: string }[] = [
  { ms: 3000, name: "Very slow" },
  { ms: 1500, name: "Slow" },
  { ms: 400, name: "Normal" },
  { ms: 150, name: "Fast" },
  { ms: 50, name: "Fastest" },
];

/** The speed nearest a pause, by its place in {@link Speeds}. */
export function speedIndex(ms: number): number {
  let best = 0;
  for (let i = 1; i < Speeds.length; i++) if (Math.abs(Speeds[i].ms - ms) < Math.abs(Speeds[best].ms - ms)) best = i;
  return best;
}

/** A tooltip's key note: "Pause (Space)". */
export const withKey = (text: string, action: KeyAction): string => `${text} (${KeyBindings[action].label})`;

/** Whether the key goes to something being typed into, which keeps it. */
function typing(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (t === null || typeof t.closest !== "function") return false;
  return t.isContentEditable || t.closest("input, textarea, select, [contenteditable='true']") !== null;
}

/** The action a key press asks for, if any. */
export function actionOf(e: KeyboardEvent): KeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || typing(e)) return null;
  for (const [action, b] of Object.entries(KeyBindings) as [KeyAction, (typeof KeyBindings)[KeyAction]][]) if (b.codes.includes(e.code)) return action;
  return null;
}

/**
 * Runs the handlers given for the keys pressed, while the component is shown. The handlers are read at the moment of the
 * key press, so they always see the current state; an action with no handler leaves its key to the browser.
 */
export function useKeys(handlers: Partial<Record<KeyAction, () => void>>): void {
  const current = useRef(handlers);
  current.current = handlers;
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const action = actionOf(e);
      const run = action === null ? undefined : current.current[action];
      if (run === undefined) return;
      e.preventDefault();
      run();
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, []);
}
