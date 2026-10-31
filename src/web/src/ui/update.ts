/**
 * The newest version is always the one played, without asking (items 11c+ and 17a). The installed app starts from its
 * offline cache; when a new version has been published, the new service worker installs beside the old one and takes over
 * by itself: at once when no game is held (on opening, on the start screen, when a game is started or continued), and with a
 * game held at the next season, once that season is saved, reloading into the same game (its log is saved after every
 * season) with auto-play and speed as they were, and a short "Updated" line after. Only a new version whose rules the game
 * held cannot carry on in waits, saying so, until that game is closed. The app looks for a new version when it starts, when
 * it comes back to the front, and every half hour.
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
/** The game held by the worker, if any (on screen or not): its saved log is what a reload resumes. */
let game: string | null = null;
/** Whether every season played so far is saved (the worker's last save is of the newest state and no season is under way). */
let saved = false;
/** How the game is being watched, kept by the game page for the reload. */
let watching: { auto: boolean; delay: number } = { auto: false, delay: 400 };
/**
 * Whether the new version plays the game held under the same rules (its save version), so it can go on there; a game saved
 * under other rules cannot be continued by the new version (GameRunner.versionProblem). Null while unknown (not asked yet,
 * or the version could not be read): nothing is said, and the question is asked again at the next change.
 */
let sameRules: boolean | null = null;
let asking = false;
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((f) => f());

/** The game held (null when none) and how it is watched, told by the game page whenever either changes. */
export function playing(id: string | null, auto = false, delay = 400): void {
  game = id === "" ? null : id;
  watching = { auto, delay };
  decide();
}

/** Whether the game held has every season saved, told by the game page: a take-over waits for the save, so the reload resumes the season just played. */
export function savedUp(upToDate: boolean): void {
  saved = upToDate;
  decide();
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

/**
 * A new version found, or something changed: takes over now if nothing stands in the way. With no game held, at once (on
 * opening, on the start screen, when a game is started or continued); with a game held under the same rules, once its
 * seasons are saved, reloading into it; with a game held under other rules, only once that game is closed.
 */
function decide(): void {
  if (!found) return;
  if (game === null) {
    takeOver(null);
    return;
  }
  if (sameRules === null) {
    if (!asking) {
      asking = true;
      fetch("version.json", { cache: "no-store" })
        .then((r) => r.json() as Promise<{ save?: number }>)
        .then((v) => (sameRules = typeof v.save === "number" ? v.save === CURRENT_VERSION : null))
        .catch(() => (sameRules = null))
        .finally(() => {
          asking = false;
          notify();
          decide();
        });
    }
    return;
  }
  if (sameRules && saved) takeOver({ id: game, ...watching, updated: true });
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

/** What the line at the top says: nothing, "Updated" just after a new version took over, or a new version waiting for the game held to be closed. */
export type UpdateState = "none" | "updated" | "new-rules";
export function useUpdateState(): UpdateState {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => (found && game !== null && sameRules === false ? "new-rules" : Date.now() < updatedUntil ? "updated" : "none"),
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
