import react from "@vitejs/plugin-react";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";
import { defineConfig, type Plugin } from "vite";

/**
 * The offline cache: writes service-worker.js beside the built files, listing every one of them with its hash, so the
 * installed app starts from cache and a new build replaces them together (as the Blazor build's published worker did).
 */
function serviceWorker(): Plugin {
  let outDir = "dist";
  return {
    name: "amarna-service-worker",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    closeBundle() {
      // The rules' save version, for a page deciding whether a game in play can go on in the new version (src/ui/update.ts).
      // Fetched from the network, never cached.
      const save = /CURRENT_VERSION = (\d+)/u.exec(readFileSync(new URL("../engine/src/model/state.ts", import.meta.url), "utf8"))?.[1] ?? "0";
      writeFileSync(join(outDir, "version.json"), JSON.stringify({ save: Number(save) }));
      const files = (readdirSync(outDir, { recursive: true }) as string[])
        .map((f) => f.split(sep).join("/"))
        // The music and the sounds (audio/, item 19+++) are not installed with the app: each file is fetched when first played
        // and kept then (the worker's audio cache), so the first screen stays fast and a phone downloads only what it hears.
        .filter((f) => statSync(join(outDir, f)).isFile() && f !== "service-worker.js" && f !== "version.json" && !f.startsWith("audio/"))
        .sort();
      const assets = files.map((url) => ({ url, hash: "sha256-" + createHash("sha256").update(readFileSync(join(outDir, url))).digest("base64") }));
      const all = JSON.stringify(assets);
      const version = createHash("sha256").update(all).digest("hex").slice(0, 16);
      const worker = readFileSync(new URL("./service-worker.template.js", import.meta.url), "utf8")
        .replace("__ASSETS__", all)
        .replace("__VERSION__", version);
      writeFileSync(join(outDir, "service-worker.js"), worker);
    },
  };
}

export default defineConfig({
  // Relative URLs throughout: the site lives under a sub-path on GitHub Pages, set by the page's <base href>.
  base: "./",
  plugins: [react(), serviceWorker()],
  worker: { format: "es" },
  build: { outDir: "dist", target: "es2022", chunkSizeWarningLimit: 2000 },
  server: { port: 5183 },
});
