import { About } from "./pages/About.tsx";
import { Home } from "./pages/Home.tsx";
import { Play } from "./pages/Play.tsx";
import { navigate, useRoute, type Route } from "./ui/router.ts";

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
  return (
    <>
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
