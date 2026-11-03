/** The non-military half of a script king: strategy, treasury, letters, audiences and court. */
import { court, isInventory, reliability } from "./statecraft-court.ts";
import { allianceTablet, coalitionTablet, greet, letters, peaceTablet, pleasIn } from "./statecraft-letters.ts";
import { givesAway, host } from "./statecraft-audiences.ts";
import { economy, fortification, strategy } from "./statecraft-strategy.ts";

export const Statecraft = {
  strategy,
  economy,
  fortification,
  reliability,
  isInventory,
  court,
  letters,
  pleasIn,
  peaceTablet,
  allianceTablet,
  coalitionTablet,
  givesAway,
  greet,
  host,
};
