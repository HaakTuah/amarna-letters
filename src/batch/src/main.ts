/**
 * The batch runner: runs many games unattended and prints winners and signal counts, as the C# batch runner did.
 *   node --experimental-strip-types src/batch/src/main.ts --games 50 --seed 1 [--out logs] [--verify-replay] [--detail]
 * Options are the C# runner's (see --help): model seats read ANTHROPIC_API_KEY and every call costs money; --simulate-api
 * answers them with canned replies instead. Script games run side by side on worker threads; model and file games one at a
 * time, in this thread.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync } from "node:fs";
import { basename, join } from "node:path";
import { AllPowers, cmpNum, fmt, newGameConfig, sortBy, idNumber, PowerValues, type Power } from "@amarna/engine";
import { batchReport, soloReport, versusReport, type GameSummary } from "@amarna/game";
import { CostEstimate, Presets, SimulatedApi, type CharacterKind, type LeaderKind, type NarratorKind } from "@amarna/llm";
import { FileCharacters } from "@amarna/llm/node";
import { choicesOf, playOne, setupCheck, type BatchOptions, type PlayJob, type PlayResult, type SoloJob } from "./play.ts";
import { runPool } from "./pool.ts";

const LeaderKinds = ["Script", "Human", "Haiku", "Sonnet", "Opus", "LocalAgent"] as const;
const CharacterKinds = ["Script", "Haiku", "Sonnet", "Opus"] as const;
const NarratorKinds = ["Template", "Haiku", "Sonnet", "Opus"] as const;
const enumOf = <T extends string>(values: readonly T[], s: string): T => {
  const v = values.find((x) => x.toLowerCase() === s.toLowerCase());
  if (v === undefined) throw new Error(`Requested value '${s}' was not found.`);
  return v;
};
/** A known kind by its name in any case, or else any model setting ("claude-sonnet-5-5", "<provider>:<model>"). */
const kindOf = (values: readonly string[], s: string): string => values.find((x) => x.toLowerCase() === s.toLowerCase()) ?? s;

const args = process.argv.slice(2);
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
  parityDir: null,
  sleepingScripts: false,
  simulateApi: false,
  providers: [],
  prices: {},
};
let solo = false;
let fileSeats: string | null = null;
let fileCharacters: string | null = null;
let listCharacters = false;

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
    case "--fingerprints":
      o.parityDir = next();
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
      o.config = { ...o.config, capped: true, capMin: n, capMax: n };
      break;
    }
    case "--cap": {
      // "80-100", a single season, or "none".
      const v = next();
      if (v === "none") o.config = { ...o.config, capped: false };
      else {
        const [a, b] = v.split("-").map((x) => Number.parseInt(x, 10));
        o.config = { ...o.config, capped: true, capMin: a, capMax: b ?? a };
      }
      break;
    }
    case "--median":
      o.config = { ...o.config, endMedian: Number.parseInt(next(), 10) };
      break;
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
      break;
    }
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
        "Options: --games N --seed S --out DIR --verify-replay --detail --preset free|budget|standard|showcase --leaders script|haiku|sonnet|opus|MODEL --characters script|haiku|sonnet|MODEL --narrator template|haiku|sonnet|opus|MODEL --provider ID=URL --price MODEL=IN,OUT,CACHE --effort low|medium|high --budget USD --no-chronicles --no-primer --shared-victory --fallen-view god|kingdom --versus baseline|solo --focus POWER --sleep on|off --sleep-cap N --max-turns N --cap A-B|N|none --median SEASONS --file-seats DIR|map.json --file-characters DIR|map.json --list-characters --file-timeout MINUTES --fingerprints DIR --sleeping-scripts --simulate-api --alternate-script",
      );
      process.exit(0);
    default:
      console.error(`Unknown option ${a}`);
      process.exit(1);
  }
}

