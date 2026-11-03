import { describe, expect, test } from "vitest";
import type { Power } from "@amarna/engine";
import { frontierPath } from "../src/map/art.ts";
import { bands, facedAcross } from "../src/map/land-layers.ts";
import type { MapScene, SceneUnit } from "../src/map/scene.ts";

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

  test("A frontier where the seat sees two powers' armies face to face is marked, from the armies it sees now only", () => {
    const army = (power: Power, province: string, ghost = false): SceneUnit =>
      ({ key: `${power}-${province}`, power, kind: "Army", province, count: 1, men: 1000, ghost, age: ghost ? 2 : 0, seenAt: 0 });
    const scene = (units: SceneUnit[], hattusa: Power = "Hatti"): MapScene =>
      ({ owner: new Map<string, Power | null>([["sapinuwa", "Egypt"], ["hattusa", hattusa]]), units }) as unknown as MapScene;
    const contested = (units: SceneUnit[], hattusa?: Power): number => (bands(scene(units, hattusa)).match(/class="band contested/g) ?? []).length;
    const pathOf = (markup: string, cls: string): string => markup.match(new RegExp(`class="${cls}" d="([^"]*)"`))?.[1] ?? "";
    // Face to face across the frontier: marked on both sides.
    expect(contested([army("Egypt", "sapinuwa"), army("Hatti", "hattusa")])).toBe(2);
    // One side only, or one power's armies on both sides: not.
    expect(contested([army("Egypt", "sapinuwa")])).toBe(0);
    expect(contested([army("Egypt", "sapinuwa"), army("Egypt", "hattusa")])).toBe(0);
    // An army known only from an old report is not seen now: not.
    expect(contested([army("Egypt", "sapinuwa"), army("Hatti", "hattusa", true)])).toBe(0);
    // Within one realm there is no frontier, armies or not; two powers' armies in one province with none across: not.
    expect(contested([army("Egypt", "sapinuwa"), army("Hatti", "hattusa")], "Egypt")).toBe(0);
    expect(contested([army("Egypt", "sapinuwa"), army("Hatti", "sapinuwa")])).toBe(0);
    // Only the stretch they face each other across: Sapinuwa's frontier with Hattusa, not its border with no one's land.
    const drawn = bands(scene([army("Egypt", "sapinuwa"), army("Hatti", "hattusa")]));
    const accent = pathOf(drawn, "band contested b-egypt");
    const band = pathOf(drawn, "band b-egypt");
    expect(accent).not.toBe("");
    expect(accent.length).toBeLessThan(band.length);
    // Fleets do not face each other across a land frontier.
    expect(contested([army("Egypt", "sapinuwa"), { ...army("Hatti", "hattusa"), kind: "Fleet" }])).toBe(0);
    // The province's card lists the same provinces across (#586): the glow's own test, from the armies seen now only.
    expect(facedAcross(scene([army("Egypt", "sapinuwa"), army("Hatti", "hattusa")]), "sapinuwa")).toEqual(["hattusa"]);
    expect(facedAcross(scene([army("Egypt", "sapinuwa"), army("Hatti", "hattusa", true)]), "sapinuwa")).toEqual([]);
    expect(facedAcross(scene([army("Egypt", "sapinuwa"), army("Hatti", "hattusa")], "Egypt"), "sapinuwa")).toEqual([]);
    expect(facedAcross(scene([army("Hatti", "hattusa")]), "sapinuwa")).toEqual([]);
  });
});
