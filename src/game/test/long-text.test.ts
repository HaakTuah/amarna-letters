import { describe, expect, test } from "vitest";
import { formatMoney } from "@amarna/engine";
import { CompatibleProvider } from "@amarna/llm";
import { EnvoyLot, ForgerHand, SpiedUnit, Weighed, shekels, spiedCount, spiedNames } from "../src/bots/brain.ts";
import { GovernorWrites } from "../src/bots/freedom.ts";
import { TextKit } from "../src/bots/textkit.ts";

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
    quick(() => TextKit.isAccusation("never" + " ".repeat(N / 10) + "x"));
    quick(() => TextKit.isAccusation("broke ".repeat(N / 50)));
    quick(() => TextKit.sentences("!" + '"'.repeat(N) + " a"));
    quick(() => new CompatibleProvider({ id: "local", baseUrl: "http://localhost:1/v1" + "/".repeat(N * 5) + "x" + "/".repeat(N * 5) }, ""));
  });

  test("each read still reads the engine's words", () => {
    expect(Weighed.exec(`Your weighers found ${formatMoney(80)}.`)?.[1]).toBe(formatMoney(80));
    const lot = EnvoyLot.exec(`He came home.\n\n[The inventory lists ${formatMoney(120)} of gold; your weighers found ${formatMoney(90)}.]`);
    expect([shekels(lot?.[1] ?? ""), shekels(lot?.[2] ?? "")]).toEqual([120, 90]);
    expect(ForgerHand.exec("A forgery. The scribes trace it to the hand of Testu, who brought it.")?.[1]).toBe("Testu");
    // Every army and fleet a report names is read once, by its count.
    const spied = (text: string): [string, number][] => [...text.matchAll(SpiedUnit)].flatMap((m) => spiedNames(m[1]).map((name): [string, number] => [name, spiedCount(m[2])]));
    expect(spied("From Hillfort, season of turn 3. Northland has two armies, at home and in Hillfort, and a fleet in Bayport; the Seha River Land, Eastland and Southland each have an army at home.")).toEqual([
      ["Northland", 3],
      ["the Seha River Land", 1],
      ["Eastland", 1],
      ["Southland", 1],
    ]);
    expect(spied("Testu sold you what they saw at the court of Northland in turn 2, for 9 shekels: Northland had an army at home; Westland had three fleets, in Bayport, Ford and Hillfort. It is a seller's word.")).toEqual([
      ["Northland", 1],
      ["Westland", 3],
    ]);
    expect(shekels("2 minas 15 shekels")).toBe(135);
    const governor = GovernorWrites.exec("Testu, your governor of Hillfort, writes that its people are near revolt.");
    expect([governor?.[1], governor?.[2]]).toEqual(["Hillfort", "near revolt"]);
    expect(TextKit.isAccusation("You broke the oath you swore.")).toBe(true);
    expect(TextKit.isAccusation("We have never lied to you.")).toBe(false);
    expect(TextKit.sentences('He said "Go!" Then he left.')).toEqual(['He said "Go!"', "Then he left."]);
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
