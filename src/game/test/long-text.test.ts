import { describe, expect, test } from "vitest";
import { CompatibleProvider } from "@amarna/llm";
import { EnvoyLot, ForgerHand, SpiedUnit, Weighed, shekels } from "../src/bots/brain.ts";
import { GovernorWrites } from "../src/bots/freedom.ts";

// The script kings' reads of letters and reports finish quickly on very long text, and still read what the engine writes.
describe("LongTextTests", () => {
  const N = 200_000;

  function quick(read: () => unknown): void {
    const start = performance.now();
    read();
    expect(performance.now() - start).toBeLessThan(500);
  }

  test("each read finishes quickly on very long text", () => {
    quick(() => Weighed.exec("weighers found ".repeat(N)));
    quick(() => EnvoyLot.exec("[The inventory lists ".repeat(N / 2) + "x of gold; your weighers found ".repeat(N / 2)));
    quick(() => ForgerHand.exec("trace it to the hand of ".repeat(N)));
    quick(() => [..."a".repeat(N * 5).matchAll(SpiedUnit)]);
    quick(() => shekels("1".repeat(N * 5)));
    quick(() => GovernorWrites.exec("governor of ".repeat(N)));
    quick(() => new CompatibleProvider({ id: "local", baseUrl: "http://localhost:1/v1" + "/".repeat(N * 5) + "x" + "/".repeat(N * 5) }, ""));
  });

  test("each read still reads the engine's words", () => {
    expect(Weighed.exec("Your weighers found 1 mina 20 shekels.")?.[1]).toBe("1 mina 20 shekels");
    const lot = EnvoyLot.exec("He came home.\n\n[The inventory lists 2 minas of gold; your weighers found 1 mina 30 shekels.]");
    expect([lot?.[1], lot?.[2]]).toEqual(["2 minas", "1 mina 30 shekels"]);
    expect(ForgerHand.exec("A forgery. The scribes trace it to the hand of Pawura, who brought it.")?.[1]).toBe("Pawura");
    expect([..."Hatti has an army in Kadesh; Mitanni had a fleet in Ugarit.".matchAll(SpiedUnit)].map((m) => m[1])).toEqual(["Hatti", "Mitanni"]);
    expect(shekels("2 minas 15 shekels")).toBe(135);
    const governor = GovernorWrites.exec("Ari, your governor of Amurru, writes that its people are near revolt.");
    expect([governor?.[1], governor?.[2]]).toEqual(["Amurru", "near revolt"]);
  });

  test("a base address loses only its trailing slashes", async () => {
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify({ data: [{ id: "m" }] }));
    }) as unknown as typeof fetch;
    await new CompatibleProvider({ id: "local", baseUrl: "http://localhost:1/v1///" }, "", fetchImpl).check("m", { name: "x", schema: {} } as never, false);
    await new CompatibleProvider({ id: "local", baseUrl: "http://localhost:1/v1" }, "", fetchImpl).check("m", { name: "x", schema: {} } as never, false);
    expect(urls).toEqual(["http://localhost:1/v1/models", "http://localhost:1/v1/models"]);
  });
});
