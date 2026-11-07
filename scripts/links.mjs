#!/usr/bin/env node
// The "Learn more" links checked ("Learn more, and what is invented" under Interface, build order item 17+++b): every
// link in `src/engine/src/model/learn-more.ts` fetched, and each that does not answer 200 listed. Run weekly, outside the
// pull requests, so a moved page never blocks one: `node scripts/links.mjs`. Exits 1 if any link is broken.
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../src/engine/src/model/learn-more.ts", import.meta.url), "utf8");
// Each entry is `w("Title")` or `w("Title", "note")`, the helper building a Wikipedia link from the page's title, or a
// full URL in `{ url: "..." }`.
const titles = [...source.matchAll(/\bw\("((?:[^"\\]|\\.)*)"/g)].map((m) => JSON.parse(`"${m[1]}"`));
const urls = [
  ...titles.map((t) => `https://en.wikipedia.org/wiki/${encodeURIComponent(t.replace(/ /g, "_"))}`),
  ...[...source.matchAll(/url: "(https:[^"]+)"/g)].map((m) => m[1]),
];
const broken = [];
for (const url of [...new Set(urls)]) {
  try {
    const r = await fetch(url, { method: "HEAD", redirect: "follow", headers: { "user-agent": "amarna-letters link check" } });
    if (r.status !== 200) broken.push(`${r.status} ${url}`);
  } catch (e) {
    broken.push(`error ${url}: ${e instanceof Error ? e.message : String(e)}`);
  }
  await new Promise((done) => setTimeout(done, 100));
}
console.log(`${urls.length} links, ${broken.length} broken`);
for (const b of broken) console.log(b);
process.exit(broken.length > 0 ? 1 : 0);
