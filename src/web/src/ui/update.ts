/**
 * The newest version is always the one played, without asking (items 11c+ and 17a). The installed app starts from its
 * offline cache; when a new version has been published, the new service worker installs beside the old one and takes over
 * by itself: at once when no game is on screen (on opening, on the start screen, when a game is started or continued), and
 * during a game at the next season, reloading into the same game from its last saved season (its log is saved after every
 * season) with auto-play and speed as they were, and a short "Updated" line after. Only a new version whose rules the game
 * on screen cannot carry on in waits, saying so, until that game is left. The app looks for a new version when it starts,
 * when it comes back to the front, and every half hour.
 */
import { CURRENT_VERSION } from "@amarna/engine";
import { useSyncExternalStore } from "react";

const ResumeKey = "amarna-resume";

/** What a reload into a game carries over: the game, and how it was being watched. */
export interface Resume {
  id: string;
  auto: boolean;
  delay: number;
  /** Set when the reload was a new version taking over, for the "Updated" line after. */
  updated: boolean;
}

/** The waiting version: a service worker installed and not yet in control, or null when the new version is in control already. */
let waiting: ServiceWorker | null = null;
/** Whether a new version has been found and not yet taken over. */
let found = false;
let taking = false;
/** The game on screen, if any: its saved log is what a reload resumes. */
let game: string | null = null;
/** Whether the game screen is showing (a game held while the start screen shows counts as not on screen). */
let onPlayScreen = false;
/** How the game on screen is being watched, kept by the game page for the reload. */
let watching: { auto: boolean; delay: number } = { auto: false, delay: 400 };
/**
 * Whether the new version plays the game on screen under the same rules (its save version), so it can go on there; a game
 * saved under other rules cannot be continued by the new version (GameRunner.versionProblem). Unknown counts as not yet.
 */
let sameRules: boolean | null = null;
let seasonTimer = 0;
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((f) => f());

/** The game being played (null when none) and how it is watched, told by the game page whenever either changes. */
export function playing(id: string | null, auto = false, delay = 400): void {
  game = id === "" ? null : id;
  watching = { auto, delay };
  decide();
}

/** Which screen shows, told by the app: a new version takes over at once off the game screen. */
export function screen(play: boolean): void {
  onPlayScreen = play;
  decide();
}

/** A season was played on screen: a new version with the same rules takes over now, into the same game. */
export function seasonPlayed(): void {
  if (!found || !onPlayScreen || game === null || sameRules !== true) return;
  // A moment for the worker's save of the season just played, which follows the season on screen.
  clearTimeout(seasonTimer);
  seasonTimer = window.setTimeout(() => {
    if (found && game !== null && sameRules === true) takeOver({ id: game, ...watching, updated: true });
  }, 600);
}

/** Reloads the page into a game (or to the start screen with null), carrying how it was watched: the error screen's way back. */
export function reloadInto(id: string | null, how: { auto: boolean; delay: number } = watching): void {
  remember(id === null ? null : { id, ...how, updated: false });
  location.reload();
}

function remember(r: Resume | null): void {
  try {
    if (r === null) sessionStorage.removeItem(ResumeKey);
    else sessionStorage.setItem(ResumeKey, JSON.stringify(r));
  } catch {
    // no storage: the reload lands on the start screen, where the saved game can be continued
  }
}

/** Lets the found version take over and reloads; with a game, the reload goes back into it. */
function takeOver(resume: Resume | null): void {
  if (!found) return;
  found = false;
  remember(resume);
  taking = true;
  if (waiting === null) location.reload();
  else waiting.postMessage("take-over");
}

/** A new version found, or the screen changed: takes over now if nothing on screen stands in the way. */
function decide(): void {
  if (!found) return;
  if (!onPlayScreen || game === null) {
    takeOver(null);
    return;
  }
  if (sameRules === null) {
    sameRules = false;
    fetch("version.json", { cache: "no-store" })
      .then((r) => r.json() as Promise<{ save?: number }>)
      .then((v) => (sameRules = v.save === CURRENT_VERSION))
      .catch(() => (sameRules = false))
      .finally(notify);
  }
  notify();
}

/** The game a reload goes back to, read once as the page starts. */
let resume: Resume | null = (() => {
  try {
    const raw = sessionStorage.getItem(ResumeKey);
    sessionStorage.removeItem(ResumeKey);
    if (raw === null) return null;
    const r = JSON.parse(raw) as Partial<Resume>;
    return typeof r.id === "string" ? { id: r.id, auto: r.auto === true, delay: typeof r.delay === "number" ? r.delay : 400, updated: r.updated === true } : null;
  } catch {
    return null;
  }
})();
/** Whether the page was reloaded into a game, still to be resumed. */
export const resuming = (): boolean => resume !== null;
/** The game to resume after a reload, once; how it was watched stays for the game page (applyResumed). */
let resumedHow: Resume | null = null;
export function takeResume(): string | null {
  const r = resume;
  resume = null;
  if (r === null) return null;
  resumedHow = r;
  if (r.updated) {
    updatedUntil = Date.now() + 8000;
    window.setTimeout(notify, 8100);
  }
  return r.id;
}
/** Once the resumed game runs, how it was watched is taken, once: auto-play and speed as before the reload. */
export function takeResumedHow(id: string): { auto: boolean; delay: number } | null {
  if (resumedHow === null || resumedHow.id !== id) return null;
  const how = { auto: resumedHow.auto, delay: resumedHow.delay };
  resumedHow = null;
  return how;
}

let updatedUntil = 0;

/** What the line at the top says: nothing, "Updated" just after a new version took over, or a new version waiting for this game to be left. */
export type UpdateState = "none" | "updated" | "new-rules";
export function useUpdateState(): UpdateState {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => (found && sameRules === false ? "new-rules" : Date.now() < updatedUntil ? "updated" : "none"),
  );
}

function offer(w: ServiceWorker | null): void {
  waiting = w;
  found = true;
  sameRules = null;
  decide();
}

export function registerUpdates(): void {
  if (!("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker;
  // The new version took control: by this page's own take-over, or another tab's. (The very first install also takes
  // control, of a page that had none: that needs no reload.)
  const hadController = sw.controller !== null;
  sw.addEventListener("controllerchange", () => {
    if (taking) {
      location.reload();
      return;
    }
    // Another tab's take-over: this page is on the old code; it reloads as it would for a version found here.
    if (hadController) offer(null);
  });
  sw.register("service-worker.js", { updateViaCache: "none" })
    .then((reg) => {
      const watch = (w: ServiceWorker | null): void => {
        w?.addEventListener("statechange", () => {
          if (w.state === "installed" && sw.controller !== null) offer(w);
        });
      };
      if (reg.waiting !== null && sw.controller !== null) offer(reg.waiting);
      watch(reg.installing);
      reg.addEventListener("updatefound", () => watch(reg.installing));
      const look = (): void => void reg.update().catch(() => {});
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") look();
      });
      setInterval(look, 30 * 60 * 1000);
    })
    .catch(() => {});
}
