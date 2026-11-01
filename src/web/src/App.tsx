import { About } from "./pages/About.tsx";
import { Listen } from "./pages/Listen.tsx";
import "./audio/player.ts";
import { Home } from "./pages/Home.tsx";
import { Play } from "./pages/Play.tsx";
import { useEffect } from "react";
import { TopBar } from "./components/TopBar.tsx";
import { navigate, useRoute } from "./ui/router.ts";
import { playing, resuming, savedUp, takeResumedHow, useUpdateState } from "./ui/update.ts";
import { useSession } from "./ui/use-session.ts";

/** The app: the page's own bar and the page; the game screen has its own compact header, so it gets the whole screen. */
export function App() {
  const route = useRoute();
  const update = useUpdateState();
  const s = useSession();
  const live = s.live;
  // The game held and how it is watched, on whatever screen: a new version with the same rules takes over once the season
  // played is saved, reloading into this game as it was (ui/update.ts); after such a reload, auto-play and speed are as they were.
  useEffect(() => playing(live.hasRunner ? live.gameId : null, live.auto, s.delayMs), [live.hasRunner, live.gameId, live.auto, s.delayMs]);
  useEffect(() => savedUp(live.hasRunner && !live.busy && live.savedTurn === live.turn), [live.hasRunner, live.busy, live.savedTurn, live.turn]);
  useEffect(() => {
    if (!live.hasRunner || live.busy) return;
    const how = takeResumedHow(live.gameId);
    if (how === null) return;
    s.setDelay(how.delay);
    if (how.auto && s.canPlay) s.setAuto(true);
  }, [live.hasRunner, live.busy, live.gameId]);
  // Reloaded into a game (a new version taking over, or the error screen's way back): the start page loads that game's
  // saved log and goes back into it.
  useEffect(() => {
    if (resuming() && route !== "") navigate("");
  }, []);
  return (
    <>
      {update === "updated" && (
        <div className="update-note" role="status">
          Updated to the newest version.
        </div>
      )}
      {update === "new-rules" && (
        <div className="update-note" role="status">
          A new version with new rules is ready: this game goes on under its own rules, and the new version takes over when you close it.
        </div>
      )}
      {route !== "play" && <TopBar />}
      {route === "play" ? <Play /> : route === "about" ? <About /> : route === "listen" ? <Listen /> : <Home />}
    </>
  );
}
