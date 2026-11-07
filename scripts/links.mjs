#!/usr/bin/env node
// The "Learn more" links checked ("Learn more, and what is invented" under Interface, build order item 17+++b): every link
// in `src/engine/src/model/learn-more.ts` fetched as the game builds it, and listed if it does not answer 200, or if
// Wikipedia answers with a disambiguation page or redirects it to another page (a moved page that would still answer 200).
// For the weekly run outside the pull requests, so a moved page never blocks one; by hand:
// `node --experimental-strip-types scripts/links.mjs`.
// Exits 1 if any link is broken.
import { PersonLinks, PlaceLinks, RealmLinks, TongueLinks } from "../src/engine/src/model/learn-more.ts";

const links = [...new Map([PlaceLinks, RealmLinks, PersonLinks, TongueLinks].flatMap((m) => [...m.values()]).map((l) => [l.url, l])).values()];
const broken = [];
for (const { url, title } of links) {
  try {
    const r = await fetch(url, { headers: { "user-agent": "amarna-letters link check (github.com/HaakTuah/amarna-letters)" } });
    const page = r.status === 200 && url.includes("wikipedia.org") ? await r.text() : "";
    if (r.status !== 200) broken.push(`${r.status} ${url}`);
    else if (page.includes('id="disambigbox"')) broken.push(`disambiguation page: ${title} (${url})`);
    else if (page.includes("mw-redirectedfrom")) broken.push(`redirected to another page: ${title} (${url})`);
  } catch (e) {
    broken.push(`error ${url}: ${e instanceof Error ? e.message : String(e)}`);
  }
  await new Promise((done) => setTimeout(done, 200));
}
console.log(`${links.length} links, ${broken.length} broken`);
for (const b of broken) console.log(b);
process.exit(broken.length > 0 ? 1 : 0);
