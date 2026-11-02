import react from "@vitejs/plugin-react";
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { notices } from "../../scripts/licences.mjs";

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
        // The third-party notices are read, if ever, online.
        .filter((f) => statSync(join(outDir, f)).isFile() && f !== "service-worker.js" && f !== "version.json" && f !== "third-party-notices.txt" && !f.startsWith("audio/"))
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

/**
 * The third-party notices (SECURITY.md, point 10): every package the build bundles, the worker's included, local `file:`
 * packages too, with its licence, written to third-party-notices.txt beside the game; the build fails on a licence off
 * the strict list.
 */
function thirdPartyNotices(): { main: Plugin; worker: Plugin } {
  const bundled = new Set<string>();
  const collect = (ids: Iterable<string>) => {
    for (const id of ids) {
      // Vite's own helpers (the preload helper) come in as virtual modules, but they are Vite's code.
      if (id.startsWith("\0vite/")) bundled.add(fileURLToPath(import.meta.resolve("vite/package.json")));
      else if (!id.startsWith("\0")) bundled.add(id);
    }
  };
  const worker: Plugin = { name: "amarna-notices-worker", apply: "build", buildEnd() { collect(this.getModuleIds()); } };
  const main: Plugin = {
    name: "amarna-notices",
    apply: "build",
    generateBundle() {
      collect(this.getModuleIds());
      this.emitFile({ type: "asset", fileName: "third-party-notices.txt", source: notices([...bundled]) });
    },
  };
  return { main, worker };
}
const notice = thirdPartyNotices();

/** The build's commit, for the error screen's report (item 17a): the publishing workflow's, else the checkout's, else "dev". */
function buildId(): string {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA.slice(0, 7);
  try {
    return execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim() || "dev";
  } catch {
    return "dev";
  }
}

export default defineConfig({
  // Relative URLs throughout: the site lives under a sub-path on GitHub Pages, set by the page's <base href>.
  base: "./",
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  plugins: [react(), notice.main, serviceWorker()],
  worker: { format: "es", plugins: () => [notice.worker] },
  build: { outDir: "dist", target: "es2022", chunkSizeWarningLimit: 2000 },
  server: { port: 5183 },
});
