/**
 * Keys on a computer (item 17+++a, "keys for everything"): one table of actions and their keys, after Crusader Kings III's
 * own and Europa Universalis IV's where it has no like, and one listener that runs them. A new key is a row here and a
 * handler where its action lives; each key can be changed on the Keys page (pages/Keys.tsx) and is remembered in this
 * browser. No key acts while something is being typed (a letter, a name, a number), nor with Ctrl, Alt or the Command
 * key held, which belong to the browser. The phone has no keys and is unchanged.
 */
import { useEffect, useRef } from "react";

/** Every action with a key. Each item that adds a window, a view or an action adds its row here. */
export type KeyAction =
  | "pause" | "pace1" | "pace2" | "pace3" | "pace4" | "faster" | "slower"
  | "endSeason" | "escape"
  | "winSeat" | "winProvinces" | "winStandings" | "winPeople" | "winInbox" | "winThreads" | "winEvents" | "winRules" | "winChronicles"
  | "winMind" | "winTrail" | "winFollow" | "winLegends"
  | "viewRealms" | "viewMood" | "panUp" | "panLeft" | "panDown" | "panRight";

/**
 * A key as the table holds it. `codes` are physical keys (`KeyboardEvent.code`: the digit row and the number pad, the same
 * on every layout); `chars` are what a key types (`KeyboardEvent.key`), for keys that move between layouts: "+" sits where
 * US keyboards have "-" on Norwegian ones. `label` is how a tooltip and the Keys page name it.
 */
export interface Binding {
  codes: readonly string[];
  chars?: readonly string[];
  label: string;
}

/** The Keys page's groups, in its order. */
export type KeyGroup = "Time" | "Turns and windows" | "The map";

const key = (codes: readonly string[], label: string, chars?: readonly string[]): Binding => ({ codes, label, ...(chars !== undefined ? { chars } : {}) });
/** No key by default: there is no like in Crusader Kings III or Europa Universalis IV; one can be given on the Keys page. */
const none: Binding = { codes: [], label: "" };

/**
 * Each action's key by default, what it does in the Keys page's words, and its group. The keys are Crusader Kings III's:
 * Space, the pace keys, Escape, its F1 to F10 windows by meaning (F1 the ruler: here the seat; F2 the realm: the
 * provinces; F3 the military: the standings; F5 the courtiers: the people; F6 intrigue: the inbox; F7 factions: the
 * threads; F8 decisions: the events; F9 the encyclopedia: the rules), E for its realms map and the next of its map-mode
 * row for the mood; W, A, S, D and the arrows move the map; Enter ends one's season, as in Civilization, since seasons
 * are turns. F4 (the council) waits for the council's window.
 */
export const KeyDefaults: Record<KeyAction, { key: Binding; what: string; group: KeyGroup }> = {
  pause: { key: key(["Space"], "Space"), what: "Pause or play, even while a season plays out", group: "Time" },
  pace1: { key: key(["Digit1", "Numpad1"], "1"), what: "Slow", group: "Time" },
  pace2: { key: key(["Digit2", "Numpad2"], "2"), what: "Normal", group: "Time" },
  pace3: { key: key(["Digit3", "Numpad3"], "3"), what: "Fast", group: "Time" },
  pace4: { key: key(["Digit4", "Numpad4"], "4"), what: "Simulate", group: "Time" },
  faster: { key: key(["NumpadAdd"], "+", ["+", "="]), what: "Faster (Slow, Normal, Fast)", group: "Time" },
  slower: { key: key(["NumpadSubtract"], "−", ["-", "_"]), what: "Slower", group: "Time" },
  endSeason: { key: key(["Enter", "NumpadEnter"], "Enter"), what: "Seal your season's orders, when it is your turn", group: "Turns and windows" },
  escape: { key: key(["Escape"], "Esc"), what: "Close the window in front; open the menu when none is open", group: "Turns and windows" },
  winSeat: { key: key(["F1"], "F1"), what: "Your seat: the audience or your orders when they wait, else the season", group: "Turns and windows" },
  winProvinces: { key: key(["F2"], "F2"), what: "Provinces", group: "Turns and windows" },
  winStandings: { key: key(["F3"], "F3"), what: "Standings", group: "Turns and windows" },
  winPeople: { key: key(["F5"], "F5"), what: "People", group: "Turns and windows" },
  winInbox: { key: key(["F6"], "F6"), what: "Inbox", group: "Turns and windows" },
  winThreads: { key: key(["F7"], "F7"), what: "Threads (watching)", group: "Turns and windows" },
  winEvents: { key: key(["F8"], "F8"), what: "Events", group: "Turns and windows" },
  winRules: { key: key(["F9"], "F9"), what: "Rules", group: "Turns and windows" },
  winChronicles: { key: key(["F10"], "F10"), what: "Chronicles (when the age has ended)", group: "Turns and windows" },
  winMind: { key: none, what: "Own words (a model's)", group: "Turns and windows" },
  winTrail: { key: none, what: "Trail (god view)", group: "Turns and windows" },
  winFollow: { key: none, what: "Follow (the person followed)", group: "Turns and windows" },
  winLegends: { key: none, what: "Legends (god view)", group: "Turns and windows" },
  viewRealms: { key: key(["KeyE"], "E"), what: "The realms' map (who holds what)", group: "The map" },
  viewMood: { key: key(["KeyR"], "R"), what: "The mood of the land", group: "The map" },
  panUp: { key: key(["KeyW", "ArrowUp"], "W, ↑"), what: "Move the map up", group: "The map" },
  panLeft: { key: key(["KeyA", "ArrowLeft"], "A, ←"), what: "Move the map left", group: "The map" },
  panDown: { key: key(["KeyS", "ArrowDown"], "S, ↓"), what: "Move the map down", group: "The map" },
  panRight: { key: key(["KeyD", "ArrowRight"], "D, →"), what: "Move the map right", group: "The map" },
};

