/** A small pool of worker threads: each job is a message to a worker module, whose reply is the job's result. */
import { availableParallelism } from "node:os";
import { Worker } from "node:worker_threads";

export async function runPool<J, R>(workerFile: URL, jobs: J[], threads = availableParallelism(), onResult?: (r: R, i: number) => void): Promise<R[]> {
  const results: R[] = new Array(jobs.length);
  let next = 0;
  const n = Math.max(1, Math.min(threads, jobs.length));
  await Promise.all(
    Array.from({ length: n }, () => {
      const worker = new Worker(workerFile, { execArgv: ["--experimental-strip-types", "--no-warnings"] });
      return new Promise<void>((resolve, reject) => {
        const feed = (): void => {
          if (next >= jobs.length) {
            void worker.terminate().then(() => resolve());
            return;
          }
          const i = next++;
          worker.once("message", (r: R) => {
            results[i] = r;
            onResult?.(r, i);
            feed();
          });
          worker.postMessage(jobs[i]);
        };
        worker.on("error", reject);
        feed();
      });
    }),
  );
  return results;
}
