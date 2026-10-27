/** The app's three pages, by path under the site's base (the page's <base href>), with the browser's history. */
import { useSyncExternalStore } from "react";

export type Route = "" | "play" | "about";

const baseUrl = (): URL => new URL(document.baseURI);

function current(): Route {
  const rel = location.pathname.startsWith(baseUrl().pathname) ? location.pathname.slice(baseUrl().pathname.length) : "";
  const r = rel.split(/[?#]/)[0].replace(/\/+$/, "");
  return r === "play" || r === "about" ? r : "";
}

const listeners = new Set<() => void>();
addEventListener("popstate", () => listeners.forEach((f) => f()));

export function navigate(to: Route): void {
  history.pushState(null, "", new URL(to, baseUrl()).href);
  listeners.forEach((f) => f());
  scrollTo(0, 0);
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (f) => {
      listeners.add(f);
      return () => listeners.delete(f);
    },
    current,
  );
}
