import { createHash } from "node:crypto";
import { describe, test } from "vitest";
import { AllPowers, distinct } from "@amarna/engine";
import { seatSeed } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";

// A script seat's seed is one-way: it is a SHA-256 hash of the game's seed, so no undoing of the generator's steps leads
// back to the seed the engine rolls with. (Until save version 7 a test undid a stream of the old 64-bit generator step by
// step to show that the undoing works on a stream but not on a seat seed; the 32-bit generator's keyed hash is as
// invertible, and the seat seed as one-way, so the remaining tests pin the hash itself.)
describe("SeatSeedTests", () => {
  test.each([[1], [7], [13], [123456789], [0xdeadbeefcafe]] as const)("A seat seed is neither the game seed nor another seats %s", (seed: number) => {
    let seeds = AllPowers.map((p) => seatSeed(seed, p));
    Assert.doesNotContain(seed, seeds);
    Assert.equal(seeds.length, distinct(seeds).length);
    // Cut to 53 bits, so the TypeScript build holds it as an exact number.
    Assert.all(seeds, (x) => Assert.true(x < 2 ** 53));
  });

  test("A seat seed is the head of a sha256 hash cut to 53 bits of the game seed seat and the power", () => {
    const seed = Buffer.alloc(8);
    seed.writeBigUInt64LE(42n);
    const input = Buffer.concat([seed, Buffer.from("seat:Hatti", "utf8")]);
    const head = createHash("sha256").update(input).digest().readBigUInt64LE(0);
    Assert.equal(Number(head & ((1n << 53n) - 1n)), seatSeed(42, "Hatti"));
  });
});
