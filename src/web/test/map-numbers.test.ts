import { describe, test } from "vitest";
import { fmt } from "@amarna/engine";
import { Assert } from "../../engine/test/support.ts";
import { F } from "../src/map/art.ts";
import { thousands } from "../src/ui/format.ts";

// #666: the map keeps the numbers it has written, and formats thousands with one formatter; what it writes is unchanged.
describe("Numbers as the map writes them", () => {
  test("a kept number is written as fmt writes it, minus zero apart", () => {
    let seed = 11;
    const rnd = (): number => ((seed = (seed * 48271) % 2147483647) / 2147483647);
    const values = [0, 0.05, 0.15, 1.25, 12.35, -3.45, 99.95, 1e-7, ...Array.from({ length: 400 }, () => (rnd() - 0.3) * 2000)];
    // Twice: written, then kept.
    for (const v of [...values, ...values]) Assert.equal(fmt(v, "0.#"), F(v));
    Assert.equal("0", F(0));
    Assert.equal("-0", F(-0));
  });

  test("thousands are separated as toLocaleString('en') separates them", () => {
    for (const n of [0, 7, 999, 1000, 18000, 650000, 1234567.891, -4200]) Assert.equal(n.toLocaleString("en"), thousands(n));
  });
});
