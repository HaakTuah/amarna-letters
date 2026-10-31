import { About } from "./pages/About.tsx";
import { Home } from "./pages/Home.tsx";
import { Play } from "./pages/Play.tsx";
import { useEffect } from "react";
import { TopBar } from "./components/TopBar.tsx";
import { navigate, useRoute } from "./ui/router.ts";
import { dismiss, reloadIntoGame, resuming, useUpdateState } from "./ui/update.ts";

/** The app: the page's own bar and the page; the game screen has its own compact header, so it gets the whole screen. */
export function App() {
  const route = useRoute();
  const update = useUpdateState();
  // Reloaded into a new version from a game: the start page loads that game's saved log and goes back into it.
  useEffect(() => {
    if (resuming() && route !== "") navigate("");
  }, []);
  return (
    <>
      {update === "continues" && (
        <div className="update-note" role="status">
          A new version is ready.
          <button className="small" onClick={reloadIntoGame}>
            Reload into this game
          </button>
        </div>
      )}
      {update === "new-rules" && (
        <div className="update-note" role="status">
          A new version is ready, with new rules: this game was saved under the old ones and cannot go on in it.
          <button className="small" onClick={reloadIntoGame}>
            Update now
          </button>
          <button className="small" onClick={dismiss}>
            Later
          </button>
        </div>
      )}
      {route !== "play" && <TopBar />}
      {route === "play" ? <Play /> : route === "about" ? <About /> : <Home />}
    </>
  );
}
