import { About } from "./pages/About.tsx";
import { Home } from "./pages/Home.tsx";
import { Play } from "./pages/Play.tsx";
import { useEffect } from "react";
import { navigate, useRoute, type Route } from "./ui/router.ts";
import { reloadIntoGame, resuming, useUpdateReady } from "./ui/update.ts";

function NavLink({ to, children }: { to: Route; children: string }) {
  const route = useRoute();
  return (
    <a
      href={to === "" ? "./" : to}
      className={route === to ? "active" : undefined}
      onClick={(e) => {
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

/** The app: the page's own bar and the page; the game screen has its own compact header, so it gets the whole screen. */
export function App() {
  const route = useRoute();
  const update = useUpdateReady();
  // Reloaded into a new version from a game: the start page loads that game's saved log and goes back into it.
  useEffect(() => {
    if (resuming() && route !== "") navigate("");
  }, []);
  return (
    <>
      {update && (
        <div className="update-note" role="status">
          A new version is ready.
          <button className="small" onClick={reloadIntoGame}>
            Reload into this game
          </button>
        </div>
      )}
      {route !== "play" && (
        <header className="topbar">
          <a
            className="brand"
            href="./"
            onClick={(e) => {
              e.preventDefault();
              navigate("");
            }}
          >
            Amarna <span>Letters</span>
          </a>
          <nav>
            <NavLink to="">New game</NavLink>
            <NavLink to="play">{"Play & watch"}</NavLink>
            <NavLink to="about">How it works</NavLink>
          </nav>
        </header>
      )}
      {route === "play" ? <Play /> : route === "about" ? <About /> : <Home />}
    </>
  );
}