// The seed's characters, fixed when the game is made: what the simulation kit makes a folder and an agent for.
if (listCharacters) {
  const pool = FileCharacters.of(o.seed, o.config).map((c) => ({ id: c.id, name: c.name, origin: c.origin, startsAs: FileCharacters.startsAs(c) }));
  console.log(JSON.stringify({ seed: String(o.seed), characters: pool }, null, 2));
  process.exit(0);
}

// Requests and replies left in a folder by an earlier game would look live: move them aside before this one starts.
function moveAside(who: string, folder: string): void {
  mkdirSync(folder, { recursive: true });
  const old = readdirSync(folder).filter((f) => /^t\d+_.*\.(request\.md|reply\.json|tmp)$/.test(f));
  if (old.length === 0) return;
  const d = new Date();
  const pad = (n: number): string => String(n).padStart(2, "0");
  const aside = join(folder, `earlier-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`);
  mkdirSync(aside, { recursive: true });
  for (const f of old) renameSync(join(folder, f), join(aside, basename(f)));
  console.log(`${who}: moved ${old.length} files from an earlier game to ${aside}`);
}

// File seats: one folder per king.
if (fileSeats !== null) {
  if (o.games !== 1) {
    console.error("File seats play one game at a time: use --games 1.");
    process.exit(1);
  }
  if (fileSeats.toLowerCase().endsWith(".json") && !existsSync(fileSeats)) {
    console.error(`No seat map at ${fileSeats}.`);
    process.exit(1);
  }
  const folders = new Map<Power, string>();
  if (existsSync(fileSeats) && fileSeats.toLowerCase().endsWith(".json")) {
    const map = JSON.parse(readFileSync(fileSeats, "utf8")) as Record<string, string>;
    for (const [name, path] of Object.entries(map)) folders.set(enumOf(PowerValues, name), path);
  } else for (const p of AllPowers) folders.set(p, join(fileSeats, p.toLowerCase()));
  const ordered = AllPowers.filter((p) => folders.has(p));
  for (const p of ordered) moveAside(p, folders.get(p)!);
  o.folders = ordered.map((p) => [p, folders.get(p)!]);
  console.log(`File seats: ${ordered.join(", ")}.`);
}

// File characters: one folder per character of this seed's pool.
if (fileCharacters !== null) {
  if (o.games !== 1) {
    console.error("File characters play one game at a time: use --games 1.");
    process.exit(1);
  }
  if (o.characters !== "Script") {
    console.error("Use either --characters or --file-characters.");
    process.exit(1);
  }
  const pool = new Set(FileCharacters.of(o.seed, o.config).map((c) => c.id));
  const folders = new Map<string, string>();
  if (fileCharacters.toLowerCase().endsWith(".json")) {
    if (!existsSync(fileCharacters)) {
      console.error(`No character map at ${fileCharacters}.`);
      process.exit(1);
    }
    const map = JSON.parse(readFileSync(fileCharacters, "utf8")) as Record<string, string>;
    // The same ids name other people in another seed's game: a map made for one seed must not answer for another.
    if ("seed" in map) {
      const mapSeed = map.seed;
      delete map.seed;
      if (mapSeed !== String(o.seed)) {
        console.error(`The character map ${fileCharacters} was made for seed ${mapSeed}, not seed ${o.seed}.`);
        process.exit(1);
      }
    }
    const unknown = Object.keys(map).filter((id) => !pool.has(id));
    if (unknown.length > 0) {
      console.error(`Not characters of seed ${o.seed}: ${unknown.join(", ")}.`);
      process.exit(1);
    }
    for (const [id, path] of Object.entries(map)) folders.set(id, path);
  } else for (const id of pool) folders.set(id, join(fileCharacters, id));
  const ordered = sortBy([...folders.keys()], [(x: string) => idNumber(x), cmpNum]);
  for (const id of ordered) moveAside(id, folders.get(id)!);
  o.characterFolders = ordered.map((id) => [id, folders.get(id)!]);
  console.log(`File characters: ${folders.size} of the ${pool.size} in seed ${o.seed}'s pool.`);
}

