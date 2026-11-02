import { describe, expect, test } from "vitest";
import { frontierPath } from "../src/map/art.ts";

// Borders strong between powers, quiet within one ("Following, travel lines and borders"): a province's band runs only along
// its frontier, each ring's frontier one unbroken line, closed when the whole ring is frontier.
describe("RealmBorders", () => {
  test("A province's band runs along its frontier only, joined into one line, closed when all of it is frontier", () => {
    const pieces = (d: string): number => d.split("M").length - 1;
    const all = frontierPath("sapinuwa", () => true);
    expect(pieces(all)).toBe(1);
    expect(all.endsWith("Z")).toBe(true);
    expect(frontierPath("sapinuwa", () => false)).toBe("");
    // Only along Hattusa: one open line, shorter than the whole ring.
    const seen: string[][] = [];
    const one = frontierPath("sapinuwa", (across) => (seen.push([...across]), across.includes("hattusa")));
    expect(pieces(one)).toBe(1);
    expect(one.includes("Z")).toBe(false);
    expect(one.length).toBeLessThan(all.length);
    // The province itself is never "across" its own border.
    expect(seen.some((a) => a.includes("sapinuwa"))).toBe(false);
    // All but the ring's middle arc: the frontier wraps round the ring's start, and is still one line.
    let k = 0;
    const rest = frontierPath("sapinuwa", () => k++ !== 1);
    expect(pieces(rest)).toBe(1);
    expect(rest.includes("Z")).toBe(false);
  });
});