/** The actions that repeat while their key is held (the map moving); every other acts once a press. */
const Repeating: ReadonlySet<KeyAction> = new Set(["panUp", "panLeft", "panDown", "panRight"]);

// ---------------------------------------------------------------- the player's own keys

const Stored = "amarna-keys";
/** The keys the player changed, by action: one physical key each ("" for none), kept in this browser only. */
let own: Partial<Record<KeyAction, string>> = read();

function read(): Partial<Record<KeyAction, string>> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(Stored) ?? "{}");
    if (typeof v !== "object" || v === null) return {};
    const out: Partial<Record<KeyAction, string>> = {};
    for (const [a, c] of Object.entries(v)) if (a in KeyDefaults && typeof c === "string" && c.length <= 32) out[a as KeyAction] = c;
    return out;
  } catch {
    return {};
  }
}

function write(): void {
  try {
    localStorage.setItem(Stored, JSON.stringify(own));
  } catch {
    // private window or blocked storage: the keys last this page only
  }
}

/** How a physical key is named: "KeyQ" is Q, "Digit5" is 5, "ArrowUp" is ↑. */
export function keyLabel(code: string): string {
  const arrows: Record<string, string> = { ArrowUp: "↑", ArrowDown: "↓", ArrowLeft: "←", ArrowRight: "→" };
  if (code in arrows) return arrows[code];
  if (code === "Escape") return "Esc";
  return code.replace(/^Key/u, "").replace(/^Digit/u, "").replace(/^Numpad/u, "Num ");
}

/** An action's key now: the player's own, else the table's. */
export function bindingOf(action: KeyAction): Binding {
  const c = own[action];
  if (c === undefined) return KeyDefaults[action].key;
  return c === "" ? none : { codes: [c], label: keyLabel(c) };
}

/** The action a physical key is given to now, if any (to refuse giving it to a second). */
export function actionWithCode(code: string): KeyAction | null {
  for (const a of Object.keys(KeyDefaults) as KeyAction[]) if (bindingOf(a).codes.includes(code)) return a;
  return null;
}

/** Gives an action a key of the player's own ("" for none), or back its default (null). */
export function setKey(action: KeyAction, code: string | null): void {
  if (code === null) delete own[action];
  else own[action] = code;
  write();
}

/** Every key back to its default. */
export function resetKeys(): void {
  own = {};
  write();
}

/**
 * The paces, slowest first ("Pace of play": seasons are turns, so a pace sets only how long each season is watched): keys
 * 1 to 4 pick them, + and − step between them. The owner, 1 November 2026: "I don't feel we should introduce 5, just to
 * have 5. Paradox games have them because they tick time. but we have rounds, akin to civilization." Since item 17+++ a
 * season plays out at its pace (session/pacing.ts, `Paces`, by the same place), and Simulate draws nothing. `ms` is
 * a pace's key as the page keeps it (ui/update.ts, the soak tool): until 17+++ it was the pause between seasons.
 */
export const Speeds: readonly { ms: number; name: string }[] = [
  { ms: 1500, name: "Slow" },
  { ms: 400, name: "Normal" },
  { ms: 50, name: "Fast" },
  { ms: 0, name: "Simulate" },
];

/** The speed nearest a pause, by its place in {@link Speeds}. */
export function speedIndex(ms: number): number {
  let best = 0;
  for (let i = 1; i < Speeds.length; i++) if (Math.abs(Speeds[i].ms - ms) < Math.abs(Speeds[best].ms - ms)) best = i;
  return best;
}

/** A tooltip's key note: "Pause (Space)", or the text alone for an action with no key. */
export const withKey = (text: string, action: KeyAction): string => {
  const label = bindingOf(action).label;
  return label === "" ? text : `${text} (${label})`;
};

/** Whether the key goes to something being typed into, which keeps it. */
function typing(e: KeyboardEvent): boolean {
  const t = e.target as HTMLElement | null;
  if (t === null || typeof t.closest !== "function") return false;
  return t.isContentEditable || t.closest("input, textarea, select, [contenteditable='true']") !== null;
}

/** The action a key press asks for, if any. Enter on a button or a link is the button's own, as the browser has it. */
export function actionOf(e: KeyboardEvent): KeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey || typing(e)) return null;
  for (const action of Object.keys(KeyDefaults) as KeyAction[]) {
    const b = bindingOf(action);
    if (!(b.codes.includes(e.code) || (b.chars !== undefined && !e.code.startsWith("Numpad") && b.chars.includes(e.key)))) continue;
    if (e.repeat && !Repeating.has(action)) return null;
    if (action === "endSeason" && (e.target as HTMLElement | null)?.closest?.("button, a, summary") != null) return null;
    return action;
  }
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
