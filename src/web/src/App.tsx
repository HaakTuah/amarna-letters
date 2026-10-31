import { About } from "./pages/About.tsx";
import { Home } from "./pages/Home.tsx";
import { Play } from "./pages/Play.tsx";
import { useEffect } from "react";
import { navigate, useRoute, type Route } from "./ui/router.ts";
import { resuming, screen, useUpdateState } from "./ui/update.ts";

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
  const update = useUpdateState();
  // Reloaded into a game (a new version taking over, or the error screen's way back): the start page loads that game's
  // saved log and goes back into it.
  useEffect(() => {
    if (resuming() && route !== "") navigate("");
  }, []);
  // A new version takes over at once off the game screen (ui/update.ts).
  useEffect(() => screen(route === "play"), [route]);
  return (
    <>
      {update === "updated" && (
        <div className="update-note" role="status">
          Updated to the newest version.
        </div>
      )}
      {update === "new-rules" && (
        <div className="update-note" role="status">
          A new version with new rules is ready: this game goes on under its own rules, and the new version takes over when you leave it.
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
