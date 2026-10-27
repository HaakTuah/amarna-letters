/** A batch runner worker: plays one game per message (see play.ts). */
import { parentPort } from "node:worker_threads";
import { playOne, playSolo, type PlayJob, type SoloJob } from "./play.ts";

parentPort!.on("message", async (job: PlayJob | SoloJob) => {
  parentPort!.postMessage("soloSeed" in job ? await playSolo(job) : await playOne(job));
});
