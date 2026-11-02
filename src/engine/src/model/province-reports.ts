/**
 * The reports a province's officials send its holder (bug #540, "Distance inside your own realm", item 13): each season's
 * economy, works and worth of every held province, kept as long as any word could take, so that a court shows a province
 * of its own beyond its couriers' season as of the newest season whose word has come (`ownKnown` in
 * rules/province-reports.ts), as it knows who holds the land (`knownHolders`).
 */
import { D, I, type ObjSchema, S, list, obj, opt } from "../core/json.ts";
import type { Power } from "./power.ts";
import { type ProvinceEconomyView, newProvinceEconomyView, ProvinceEconomyViewSchema, type WorkView, WorkViewSchema } from "./views.ts";

export interface ProvinceReport {
  /** The season it reports: the province as that season ended (0: as the game began). */
  turn: number;
  /** Who held it then: its officials report to him. */
  holder: Power | null;
  economy: ProvinceEconomyView;
  works: WorkView[];
  /** Its worth a season at reference prices, as far as it obeyed (`TurnEngine.landWorth`). */
  worth: number;
  /** Its purse, stores and market at reference prices (`TurnEngine.holdings`). */
  holding: number;
  /** What its last reaping brought in (GameState.reaped; null if not yet reaped). */
  reaped: number | null;
}

export function newProvinceReport(init: Partial<ProvinceReport> = {}): ProvinceReport {
  return { turn: 0, holder: null, economy: newProvinceEconomyView(), works: [], worth: 0, holding: 0, reaped: null, ...init };
}

export const ProvinceReportSchema: ObjSchema<ProvinceReport> = obj("ProvinceReport", newProvinceReport, {
  turn: I,
  holder: opt(S),
  economy: () => ProvinceEconomyViewSchema,
  works: list(() => WorkViewSchema),
  worth: D,
  holding: D,
  reaped: opt(I),
});

/** Seasons of reports kept: the longest word takes, with room to spare (`Views.knownHolders` looks back six). */
export const ReportsKept = 8;
