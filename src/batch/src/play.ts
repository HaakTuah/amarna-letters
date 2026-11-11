/** One game of the batch runner, as the C# batch runner plays it: in a worker thread for script games, in the main thread otherwise. */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AllPowers, Dict, GameStateSchema, fmt, serialize, setNameClaims, setRisen, align, type GameConfig, type Power } from "@amarna/engine";
import {
  BaselineLeader,
  PlanAhead,
  SeaPlay,
  RoadPlay,
  WinterStrokes,
  AuthorityPlay,
  GrainPlay,
  TradePlay,
  PeoplePlay,
  LandPlay,
  BorderPlay,
  MoneyPlay,
  UpkeepPlay,
  RemnantPlay,
  KingPlay,
  FieldPlay,
  CountPlay,
  GrantPlay,
  TakeUpPlay,
  RegionPlay,
  AuditPlay,
  TalkPlay,
  OccupyPlay,
  WarPlay,
  TidingsPlay,
  RidePlay,
  SpyCheckPlay,
  OutlawPlay,
  RaiderPlay,
  VassalPlay,
  CommandPlay,
  FreedomPlay,
  CouncilPlay,
  LanguagePlay,
  SeasonPlay,
  WallPlay,
  WorksPlay,
  CofferPlay,
  GiftPlay,
  CaravanPlay,
  ClausePlay,
  InventoryPlay,
  ScriptLeader,
  ScriptMind,
  pressFor,
  TemplateNarrator,
  GameRunner,
  callSizes,
  characterReport,
  kingShadowReport,
  playGame,
  seatReport,
  type GameSummary,
  type ISeat,
} from "@amarna/game";
import {
  LlmLeaderSeat,
  ModelClient,
  SdkTransport,
  SeatChoices,
  SimulatedApi,
  buildSeats,
  checkJobs,
  providersFor,
  type CharacterKind,
  type LeaderKind,
  type NarratorKind,
  type PriceSetting,
  type ProviderSetting,
  type SpendingSettings,
} from "@amarna/llm";
import { FileCharacters, FileExchange } from "@amarna/llm/node";

