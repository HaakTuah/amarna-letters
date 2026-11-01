import { navigate, useRoute, type Route } from "../ui/router.ts";

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

/** The pages' own bar: the brand and the pages. The game screen has its own compact header instead. */
export function TopBar() {
  return (
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
        <NavLink to="listen">Music</NavLink>
      </nav>
    </header>
  );
}
