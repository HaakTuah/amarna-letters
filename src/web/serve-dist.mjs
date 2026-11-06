// A static server for the built app (dist/), shared by the measuring and picture scripts. Under a sub-path (base), as GitHub
// Pages serves a preview, deep links get the app's page and its <base href> follows; at "/" it serves the site as it is.
// onBody sees each body sent (measure.mjs counts bytes). Returns the server and the address to open.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const types = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".wasm": "application/wasm",
  ".dat": "application/octet-stream",
  ".webmanifest": "application/manifest+json",
};

export const dist = fileURLToPath(new URL("./dist/", import.meta.url));

/** site: the directory to serve, ending in "/" (default: src/web/dist). */
export async function serveDist(site = dist, { base = "/", onBody = () => {} } = {}) {
  const server = createServer(async (req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    if (!path.startsWith(base)) return void res.writeHead(404).end();
    let file = normalize(join(site, path.slice(base.length) || "index.html"));
    if (!file.startsWith(site)) return void res.writeHead(403).end();
    let body;
    try {
      if (!(await stat(file)).isFile()) throw new Error("not a file");
      body = await readFile(file);
    } catch {
      file = join(site, "index.html");
      body = await readFile(file);
    }
    if (base !== "/" && file.endsWith("index.html")) body = Buffer.from(body.toString().replace('<base href="/" />', `<base href="${base}" />`));
    onBody(body);
    res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" }).end(body);
  });
  await new Promise((r) => server.listen(0, r));
  return { server, root: `http://localhost:${server.address().port}${base}` };
}