export interface BatchOptions {
  games: number;
  seed: number;
  outDir: string | null;
  verify: boolean;
  detail: boolean;
  leaders: Record<string, LeaderKind>;
  characters: CharacterKind;
  narrator: NarratorKind;
  effort: string;
  budget: number;
  noChronicles: boolean;
  config: GameConfig;
  versus: boolean;
  focus: Power | null;
  folders: [Power, string][];
  characterFolders: [string, string][];
  fileTimeoutMinutes: number;
  sleepingScripts: boolean;
  /** Script kings that sleep schedule conditional orders ahead (off with --no-plan-ahead, to measure them). */
  planAhead: boolean;
  /** Script kings play the finer seas well (item 7a); off only to measure it (`--no-sea-play`). */
  seaPlay: boolean;
  /** Half the script kings play the finer seas, alternating by seed (`--sea-play-half`). */
  seaPlayHalf: boolean;
  /** Script kings close their roads to their foes (item 7b); off only to measure it (`--no-road-play`). */
  roadPlay: boolean;
  /** Only half the kings plan ahead, alternating by seed (the others are the comparison); they are reported as the current side. */
  planAheadHalf: boolean;
  /** Only half the kings close their roads (alternating by seed), reported as the current side (`--road-play-half`). */
  roadPlayHalf: boolean;
  /** Script kings make winter strokes over the passes (item 9); off only to measure it (`--no-winter-play`), or for half (`--winter-play-half`). */
  winterPlay: boolean;
  winterPlayHalf: boolean;
  /** Script kings play envoy authority and passage (item 9); off only to measure it (`--no-authority-play`), or for half. */
  authorityPlay: boolean;
  authorityPlayHalf: boolean;
  /** Script kings play the economy plainly (item 9+a: sell everything, no caravans or depots), only to measure it (`--plain-economy`), or half of them (`--plain-economy-half`). */
  plainEconomy: boolean;
  plainEconomyHalf: boolean;
  /** Script kings leave trade abroad, ships and tolls alone (item 9+b), only to measure it (`--no-trade-play`), or half of them (`--trade-play-half`). */
  noTradePlay: boolean;
  tradePlayHalf: boolean;
  /** Script kings leave item 10's people alone, only to measure it (`--no-people-play`), or half of them (`--people-play-half`). */
  noPeoplePlay: boolean;
  peoplePlayHalf: boolean;
  /** Script kings leave item 10+a's levers alone (`--no-land-play`), or half of them (`--land-play-half`): default tax, no famine feeding, levies as before, no colonists. */
  noLandPlay: boolean;
  landPlayHalf: boolean;
  /** Script kings leave item 10+b's choices alone (`--no-border-play`), or half of them (`--border-play-half`). */
  noBorderPlay: boolean;
  borderPlayHalf: boolean;
  /** Script kings never borrow or repay (item 11a, `--no-money-play`), or half of them (`--money-play-half`). */
  noMoneyPlay: boolean;
  moneyPlayHalf: boolean;
  /** Script kings never hold back pay when hard up (item 17+, `--no-upkeep-play`), or half of them (`--upkeep-play-half`). */
  noUpkeepPlay: boolean;
  /** Script kings never fold or disband their remnants (item 17++, `--no-remnant-play`), or half of them (`--remnant-play-half`). */
  noRemnantPlay: boolean;
  remnantPlayHalf: boolean;
  /** Script kings let captive kings go and never ransom their own (item 17b, `--no-king-play`), or half of them (`--king-play-half`). */
  noKingPlay: boolean;
  kingPlayHalf: boolean;
  /** Script kings never leave their courts for the front (item 17b, part C, `--no-field-play`), or half of them (`--field-play-half`). */
  noFieldPlay: boolean;
  fieldPlayHalf: boolean;
  /** Script kings never count their land and always ask a share (item 17++, `--no-count-play`), or half of them (`--count-play-half`). */
  noCountPlay: boolean;
  countPlayHalf: boolean;
  /** Script kings never grant a kingship (item 17++, part C, `--no-grant-play`), or half of them (`--grant-play-half`). */
  noGrantPlay: boolean;
  grantPlayHalf: boolean;
  /** Script kings take up every province that looks to them (item 17++, part C, `--no-take-up-play`), or half of them (`--take-up-play-half`). */
  noTakeUpPlay: boolean;
  takeUpPlayHalf: boolean;
  /** Script kings never give a governor a province beside his own (item 17++, part C, `--no-region-play`), or half of them (`--region-play-half`). */
  noRegionPlay: boolean;
  regionPlayHalf: boolean;
  /** Script kings play as before the improvement audit's finds (item 17++, part C, `--no-audit-play`), or half of them (`--audit-play-half`). */
  noAuditPlay: boolean;
  auditPlayHalf: boolean;
  /** Script kings ignore talk that their land leans toward another king (item 17++, part D, `--no-talk-play`), or half of them (`--talk-play-half`). */
  noTalkPlay: boolean;
  talkPlayHalf: boolean;
  /** Script kings do not reckon whether land would obey them, nor stand in it until it does (item 17++a, `--no-occupy-play`), or half of them (`--occupy-play-half`). */
  noOccupyPlay: boolean;
  occupyPlayHalf: boolean;
  /** Script kings name a war on a king at peace with them and never fight it, as before item 17++a (`--no-war-play`), or half of them (`--war-play-half`). */
  noWarPlay: boolean;
  warPlayHalf: boolean;
  /** #618: script kings leave word from their vassals and allies unread (all of them, or half, alternating by seed). */
  noTidingsPlay: boolean;
  tidingsPlayHalf: boolean;
  /** #601: script kings never hire a rider for a far province's report (all of them, or half, alternating by seed). */
  noRidePlay: boolean;
  ridePlayHalf: boolean;
  /** Script kings read their governor's word alone, never checked against their spy's (#459, `--no-spy-check-play`), or half of them (`--spy-check-play-half`). */
  noSpyCheckPlay: boolean;
  spyCheckPlayHalf: boolean;
  upkeepPlayHalf: boolean;
  /** Script kings never hunt bands nor buy news (item 11b, `--no-outlaw-play`), or half of them (`--outlaw-play-half`). */
  noOutlawPlay: boolean;
  outlawPlayHalf: boolean;
  /** Script kings ignore the raiders from beyond the map (item 17++++a, `--no-raider-play`), or half of them (`--raider-play-half`). */
  noRaiderPlay: boolean;
  raiderPlayHalf: boolean;
  /** Script players never play vassalage (item 11+, `--no-vassal-play`), or half of them (`--vassal-play-half`). */
  noVassalPlay: boolean;
  vassalPlayHalf: boolean;
  /** Script kings grant no commands and give no mandates (item 13, `--no-command-play`), or half of them (`--command-play-half`). */
  noCommandPlay: boolean;
  commandPlayHalf: boolean;
  /** Script kings take their armies' food, heed no governor and stir nothing (item 17, `--no-freedom-play`), or half (`--freedom-play-half`). */
  noFreedomPlay: boolean;
  freedomPlayHalf: boolean;
  /** Half the script kings play their troops by their royal council (item 16, `--council-play-half`). */
  councilPlayHalf: boolean;
  /** Script kings choose envoys by no language and hire no go-betweens (item 12, `--no-language-play`), or half of them (`--language-play-half`). */
  noLanguagePlay: boolean;
  languagePlayHalf: boolean;
  /** Script kings leave item 11a+'s levers alone (`--no-season-play`), or half of them (`--season-play-half`). */
  noSeasonPlay: boolean;
  seasonPlayHalf: boolean;
  noWallPlay: boolean;
  wallPlayHalf: boolean;
  noWorksPlay: boolean;
  worksPlayHalf: boolean;
  /** Half the script kings send no gold ahead to their far coffers (#587, `--coffer-play-half`). */
  cofferPlayHalf: boolean;
  /** Half the script kings send no gifts, bribes or tribute of their own choosing (item 18 part E, `--gift-play-half`). */
  giftPlayHalf: boolean;
  /** Script kings keep their caravans to their own land (`--no-caravan-play`), or half of them (`--caravan-play-half`). */
  noCaravanPlay: boolean;
  caravanPlayHalf: boolean;
  /** Script kings act on the clauses they read (item 8); off only to measure it (`--no-clause-play`), or for half (`--clause-play-half`). */
  clausePlay: boolean;
  clausePlayHalf: boolean;
  /** Script kings send gold without an inventory by envoys they trust (item 8); off only to measure it (`--no-inventory-play`). */
  inventoryPlay: boolean;
  /** Half the script kings send gold without an inventory, alternating by seed (`--inventory-play-half`). */
  inventoryPlayHalf: boolean;
  simulateApi: boolean;
  /** Providers other than Anthropic (--provider ID=URL), each with its key in <ID>_API_KEY. */
  providers: ProviderSetting[];
  /** Prices set with --price, over the defaults. */
  prices: Record<string, PriceSetting>;
  /** Each job's other rungs and planning (--small, --plays, --characters-up, --planning; "Every model is the table's choice"). */
  small: string;
  plays: "large" | "small";
  charactersUp: string;
  planning: string;
  /** How the ladder spends (--pace, --season-usd, --target, --audit-share); its limit is --budget. */
  spending: SpendingSettings;
}

