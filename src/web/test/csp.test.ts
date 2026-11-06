// The built page's content security policy (src/web/csp.ts) matches the list of where model calls may go
// (src/llm/src/endpoints.ts): every listed provider and the player's own machine, and nothing else.
import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { KnownProviders, endpointAllowed } from "@amarna/llm";
import { contentSecurityPolicy, cspPlugin } from "../csp.ts";

const directive = (policy: string, name: string): string[] =>
  policy
    .split("; ")
    .find((d) => d.startsWith(`${name} `))!
    .split(" ")
    .slice(1);

describe("the content security policy", () => {
  it("lets the page contact its own files, every listed provider and this machine, and nothing else", () => {
    const providers = [...new Set(KnownProviders.map((p) => new URL(p.baseUrl).origin))];
    const local = ["http://localhost:*", "https://localhost:*", "http://127.0.0.1:*", "https://127.0.0.1:*"];
    expect(directive(contentSecurityPolicy([]), "connect-src").sort()).toEqual(["'self'", ...providers, ...local].sort());
  });

  it("runs code only from the page's own files and its hashed inline scripts", () => {
    const policy = contentSecurityPolicy(["a()"]);
    const hash = createHash("sha256").update("a()").digest("base64");
    expect(directive(policy, "script-src")).toEqual(["'self'", `'sha256-${hash}'`]);
    expect(directive(policy, "default-src")).toEqual(["'self'"]);
    expect(directive(policy, "object-src")).toEqual(["'none'"]);
  });

  it("goes first in the built page's head, with a hash for its inline script", () => {
    const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
    const transform = cspPlugin().transformIndexHtml as { handler: (h: string) => string };
    const out = transform.handler(html);
    const inline = /<script>([\s\S]*?)<\/script>/u.exec(html)![1]!;
    expect(out).toContain(`content="${contentSecurityPolicy([inline])}"`);
    expect(out.indexOf("Content-Security-Policy")).toBeLessThan(out.indexOf("<script"));
  });

  it("allows the settings screen only listed endpoints and addresses on this machine", () => {
    for (const p of KnownProviders) expect(endpointAllowed(`${p.baseUrl}/`)).toBe(true);
    expect(endpointAllowed("http://localhost:11434/v1")).toBe(true);
    expect(endpointAllowed("http://127.0.0.1:1234/v1")).toBe(true);
    expect(endpointAllowed("https://api.openai.com.example.com/v1")).toBe(false);
    expect(endpointAllowed("http://192.168.1.5:11434/v1")).toBe(false);
    expect(endpointAllowed("not a url")).toBe(false);
  });
});
