/** The batch runner's command line (`main.ts` runs what it asks for). */
import { AllPowers, newGameConfig, PowerValues } from "@amarna/engine";
import { Presets, SpendModes, newSpendingSettings, type CharacterKind, type LeaderKind, type NarratorKind } from "@amarna/llm";
import { choicesOf, type BatchOptions } from "./play.ts";

const LeaderKinds = ["Script", "Human", "Haiku", "Sonnet", "Opus", "LocalAgent"] as const;
const CharacterKinds = ["Script", "Haiku", "Sonnet", "Opus"] as const;
const NarratorKinds = ["Template", "Haiku", "Sonnet", "Opus"] as const;
export const enumOf = <T extends string>(values: readonly T[], s: string): T => {
  const v = values.find((x) => x.toLowerCase() === s.toLowerCase());
  if (v === undefined) throw new Error(`Requested value '${s}' was not found.`);
  return v;
};
/** A known kind by its name in any case, or else any model setting ("claude-sonnet-5-5", "<provider>:<model>"). */
const kindOf = (values: readonly string[], s: string): string => values.find((x) => x.toLowerCase() === s.toLowerCase()) ?? s;

/** What the command line asked for: the options every game takes, and the runner's own switches. */
export interface Parsed {
  o: BatchOptions;
  /** `--versus solo`: each king alone against six baselines. */
  solo: boolean;
  /** `--file-seats`: the folder or seat map of the file kings. */
  fileSeats: string | null;
  /** `--file-characters`: the folder or map of the file characters. */
  fileCharacters: string | null;
  /** `--list-characters`: print the seed's characters and stop. */
  listCharacters: boolean;
  /** `--par-out`: where to write par's results (item 11e). */
  parOut: string | null;
}

