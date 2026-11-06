/**
 * The built page's content security policy (`SECURITY.md`, rule 7): a meta tag, since GitHub Pages sends no headers, by
 * which the page runs code only from its own files and contacts only them, the providers on the list in
 * `src/llm/src/endpoints.ts` and the player's own machine, so no code in it, a package's included, can send a key or a
 * save anywhere else. The engine's worker is started from a blob (`src/web/src/session/client.ts`), so it keeps this
 * policy too: a worker loaded from a file would take its policy from the file's headers, and the site sends none.
 */
import { createHash } from "node:crypto";
import type { Plugin } from "vite";
import { allowedOrigins } from "../llm/src/endpoints.ts";

/** The policy, given the hashes of the page's inline scripts. */
export function contentSecurityPolicy(inlineScripts: readonly string[]): string {
  const hashes = inlineScripts.map((s) => `'sha256-${createHash("sha256").update(s).digest("base64")}'`);
  return [
    "default-src 'self'",
    ["script-src 'self'", ...hashes].join(" "),
    "worker-src 'self' blob:",
    ["connect-src 'self'", ...allowedOrigins()].join(" "),
    "img-src 'self' data: blob:",
    "media-src 'self' data: blob:",
    "font-src 'self' data:",
    // Inline styles stay: the map's markup sets a few per element, and a style can reach only the origins above.
    "style-src 'self' 'unsafe-inline'",
    "object-src 'none'",
    "frame-src 'none'",
    "base-uri 'self'",
    "form-action 'none'",
  ].join("; ");
}

/** The contents of the page's inline scripts (those with no `src`), found by any letter case and attributes. */
export function inlineScripts(html: string): string[] {
  const lower = html.toLowerCase();
  const out: string[] = [];
  for (let at = lower.indexOf("<script"); at >= 0; at = lower.indexOf("<script", at + 1)) {
    const open = lower.indexOf(">", at);
    const close = lower.indexOf("</script", open);
    if (open < 0 || close < 0) throw new Error("index.html has a script tag with no end.");
    if (!/\ssrc\s*=/u.test(lower.slice(at, open))) out.push(html.slice(open + 1, close));
    at = close;
  }
  return out;
}

/** Writes the policy into the built page, first in its head, with a hash for each inline script it has. */
export function cspPlugin(): Plugin {
  return {
    name: "amarna-csp",
    apply: "build",
    transformIndexHtml: {
      order: "post",
      handler(html) {
        const meta = `<meta http-equiv="Content-Security-Policy" content="${contentSecurityPolicy(inlineScripts(html))}" />`;
        const at = html.indexOf("<meta charset=\"utf-8\" />");
        if (at < 0) throw new Error("index.html has no charset meta to put the content security policy after.");
        const end = at + "<meta charset=\"utf-8\" />".length;
        return `${html.slice(0, end)}\n    ${meta}${html.slice(end)}`;
      },
    },
  };
}
