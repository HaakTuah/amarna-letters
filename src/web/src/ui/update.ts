/**
 * The newest version is the one played (item 11c+). The installed app starts from its offline cache; when a new version
 * has been published, the new service worker installs beside the old one. On the start screen it takes over at once and
 * the page reloads; during a game a small note says a new version is ready, and tapping it reloads into the same game
 * (its log is saved after every season, so the game goes on from its last season). The app looks for a new version when
 * it starts, when it comes back to the front, and every half hour.
 */
import { CURRENT_VERSION } from "@amarna/engine";
import { useSyncExternalStore } from "react";

const ResumeKey = "amarna-resume";
let waiting: ServiceWorker | null = null;
let taking = false;
/** The game being played, if any: its saved log is what a reload resumes. */
let game: string | null = null;
const listeners = new Set<() => void>();
const notify = (): void => listeners.forEach((f) => f());

/** Called by the game page: the game running (null when none), so a new version waits for a tap while one is played. */
export function playing(id: string | null): void {
  game = id === "" ? null : id;
  if (game === null && waiting !== null) takeOver(null);
}

/** The note during a game: tapped, the new version takes over and the page reloads, into the game if its rules are the same. */
export const reloadIntoGame = (): void => takeOver(sameRules ? game : null);

/** Lets the waiting version take over and reloads; with a game, the reload goes back into it. */
export function takeOver(resume: string | null): void {
  if (waiting === null) return;
  try {
    if (resume !== null) sessionStorage.setItem(ResumeKey, resume);
  } catch {
    // no storage: the reload lands on the start screen, where the saved game can be continued
  }
  taking = true;
  waiting.postMessage("take-over");
}

/** The game a reload into a new version goes back to, read once as the page starts. */
let resume: string | null = (() => {
  try {
    const id = sessionStorage.getItem(ResumeKey);
    sessionStorage.removeItem(ResumeKey);
    return id;
  } catch {
    return null;
  }
})();
/** Whether the page was reloaded into a new version from a game, still to be resumed. */
export const resuming = (): boolean => resume !== null;
/** The game to resume after an update, once. */
export function takeResume(): string | null {
  const id = resume;
  resume = null;
  return id;
}

/**
 * Whether the new version plays the game on screen under the same rules (its save version), so it can go on there; a game
 * saved under other rules cannot be continued by the new version (GameRunner.versionProblem). Unknown counts as not.
 */
let sameRules = false;

/** What the note during a game says: nothing waiting, a new version the game goes on in, or one it cannot. */
export type UpdateState = "none" | "continues" | "new-rules";
export function useUpdateState(): UpdateState {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    () => (waiting === null ? "none" : sameRules ? "continues" : "new-rules"),
  );
}

/** "Later": the note goes until the next new version is found. */
export function dismiss(): void {
  waiting = null;
  notify();
}

function offer(w: ServiceWorker): void {
  waiting = w;
  if (game === null) {
    takeOver(null);
    return;
  }
  fetch("version.json", { cache: "no-store" })
    .then((r) => r.json() as Promise<{ save?: number }>)
    .then((v) => (sameRules = v.save === CURRENT_VERSION))
    .catch(() => (sameRules = false))
    .finally(notify);
}

export function registerUpdates(): void {
  if (!("serviceWorker" in navigator)) return;
  const sw = navigator.serviceWorker;
  // Another tab's take-over: the new version is already in charge here too; reload at once if no game is on screen. (The
  // very first install also takes control, of a page that had none: that needs no reload.)
  const hadController = sw.controller !== null;
  sw.addEventListener("controllerchange", () => {
    if (taking || (hadController && game === null)) location.reload();
    else if (waiting !== null && waiting.state !== "installed") {
      waiting = null;
      notify();
    }
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
