import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { travelTimes } from "../src/components/OrdersPanel.tsx";

// Item 17++++: a small state's seat reads every court's journey, forty-six of them; a long list is grouped by its length.
describe("Envoys' journeys in the orders", () => {
  const line = (court: string, n: number): string => `${court}: ${n} season(s) each way`;

  test("A few courts read one by one", () =>
    Assert.equal(travelTimes([line("Hatti", 1), line("Elam", 2)]), "Hatti: 1 season; Elam: 2 seasons"));

  test("Many courts read as the common length once and the others by name", () => {
    const many = ["Egypt", "Hatti", "Babylonia", "Mitanni", "Assyria", "Arzawa", "Alashiya", "Kaska", "Lukka"].map((c) => line(c, 1));
    Assert.equal(travelTimes([...many, line("Arrapha", 2), line("Elam", 2)]), "1 season to every court but these; Arrapha, Elam: 2 seasons");
    Assert.equal(travelTimes(many), "1 season to every court (9)");
  });
});