const choices = choicesOf(o);
const key = process.env.ANTHROPIC_API_KEY ?? "";
if (choices.providersInUse.includes("anthropic") && key.trim() === "" && !o.simulateApi) {
  console.error("Anthropic models need ANTHROPIC_API_KEY set in the environment.");
  process.exit(1);
}
const unpriced = CostEstimate.unpriced(choices);
if (unpriced.length > 0) console.log(`No price set for ${unpriced.join(", ")} (--price MODEL=IN,OUT,CACHE): the cost meter counts them as free.`);
if (o.outDir !== null) mkdirSync(o.outDir, { recursive: true });
if (o.parityDir !== null) mkdirSync(o.parityDir, { recursive: true });
if (choices.usesModels)
  console.log(`Estimated model cost: ${CostEstimate.describe(CostEstimate.perGame(choices))} per ${CostEstimate.TypicalSeasons}-season game; stopping at $${fmt(o.budget, "0.00")} in total.`);

const worker = new URL("./game-worker.ts", import.meta.url);

if (solo) {
  // Each king in turn plays the current bot against six baselines, compared with the same seed played all-baseline.
  const jobs: SoloJob[] = [];
  for (let i = 0; i < o.games; i++) {
    jobs.push({ soloSeed: o.seed + i, focus: null, config: o.config });
    for (const p of AllPowers) jobs.push({ soloSeed: o.seed + i, focus: p, config: o.config });
  }
  const done = await runPool<SoloJob, GameSummary>(worker, jobs);
  const baseGrowth: Record<string, number[]> = Object.fromEntries(AllPowers.map((p) => [p, []]));
  const soloGrowth: Record<string, number[]> = Object.fromEntries(AllPowers.map((p) => [p, []]));
  const baseWins: Record<string, number> = Object.fromEntries(AllPowers.map((p) => [p, 0]));
  const soloWins: Record<string, number> = Object.fromEntries(AllPowers.map((p) => [p, 0]));
  done.forEach((g, j) => {
    const p = jobs[j].focus;
    if (p === null) {
      for (const x of AllPowers) {
        baseGrowth[x].push(g.growth[x]);
        if (g.winners.includes(x)) baseWins[x] += 1.0 / g.winners.length;
      }
      return;
    }
    soloGrowth[p].push(g.growth[p]);
    if (g.winners.includes(p)) soloWins[p] += 1.0 / g.winners.length;
  });
  console.log(soloReport(o.games, baseGrowth, soloGrowth, baseWins, soloWins));
  process.exit(0);
}

const started = Date.now();
const played: (PlayResult | null)[] = new Array(o.games).fill(null);
const jobs: PlayJob[] = Array.from({ length: o.games }, (_, g) => ({ g, options: o }));
if (choices.usesModels || o.folders.length > 0 || o.characterFolders.length > 0) {
  // Model and file games run one at a time, in this thread, within the budget, after the check at setup.
  try {
    await setupCheck(o, o.simulateApi ? new SimulatedApi() : null);
  } catch (e) {
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
  let spent = 0.0;
  for (let g = 0; g < o.games; g++) {
    if (spent >= o.budget) {
      console.log(`Stopping: $${fmt(spent, "0.00")} spent, budget $${fmt(o.budget, "0.00")}.`);
      break;
    }
    played[g] = await playOne(jobs[g]);
    spent += played[g]!.summary.costUsd;
  }
} else {
  // Script games are independent and run side by side.
  const results = await runPool<PlayJob, PlayResult>(worker, jobs);
  results.forEach((r, g) => (played[g] = r));
}

const results: GameSummary[] = [];
const sides: Set<Power>[] = [];
for (const outcome of played) {
  if (outcome === null) break;
  results.push(outcome.summary);
  sides.push(new Set(outcome.current));
  console.log(outcome.printed);
}
console.log();
if (results.length > 0) console.log(batchReport(results));
if (o.versus && results.length > 0) console.log(versusReport(results, sides));
console.log(`\n${fmt((Date.now() - started) / 1000, "0.0")}s`);