/** Reads the command line into the options (prints the help or an error and exits where it must). */
export function parseArgs(args: readonly string[]): Parsed {
  const o: BatchOptions = {
    games: 20,
    seed: 1,
    outDir: null,
    verify: false,
    detail: false,
    leaders: Object.fromEntries(AllPowers.map((p) => [p, "Script" as LeaderKind])),
    characters: "Script",
    narrator: "Template",
    effort: "medium",
    budget: 5.0,
    noChronicles: false,
    config: newGameConfig(),
    versus: false,
    focus: null,
    folders: [],
    characterFolders: [],
    fileTimeoutMinutes: 120,
    sleepingScripts: false,
    planAhead: true,
    seaPlay: true,
    seaPlayHalf: false,
    nullHalf: false,
    roadPlay: true,
    planAheadHalf: false,
    roadPlayHalf: false,
    winterPlay: true,
    winterPlayHalf: false,
    authorityPlay: true,
    authorityPlayHalf: false,
    plainEconomy: false,
    plainEconomyHalf: false,
    noTradePlay: false,
    tradePlayHalf: false,
    noPeoplePlay: false,
    peoplePlayHalf: false,
    noLandPlay: false,
    landPlayHalf: false,
    noBorderPlay: false,
    borderPlayHalf: false,
    noMoneyPlay: false,
    moneyPlayHalf: false,
    noUpkeepPlay: false,
    upkeepPlayHalf: false,
    noRemnantPlay: false,
    remnantPlayHalf: false,
    noKingPlay: false,
    kingPlayHalf: false,
    noFieldPlay: false,
    fieldPlayHalf: false,
    noCountPlay: false,
    countPlayHalf: false,
    noGrantPlay: false,
    noTakeUpPlay: false,
    noRegionPlay: false,
    regionPlayHalf: false,
    takeUpPlayHalf: false,
    grantPlayHalf: false,
    noAuditPlay: false,
    auditPlayHalf: false,
    noTalkPlay: false,
    talkPlayHalf: false,
    noOccupyPlay: false,
    occupyPlayHalf: false,
    noWarPlay: false,
    warPlayHalf: false,
    noTidingsPlay: false,
    tidingsPlayHalf: false,
    noRidePlay: false,
    ridePlayHalf: false,
    noSpyCheckPlay: false,
    spyCheckPlayHalf: false,
    noOutlawPlay: false,
    outlawPlayHalf: false,
    noRaiderPlay: false,
    raiderPlayHalf: false,
    noVassalPlay: false,
    vassalPlayHalf: false,
    noCommandPlay: false,
    commandPlayHalf: false,
    noFreedomPlay: false,
    freedomPlayHalf: false,
    councilPlayHalf: false,
    noLanguagePlay: false,
    languagePlayHalf: false,
    noSeasonPlay: false,
    seasonPlayHalf: false,
    noWallPlay: false,
    wallPlayHalf: false,
    noWorksPlay: false,
    worksPlayHalf: false,
    cofferPlayHalf: false,
    giftPlayHalf: false,
    noCaravanPlay: false,
    caravanPlayHalf: false,
    clausePlay: true,
    clausePlayHalf: false,
    inventoryPlay: true,
    inventoryPlayHalf: false,
    simulateApi: false,
    providers: [],
    prices: {},
    small: "Haiku",
    plays: "large",
    charactersUp: "Sonnet",
    planning: "Off",
    spending: newSpendingSettings(),
  };
  let solo = false;
  let fileSeats: string | null = null;
  let fileCharacters: string | null = null;
  let listCharacters = false;
  /** Where to write par's results from these games (item 11e): `src/engine/src/rules/par-results.ts`'s source. */
  let parOut: string | null = null;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    const next = (): string => args[++i];
    switch (a) {
      case "--games":
        o.games = Number.parseInt(next(), 10);
        break;
      case "--seed":
        o.seed = Number(next());
        break;
      case "--out":
        o.outDir = next();
        break;
      case "--par-out":
        parOut = next();
        break;
      case "--sleeping-scripts":
        o.sleepingScripts = true;
        break;
      case "--simulate-api":
        o.simulateApi = true;
        break;
      case "--alternate-script":
        AllPowers.forEach((p, k) => {
          if (k % 2 === 1) o.leaders[p] = "Script";
        });
        break;
      case "--verify-replay":
        o.verify = true;
        break;
      case "--detail":
        o.detail = true;
        break;
      case "--budget":
        o.budget = Number(next());
        break;
      case "--no-chronicles":
        o.noChronicles = true;
        break;
      case "--versus": {
        const mode = next();
        if (mode !== "baseline" && mode !== "solo") throw new Error("Use --versus baseline or --versus solo.");
        o.versus = mode === "baseline";
        solo = mode === "solo";
        break;
      }
      case "--focus":
        o.focus = enumOf(PowerValues, next());
        break;
      case "--no-sea-play":
        o.seaPlay = false;
        break;
      case "--null-half":
        // The halves of the use-against-ignore runs with nothing switched off: what chance and the seeds give each side.
        o.nullHalf = true;
        break;
      case "--sea-play-half":
        // Half the script kings leave item 7a's finer seas alone (blockades, guards, convoys, landings), alternating by seed.
        o.seaPlayHalf = true;
        break;
      case "--no-road-play":
        o.roadPlay = false;
        break;
      case "--no-plan-ahead":
        // Script kings that sleep schedule nothing ahead: to measure what conditional scheduled orders are worth to them.
        o.planAhead = false;
        break;
      case "--no-clause-play":
        o.clausePlay = false;
        break;
      case "--clause-play-half":
        // Half the script kings act on the clauses they read, alternating by seed: the two sides compared on the same seeds.
        o.clausePlayHalf = true;
        break;
      case "--no-inventory-play":
        o.inventoryPlay = false;
        break;
      case "--inventory-play-half":
        // Half the script kings always send gold with an inventory (item 8), alternating by seed.
        o.inventoryPlayHalf = true;
        break;
      case "--plain-economy":
        o.plainEconomy = true;
        break;
      case "--plain-economy-half":
        // Half the script kings play the economy plainly (item 9+a), alternating by seed: the two sides on the same seeds.
        o.plainEconomyHalf = true;
        break;
      case "--no-people-play":
        o.noPeoplePlay = true;
        break;
      case "--people-play-half":
        // Half the script kings leave item 10's people alone, alternating by seed.
        o.peoplePlayHalf = true;
        break;
      case "--no-land-play":
        o.noLandPlay = true;
        break;
      case "--land-play-half":
        // Half the script kings leave item 10+a's levers alone (tax, famine feeding, levies, colonists), alternating by seed.
        o.landPlayHalf = true;
        break;
      case "--no-border-play":
        o.noBorderPlay = true;
        break;
      case "--no-money-play":
        o.noMoneyPlay = true;
        break;
      case "--no-outlaw-play":
        o.noOutlawPlay = true;
        break;
      case "--outlaw-play-half":
        // Half the script kings neither hunt bands nor buy news (item 11b), alternating by seed.
        o.outlawPlayHalf = true;
        break;
      case "--no-raider-play":
        o.noRaiderPlay = true;
        break;
      case "--raider-play-half":
        // Half the script kings ignore the raiders from beyond the map (item 17++++a), alternating by seed.
        o.raiderPlayHalf = true;
        break;
      case "--no-vassal-play":
        o.noVassalPlay = true;
        break;
      case "--no-command-play":
        o.noCommandPlay = true;
        break;
      case "--no-freedom-play":
        o.noFreedomPlay = true;
        break;
      case "--freedom-play-half":
        // Half the script kings take their armies' food rather than buy it, heed no governor's word of unrest and stir no
        // foe's land (item 17), alternating by seed.
        o.freedomPlayHalf = true;
        break;
      case "--council-play-half":
        // Half the script kings take their troop orders and levies from their royal council (item 16), alternating by seed.
        o.councilPlayHalf = true;
        break;
      case "--command-play-half":
        // Half the script kings grant no commands and give no mandates (item 13), alternating by seed.
        o.commandPlayHalf = true;
        break;
      case "--vassal-play-half":
        // Half the script players neither pay, demand nor offer vassalage (item 11+), alternating by seed.
        o.vassalPlayHalf = true;
        break;
      case "--no-season-play":
        o.noSeasonPlay = true;
        break;
      case "--season-play-half":
        // Half the script kings leave item 11a+'s levers alone, alternating by seed.
        o.seasonPlayHalf = true;
        break;
      case "--no-language-play":
        // Script kings choose envoys without regard to languages and take on no go-betweens (item 12).
        o.noLanguagePlay = true;
        break;
      case "--language-play-half":
        // Half the script kings leave item 12's choices alone, alternating by seed.
        o.languagePlayHalf = true;
        break;
      case "--no-wall-play":
        o.noWallPlay = true;
        break;
      case "--no-works-play":
        o.noWorksPlay = true;
        break;
      case "--works-play-half":
        // Half the script kings build only walls and keep what stands by corvée (item 15), alternating by seed.
        o.worksPlayHalf = true;
        break;
      case "--gift-play-half":
        // Half the script kings send no gifts, bribes or tribute of their own choosing (item 18 part E), alternating by seed.
        o.giftPlayHalf = true;
        break;
      case "--coffer-play-half":
        // Half the script kings send no gold ahead to their far coffers (#587), alternating by seed.
        o.cofferPlayHalf = true;
        break;
      case "--no-caravan-play":
        o.noCaravanPlay = true;
        break;
      case "--caravan-play-half":
        // Half the script kings keep their caravans to their own land (item 11f), alternating by seed.
        o.caravanPlayHalf = true;
        break;
      case "--wall-play-half":
        // Half the script kings reckon a storm without the city's men on its walls (item 11e), alternating by seed.
        o.wallPlayHalf = true;
        break;
      case "--money-play-half":
        // Half the script kings never borrow or repay (item 11a), alternating by seed.
        o.moneyPlayHalf = true;
        break;
      case "--no-upkeep-play":
        o.noUpkeepPlay = true;
        break;
      case "--no-remnant-play":
        o.noRemnantPlay = true;
        break;
      case "--no-king-play":
        o.noKingPlay = true;
        break;
      case "--no-field-play":
        o.noFieldPlay = true;
        break;
      case "--field-play-half":
        // Half the script kings never leave their courts for the front (item 17b, part C), alternating by seed.
        o.fieldPlayHalf = true;
        break;
      case "--king-play-half":
        // Half the script kings let captive kings go at once and never ransom their own (item 17b), alternating by seed.
        o.kingPlayHalf = true;
        break;
      case "--remnant-play-half":
        // Half the script kings never fold or disband their remnants (item 17++), alternating by seed.
        o.remnantPlayHalf = true;
        break;
      case "--no-count-play":
        o.noCountPlay = true;
        break;
      case "--count-play-half":
        // Half the script kings never count their land and always ask a share (item 17++), alternating by seed.
        o.countPlayHalf = true;
        break;
      case "--no-grant-play":
        o.noGrantPlay = true;
        break;
      case "--grant-play-half":
        // Half the script kings never grant a kingship (item 17++, part C), alternating by seed.
        o.grantPlayHalf = true;
        break;
      case "--no-region-play":
        o.noRegionPlay = true;
        break;
      case "--region-play-half":
        // Half the script kings never give a governor a province beside his own (item 17++, part C), alternating by seed.
        o.regionPlayHalf = true;
        break;
      case "--no-take-up-play":
        o.noTakeUpPlay = true;
        break;
      case "--take-up-play-half":
        // Half the script kings take up every province that looks to them (item 17++, part C), alternating by seed.
        o.takeUpPlayHalf = true;
        break;
      case "--no-audit-play":
        o.noAuditPlay = true;
        break;
      case "--audit-play-half":
        // Half the script kings play as before the improvement audit's finds (item 17++, part C), alternating by seed.
        o.auditPlayHalf = true;
        break;
      case "--no-talk-play":
        o.noTalkPlay = true;
        break;
      case "--talk-play-half":
        o.talkPlayHalf = true;
        break;
      case "--no-occupy-play":
        o.noOccupyPlay = true;
        break;
      case "--occupy-play-half":
        o.occupyPlayHalf = true;
        break;
      case "--no-war-play":
        o.noWarPlay = true;
        break;
      case "--war-play-half":
        o.warPlayHalf = true;
        break;
      case "--no-tidings-play":
        o.noTidingsPlay = true;
        break;
      case "--tidings-play-half":
        o.tidingsPlayHalf = true;
        break;
      case "--no-ride-play":
        o.noRidePlay = true;
        break;
      case "--ride-play-half":
        o.ridePlayHalf = true;
        break;
      case "--no-spy-check-play":
        o.noSpyCheckPlay = true;
        break;
      case "--spy-check-play-half":
        o.spyCheckPlayHalf = true;
        break;
      case "--upkeep-play-half":
        // Half the script kings never hold back their troops' pay when hard up (item 17+), alternating by seed.
        o.upkeepPlayHalf = true;
        break;
      case "--border-play-half":
        // Half the script kings leave item 10+b's choices alone (settling, returning, deporting, expelling), alternating by seed.
        o.borderPlayHalf = true;
        break;
      case "--no-trade-play":
        o.noTradePlay = true;
        break;
      case "--trade-play-half":
        // Half the script kings leave trade abroad, ships and tolls alone (item 9+b), alternating by seed.
        o.tradePlayHalf = true;
        break;
      case "--no-authority-play":
        o.authorityPlay = false;
        break;
      case "--authority-play-half":
        // Half the script kings play envoy authority and passage (item 9), alternating by seed: the two sides on the same seeds.
        o.authorityPlayHalf = true;
        break;
      case "--no-winter-play":
        o.winterPlay = false;
        break;
      case "--winter-play-half":
        // Half the script kings make winter strokes over the passes, alternating by seed: the two sides on the same seeds.
        o.winterPlayHalf = true;
        break;
      case "--road-play-half":
        // Half the script kings close their roads to their foes, alternating by seed: the two sides compared on the same seeds.
        o.roadPlayHalf = true;
        break;
      case "--plan-ahead-half":
        // Half the sleeping script kings plan ahead, alternating by seed: the two sides compared on the same seeds.
        o.planAheadHalf = true;
        break;
      case "--no-primer":
        o.config = { ...o.config, customsPrimer: false };
        break;
      case "--shared-victory":
        o.config = { ...o.config, sharedVictory: true };
        break;
      case "--fallen-view": {
        const view = next();
        if (view !== "god" && view !== "kingdom") throw new Error("Use --fallen-view god or --fallen-view kingdom.");
        o.config = { ...o.config, fallenSeeAll: view === "god" };
        break;
      }
      case "--rolled-traits":
        o.config = { ...o.config, rolledTraits: true };
        break;
      case "--no-shared-victory":
        o.config = { ...o.config, sharedVictory: false };
        break;
      case "--sleep": {
        const v = next();
        o.config = { ...o.config, sleepingSeats: v === "on" || v === "true" || v === "1" };
        break;
      }
      case "--sleep-cap":
        o.config = { ...o.config, maxSleep: Number.parseInt(next(), 10) };
        break;
      case "--max-turns": {
        // A known cap: the drawn cap's range of a single season (the rising chance still applies before it).
        const n = Number.parseInt(next(), 10);
        if (!(n >= 1)) throw new Error("Use --max-turns N, in seasons.");
        o.config = { ...o.config, capped: true, capMin: n, capMax: n };
        break;
      }
      case "--cap": {
        // "80-100", a single season, or "none".
        const v = next();
        if (v === "none") o.config = { ...o.config, capped: false };
        else {
          const [a, b] = v.split("-").map((x) => Number.parseInt(x, 10));
          if (!(a >= 1) || (b !== undefined && !(b >= 1))) throw new Error("Use --cap A-B, --cap N or --cap none, in seasons.");
          o.config = { ...o.config, capped: true, capMin: a, capMax: b ?? a };
        }
        break;
      }
      case "--median": {
        const m = Number.parseInt(next(), 10);
        if (!(m >= 1)) throw new Error("Use --median N, in seasons.");
        o.config = { ...o.config, endMedian: m };
        break;
      }
      case "--size-weight": {
        // The weight of a realm's size in the final score, in percent (item 11e; set in item 18).
        const w = Number.parseInt(next(), 10);
        if (!(w >= 0 && w <= 100)) throw new Error("Use --size-weight N, in percent from 0 to 100.");
        o.config = { ...o.config, sizeWeight: w };
        break;
      }
      case "--file-seats":
        fileSeats = next();
        break;
      case "--file-characters":
        fileCharacters = next();
        break;
      case "--list-characters":
        listCharacters = true;
        break;
      case "--file-timeout":
        o.fileTimeoutMinutes = Number(next());
        break;
      case "--effort":
        o.effort = next();
        break;
      case "--preset": {
        const preset = Presets.find(next());
        if (preset === null) throw new Error(`Unknown preset; choose ${Presets.all.map((x) => x.id).join(", ")}.`);
        const c = choicesOf(o);
        preset.applyTo(c);
        for (const p of AllPowers) o.leaders[p] = c.leaders.get(p);
        o.characters = c.characters;
        o.narrator = c.narrator;
        o.small = c.small;
        o.plays = c.plays;
        o.charactersUp = c.charactersUp;
        o.planning = c.planning;
        break;
      }
      case "--small":
        o.small = kindOf([...CharacterKinds, "Off"], next());
        break;
      case "--plays": {
        const v = next().toLowerCase();
        if (v !== "small" && v !== "large") throw new Error("--plays takes small or large.");
        o.plays = v;
        break;
      }
      case "--characters-up":
        o.charactersUp = kindOf([...CharacterKinds, "Off"], next());
        break;
      case "--planning":
        o.planning = kindOf([...CharacterKinds, "Off"], next());
        break;
      case "--pace":
        o.spending.mode = enumOf(SpendModes, next());
        break;
      case "--season-usd":
        o.spending.seasonUsd = Math.max(0, Number(next()) || 0);
        break;
      case "--target":
        o.spending.target = Math.min(Math.max(Number(next()) || 0, 0), 1);
        break;
      case "--audit-share":
        o.spending.auditShare = Math.min(Math.max(Number(next()) || 0, 0), 1);
        break;
      case "--leaders": {
        const kind = kindOf(LeaderKinds, next());
        for (const p of AllPowers) o.leaders[p] = kind;
        break;
      }
      case "--characters":
        o.characters = kindOf(CharacterKinds, next()) as CharacterKind;
        break;
      case "--narrator":
        o.narrator = kindOf(NarratorKinds, next()) as NarratorKind;
        break;
      case "--provider": {
        // ID=URL: a provider with an OpenAI-compatible endpoint; its key is read from <ID>_API_KEY (empty for a local one).
        const [id, url] = next().split(/=(.*)/s);
        if (id === undefined || url === undefined || id.length === 0) throw new Error("--provider takes ID=URL.");
        o.providers.push({ id, baseUrl: url });
        break;
      }
      case "--price": {
        // MODEL=IN,OUT,CACHE: dollars per million input, output and cache-read tokens.
        const [model, rest] = next().split(/=(.*)/s);
        const n = (rest ?? "").split(",").map(Number);
        if (model === undefined || n.length !== 3 || n.some((x) => !Number.isFinite(x))) throw new Error("--price takes MODEL=IN,OUT,CACHE.");
        o.prices[model] = [n[0], n[1], n[2]];
        break;
      }
      case "-h":
      case "--help":
        console.log(
          "Options: --games N --seed S --out DIR --verify-replay --detail --preset free|budget|counsel|standard|showcase --small MODEL|off --plays small|large --characters-up MODEL|off --planning MODEL|off --pace off|limit|season|target --season-usd USD --target SHARE --audit-share SHARE --leaders script|haiku|sonnet|opus|MODEL --characters script|haiku|sonnet|MODEL --narrator template|haiku|sonnet|opus|MODEL --provider ID=URL --price MODEL=IN,OUT,CACHE --effort low|medium|high --budget USD --no-chronicles --no-primer --shared-victory --rolled-traits --fallen-view god|kingdom --versus baseline|solo --focus POWER --sleep on|off --sleep-cap N --max-turns N --cap A-B|N|none --median SEASONS --size-weight PERCENT --file-seats DIR|map.json --file-characters DIR|map.json --list-characters --file-timeout MINUTES --sleeping-scripts --no-plan-ahead --plan-ahead-half --null-half --no-sea-play --sea-play-half --no-road-play --road-play-half --no-winter-play --winter-play-half --no-authority-play --authority-play-half --plain-economy --plain-economy-half --no-trade-play --trade-play-half --no-people-play --people-play-half --no-land-play --land-play-half --no-border-play --border-play-half --no-money-play --money-play-half --no-upkeep-play --upkeep-play-half --no-remnant-play --remnant-play-half --no-king-play --king-play-half --no-field-play --field-play-half --no-count-play --count-play-half --no-grant-play --grant-play-half --no-take-up-play --take-up-play-half --no-region-play --region-play-half --no-audit-play --audit-play-half --no-talk-play --talk-play-half --no-occupy-play --occupy-play-half --no-war-play --war-play-half --no-tidings-play --tidings-play-half --no-ride-play --ride-play-half --no-spy-check-play --spy-check-play-half --no-outlaw-play --outlaw-play-half --no-raider-play --raider-play-half --no-vassal-play --vassal-play-half --no-command-play --command-play-half --no-freedom-play --freedom-play-half --council-play-half --no-season-play --season-play-half --no-wall-play --wall-play-half --no-works-play --works-play-half --coffer-play-half --no-caravan-play --caravan-play-half --no-clause-play --clause-play-half --no-inventory-play --inventory-play-half --simulate-api --alternate-script",
        );
        process.exit(0);
      default:
        console.error(`Unknown option ${a}`);
        process.exit(1);
    }
  }
  return { o, solo, fileSeats, fileCharacters, listCharacters, parOut };
}
