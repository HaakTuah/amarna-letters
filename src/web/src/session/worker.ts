/** The engine's Web Worker: it holds the game, and the page only displays the snapshots it sends. */
import { SessionCore } from "./core.ts";
import type { FromWorker, ToWorker } from "./protocol.ts";

const core = new SessionCore((m: FromWorker) => postMessage(m));
// Messages are handled one after another; a long one (a season) does not hold back the next (taps keep working).
addEventListener("message", (e: MessageEvent<ToWorker>) => {
  void core.handle(e.data);
});
