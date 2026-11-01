import { giftUnit, type SeatView } from "@amarna/engine";
import { describe, test } from "vitest";
import { Assert } from "../../engine/test/support.ts";
import { describeOrder } from "../src/ui/format.ts";

// Giving troops away reads as troops, never as the land they stand in ("give Memphis" beside "cede Memphis"), and the
// receiver goes by the name the game shows, not its id.
describe("DescribeOrderTests", () => {
  const view = (kind: "Army" | "Fleet"): SeatView => ({ power: "Egypt", court: [], known: [], units: [{ power: "Egypt", kind, province: "memphis" }] }) as unknown as SeatView;

  test("A gift of troops names the army or fleet and where it stands, and the receiver by name", () => {
    Assert.equal("give the army at Memphis to Hana", describeOrder(giftUnit("memphis", "Terqa"), view("Army")));
    Assert.equal("give the fleet at Memphis to Hatti", describeOrder(giftUnit("memphis", "Hatti"), view("Fleet")));
  });
});