/** The keys of the providers in use: ANTHROPIC_API_KEY, and <ID>_API_KEY for each other one (empty for a local endpoint). */
export function providerKeys(o: BatchOptions): Record<string, string> {
  const keys: Record<string, string> = {};
  for (const p of o.providers) keys[p.id] = process.env[`${p.id.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_API_KEY`] ?? "";
  return keys;
}

/**
 * The check at setup, before the first game: each model's largest schemas compiled once against its provider. Throws,
 * naming each failure, so a schema too large or a model a provider lacks stops the run before any game is played.
 */
export async function setupCheck(o: BatchOptions, simulated: SimulatedApi | null = null): Promise<void> {
  const choices = choicesOf(o);
  if (!choices.usesModels) return;
  const anthropic = simulated ?? new SdkTransport(process.env.ANTHROPIC_API_KEY ?? "");
  const client = new ModelClient(providersFor(choices, anthropic, providerKeys(o)), () => {});
  await client.check(checkJobs(choices, o.config));
}

export interface PlayJob {
  g: number;
  options: BatchOptions;
}

export interface PlayResult {
  summary: GameSummary;
  current: Power[];
  /** What the C# batch runner prints for this game, after all games are played. */
  printed: string;
}

export function choicesOf(o: BatchOptions): SeatChoices {
  const c = new SeatChoices();
  for (const p of AllPowers) c.leaders.set(p, o.leaders[p]);
  c.characters = o.characters;
  c.narrator = o.narrator;
  c.leaderEffort = o.effort;
  c.providers = o.providers.map((p) => ({ ...p }));
  c.prices = { ...o.prices };
  c.small = o.small;
  c.plays = o.plays;
  c.charactersUp = o.charactersUp;
  c.planning = o.planning;
  // The batch's budget is for all its games: each game paces by its share.
  c.spending = { ...o.spending, limitUsd: o.budget / Math.max(1, o.games) };
  return c;
}

