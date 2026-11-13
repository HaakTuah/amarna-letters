import { describe, expect, test } from "vitest";
import type { Power } from "@amarna/engine";
import { frontierPath } from "../src/map/art.ts";
import { bands as bandParts, facedAcross } from "../src/map/land-layers.ts";
import type { MapScene, SceneUnit } from "../src/map/scene.ts";

/** The bands' layer as drawn: its parts in order. */
const bands = (s: MapScene): string => bandParts(s).map((b) => b.parts.join("")).join("");

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
    expect(accent).not.toBe("");
    expect(accent.length).toBeLessThan(frontierPath("sapinuwa", () => true).length);
    // Fleets do not face each other across a land frontier.
    expect(contested([army("Egypt", "sapinuwa"), { ...army("Hatti", "hattusa"), kind: "Fleet" }])).toBe(0);
    // The province's card lists the same provinces across (#586): the glow's own test, from the armies seen now only.
    expect(facedAcross(scene([army("Egypt", "sapinuwa"), army("Hatti", "hattusa")]), "sapinuwa")).toEqual(["hattusa"]);
    expect(facedAcross(scene([army("Egypt", "sapinuwa"), army("Hatti", "hattusa", true)]), "sapinuwa")).toEqual([]);
    expect(facedAcross(scene([army("Egypt", "sapinuwa"), army("Hatti", "hattusa")], "Egypt"), "sapinuwa")).toEqual([]);
    expect(facedAcross(scene([army("Hatti", "hattusa")]), "sapinuwa")).toEqual([]);
  });

  test("Only the stretch against another power's land is marked firm, to grow firmer as the realms' colours thin", () => {
    const scene = (hattusa: Power | null): MapScene => ({ owner: new Map<string, Power | null>([["sapinuwa", "Egypt"], ["hattusa", hattusa]]), units: [] }) as unknown as MapScene;
    const pathOf = (markup: string, cls: string): string => markup.match(new RegExp(`class="${cls}" d="([^"]*)"`))?.[1] ?? "";
    const rim = (hattusa: Power | null): string => pathOf(bands(scene(hattusa)), "band b-egypt");
    const firm = (hattusa: Power | null): string => pathOf(bands(scene(hattusa)), "band firm b-egypt");
    // Against another power's land: the stretch along Hattusa is firm, the rest of the frontier (no one's land) is not.
    expect(firm("Hatti")).toBe(frontierPath("sapinuwa", (across) => across.includes("hattusa")));
    expect(rim("Hatti")).not.toBe("");
    // Against no one's land, or inside one realm, none is firm.
    expect(firm(null)).toBe("");
    expect(firm("Egypt")).toBe("");
  });

  test("A band kept from an earlier season is the band traced afresh (part G)", () => {
    const scene = (owners: [string, Power][]): MapScene => ({ owner: new Map<string, Power | null>(owners), units: [] }) as unknown as MapScene;
    const a = scene([["sapinuwa", "Egypt"], ["hattusa", "Hatti"]]);
    const b = scene([["sapinuwa", "Egypt"], ["hattusa", "Egypt"]]);
    const first = bands(a);
    const other = bands(b);
    // Hattusa joined Sapinuwa's holder: their shared border is no frontier any more, and both bands are traced again.
    expect(other).not.toBe(first);
    expect(bands(a)).toBe(first);
    expect(bands(b)).toBe(other);
  });
});