export async function playOne(job: PlayJob): Promise<PlayResult> {
  const o = job.options;
  const s = o.seed + job.g;
  // A worker plays game after game: the powers an earlier game raised (item 13+) are not this game's, and its seats are
  // chosen from the powers in play, so the registry starts as a new game's before them (newGame does the same after).
  setRisen([]);
  setNameClaims([], []);
  const choices = choicesOf(o);
  PlanAhead.on = o.planAhead;
  SeaPlay.on = o.seaPlay && !o.seaPlayHalf;
  RoadPlay.on = o.roadPlay;
  WinterStrokes.on = o.winterPlay;
  AuthorityPlay.on = o.authorityPlay;
  ClausePlay.on = o.clausePlay;
  InventoryPlay.on = o.inventoryPlay && !o.inventoryPlayHalf;
  let last: GameRunner | null = null;
  // In a benchmark, these kings play the current bot and the rest the frozen baseline.
  const current = new Set<Power>(o.focus !== null ? [o.focus] : AllPowers.filter((_, i) => !(o.versus || o.seaPlayHalf || o.inventoryPlayHalf || o.planAheadHalf || o.roadPlayHalf || o.clausePlayHalf || o.winterPlayHalf || o.authorityPlayHalf || o.plainEconomyHalf || o.tradePlayHalf || o.peoplePlayHalf || o.landPlayHalf || o.borderPlayHalf || o.moneyPlayHalf || o.seasonPlayHalf || o.wallPlayHalf || o.worksPlayHalf || o.cofferPlayHalf || o.giftPlayHalf || o.caravanPlayHalf || o.outlawPlayHalf || o.raiderPlayHalf || o.vassalPlayHalf || o.commandPlayHalf || o.freedomPlayHalf || o.councilPlayHalf || o.languagePlayHalf || o.upkeepPlayHalf || o.remnantPlayHalf || o.kingPlayHalf || o.fieldPlayHalf || o.countPlayHalf || o.grantPlayHalf || o.takeUpPlayHalf || o.regionPlayHalf || o.auditPlayHalf || o.spyCheckPlayHalf || o.talkPlayHalf || o.occupyPlayHalf || o.warPlayHalf || o.tidingsPlayHalf || o.ridePlayHalf) || (i + (s % 2)) % 2 === 0));
  PlanAhead.only = o.planAheadHalf ? current : null;
  SeaPlay.only = o.seaPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  InventoryPlay.only = o.inventoryPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  RoadPlay.only = o.roadPlayHalf ? current : null;
  WinterStrokes.only = o.winterPlayHalf ? current : null;
  AuthorityPlay.only = o.authorityPlayHalf ? current : null;
  GrainPlay.plain = o.plainEconomy || o.plainEconomyHalf;
  GrainPlay.only = o.plainEconomyHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  TradePlay.off = o.noTradePlay || o.tradePlayHalf;
  TradePlay.only = o.tradePlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  PeoplePlay.off = o.noPeoplePlay || o.peoplePlayHalf;
  PeoplePlay.only = o.peoplePlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  LandPlay.off = o.noLandPlay || o.landPlayHalf;
  LandPlay.only = o.landPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  BorderPlay.off = o.noBorderPlay || o.borderPlayHalf;
  BorderPlay.only = o.borderPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  MoneyPlay.off = o.noMoneyPlay || o.moneyPlayHalf;
  MoneyPlay.only = o.moneyPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  UpkeepPlay.off = o.noUpkeepPlay || o.upkeepPlayHalf;
  UpkeepPlay.only = o.upkeepPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  RemnantPlay.off = o.noRemnantPlay || o.remnantPlayHalf;
  RemnantPlay.only = o.remnantPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  KingPlay.off = o.noKingPlay || o.kingPlayHalf;
  KingPlay.only = o.kingPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  FieldPlay.off = o.noFieldPlay || o.fieldPlayHalf;
  FieldPlay.only = o.fieldPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  CountPlay.off = o.noCountPlay || o.countPlayHalf;
  CountPlay.only = o.countPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  GrantPlay.off = o.noGrantPlay || o.grantPlayHalf;
  GrantPlay.only = o.grantPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  TakeUpPlay.off = o.noTakeUpPlay || o.takeUpPlayHalf;
  TakeUpPlay.only = o.takeUpPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  RegionPlay.off = o.noRegionPlay || o.regionPlayHalf;
  RegionPlay.only = o.regionPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  AuditPlay.off = o.noAuditPlay || o.auditPlayHalf;
  AuditPlay.only = o.auditPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  TalkPlay.off = o.noTalkPlay || o.talkPlayHalf;
  TalkPlay.only = o.talkPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  OccupyPlay.off = o.noOccupyPlay || o.occupyPlayHalf;
  OccupyPlay.only = o.occupyPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  WarPlay.off = o.noWarPlay || o.warPlayHalf;
  WarPlay.only = o.warPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  TidingsPlay.off = o.noTidingsPlay || o.tidingsPlayHalf;
  TidingsPlay.only = o.tidingsPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  RidePlay.off = o.noRidePlay || o.ridePlayHalf;
  RidePlay.only = o.ridePlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  SpyCheckPlay.off = o.noSpyCheckPlay || o.spyCheckPlayHalf;
  SpyCheckPlay.only = o.spyCheckPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  OutlawPlay.off = o.noOutlawPlay || o.outlawPlayHalf;
  OutlawPlay.only = o.outlawPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  RaiderPlay.off = o.noRaiderPlay || o.raiderPlayHalf;
  RaiderPlay.only = o.raiderPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  CommandPlay.off = o.noCommandPlay || o.commandPlayHalf;
  CommandPlay.only = o.commandPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  FreedomPlay.off = o.noFreedomPlay || o.freedomPlayHalf;
  FreedomPlay.only = o.freedomPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  CouncilPlay.only = o.councilPlayHalf ? new Set(current) : null;
  VassalPlay.off = o.noVassalPlay || o.vassalPlayHalf;
  VassalPlay.only = o.vassalPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  LanguagePlay.off = o.noLanguagePlay || o.languagePlayHalf;
  LanguagePlay.only = o.languagePlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  SeasonPlay.off = o.noSeasonPlay || o.seasonPlayHalf;
  SeasonPlay.only = o.seasonPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  WallPlay.off = o.noWallPlay || o.wallPlayHalf;
  WallPlay.only = o.wallPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  WorksPlay.off = o.noWorksPlay || o.worksPlayHalf;
  WorksPlay.only = o.worksPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  GiftPlay.off = o.giftPlayHalf;
  GiftPlay.only = o.giftPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  CofferPlay.off = o.cofferPlayHalf;
  CofferPlay.only = o.cofferPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  CaravanPlay.off = o.noCaravanPlay || o.caravanPlayHalf;
  CaravanPlay.only = o.caravanPlayHalf ? new Set(AllPowers.filter((x) => !current.has(x))) : null;
  ClausePlay.only = o.clausePlayHalf ? current : null;
  const [summary] = await playGame(
    s,
    (state) => {
      const simulated = o.simulateApi ? new SimulatedApi() : null;
      if (simulated !== null) simulated.reportUsage = false;
      const anthropic = simulated ?? (choices.usesModels ? new SdkTransport(process.env.ANTHROPIC_API_KEY ?? "") : null);
      const set = buildSeats(choices, state, choices.usesModels ? providersFor(choices, anthropic, providerKeys(o)) : null, () => last!.log);
      let seats = set.seats;
      for (const [p, folder] of o.folders) {
        const exchange = new FileExchange(folder, o.fileTimeoutMinutes * 60000, (call) => last!.log.addCall(call), (line) => console.log(line));
        const seat = new LlmLeaderSeat(p, exchange, "file", choices.leaderEffort, state.config.customsPrimer, state.config, "File seat");
        seat.shadow = set.shadowing;
        seats.set(p, seat);
      }
      if (o.sleepingScripts)
        seats = new Dict<Power, ISeat>(
          [...seats].map(([p, inner]) => [
            p,
            { label: inner.label + " (sleeping)", canSleep: true, decide: (v, sg) => inner.decide(v, sg), hostAudience: (v, c, sg) => inner.hostAudience(v, c, sg) } as ISeat,
          ] as const),
        );
      if (o.versus || o.focus !== null) {
        const baseline = new BaselineLeader(state.seed);
        seats = new Dict<Power, ISeat>(AllPowers.map((p) => [p, current.has(p) ? set.seats.get(p) : baseline] as const));
      }
      // Each file character's decision is logged beside the script's for the same situation.
      const minds =
        o.characterFolders.length === 0
          ? set.minds
          : FileCharacters.mind(
              new Map(o.characterFolders),
              o.fileTimeoutMinutes * 60000,
              (call) => last!.log.addCall(call),
              (sh) => last!.log.addShadow(sh),
              (line) => console.log(line),
            );
      last = new GameRunner(pressFor(state, minds), seats, minds, set.narrator, { jobs: choices.jobs });
      last.writeChronicles = !o.noChronicles;
      return last;
    },
    o.verify,
    o.config,
    (line) => console.error(line),
  );
  const runner = last as GameRunner | null;
  // Sleeping seats are on by default, but only model and file seats sleep: a game of script kings keeps no runner for them.
  const sleepers = runner !== null && runner.state.sleep.size > 0;
  const keep = o.outDir !== null || o.detail || o.folders.length > 0 || o.characterFolders.length > 0 || sleepers || choices.usesModels ? runner : null;

  const out: string[] = [];
  if (o.outDir !== null && keep !== null) {
    mkdirSync(o.outDir, { recursive: true });
    writeFileSync(join(o.outDir, `game-${s}.jsonl`), keep.log.toJsonl());
    writeFileSync(join(o.outDir, `game-${s}.final.json`), serialize(GameStateSchema, keep.state));
  }
  out.push(
    `seed ${s}: ${summary.turns} turns, winner ${summary.winners.join(" & ")}` +
      (o.verify ? (summary.replayMatches ? ", replay ok" : ", REPLAY MISMATCH") : "") +
      (summary.costUsd > 0 ? `, $${fmt(summary.costUsd, "0.00")}` : "") +
      (summary.errors > 0 ? `, ${summary.errors} fallbacks` : ""),
  );
  // The scoreboard of every person (item 17b, part D): the top three, or with --detail the whole of it.
  const board = summary.board.slice(0, o.detail ? summary.board.length : 3).map((line, i) => `${i + 1}. ${line}`);
  if (board.length > 0) out.push(o.detail ? "  Scoreboard:\n" + board.map((r) => "    " + r).join("\n") : `  Scoreboard: ${board.join("; ")}`);
  if (keep !== null && (o.folders.length > 0 || o.characterFolders.length > 0 || keep.state.sleep.size > 0 || choices.usesModels)) out.push(seatReport(keep));
  // Model or file characters beside the script with the same traits, and how large each kind of request was.
  if (keep !== null && keep.log.shadows.length > 0) out.push(characterReport(keep.log));
  // Model kings beside the shadow script (item 18, "Shadow scripts").
  if (keep !== null && keep.log.kingShadows.length > 0) out.push(kingShadowReport(keep.log));
  if (keep !== null && keep.log.calls.length > 0) out.push(callSizes(keep.log));
  if (o.detail && keep !== null) {
    const st = keep.state;
    for (const p of AllPowers) {
      const rows = st.scores.filter((x) => x.power === p);
      const curve = rows
        .filter((_, i) => i % 3 === 0)
        .map((r) => `${r.provinces}/${r.units}/${r.gold}`)
        .join(" ");
      out.push(`   ${align(p, -10)} growth ${fmt(summary.growth[p], "0.00")}  prov/units/gold every 3 turns: ${curve}`);
    }
    for (const e of st.events.filter((e) => ["conquest", "fall", "desertion", "purchase", "catastrophe"].includes(e.kind)).slice(0, 60)) out.push(`     t${e.turn} ${e.kind}: ${e.text}`);
    for (const err of keep.errors.slice(0, 10)) out.push(`     error: ${err}`);
  }
  return { summary, current: [...current], printed: out.join("\n") };
}

/** One game of the solo benchmark: `focus` plays the current bot against six baselines, or none (all baseline). */
export interface SoloJob {
  soloSeed: number;
  focus: Power | null;
  config: GameConfig;
}

export async function playSolo(job: SoloJob): Promise<GameSummary> {
  setRisen([]);
  setNameClaims([], []);
  const [summary] = await playGame(
    job.soloSeed,
    (st) => {
      const baseline = new BaselineLeader(st.seed);
      const seats = new Dict<Power, ISeat>(AllPowers.map((x) => [x, x === job.focus ? new ScriptLeader(st.seed) : baseline] as const));
      const runner = new GameRunner(pressFor(st, new ScriptMind()), seats, new ScriptMind(), new TemplateNarrator());
      runner.writeChronicles = false;
      return runner;
    },
    false,
    job.config,
  );
  return summary;
}
