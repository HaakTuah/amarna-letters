/**
 * The batch runner: runs many games unattended and prints winners and signal counts, as the C# batch runner did.
 *   node --experimental-strip-types src/batch/src/main.ts --games 50 --seed 1 [--out logs] [--verify-replay] [--detail]
 * Options are the C# runner's (see --help): model seats read ANTHROPIC_API_KEY and every call costs money; --simulate-api
 * answers them with canned replies instead. Script games run side by side on worker threads; model and file games one at a
 * time, in this thread.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { AllPowers, cmpNum, fmt, sortBy, idNumber, PowerValues, type Power } from "@amarna/engine";
import { batchReport, parResultsSource, soloReport, versusReport, type GameSummary } from "@amarna/game";
import { CostEstimate, SimulatedApi, startProblem } from "@amarna/llm";
import { FileCharacters } from "@amarna/llm/node";
import { choicesOf, playOne, setupCheck, type PlayJob, type PlayResult, type SoloJob } from "./play.ts";
import { runPool } from "./pool.ts";
import { enumOf, parseArgs } from "./options.ts";

const { o, solo, fileSeats, fileCharacters, listCharacters, parOut } = parseArgs(process.argv.slice(2));

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
// Every batch of model games stops at its budget: a limit that cannot count a model's spending cannot hold against it.
const unpriceable = startProblem(choices, o.budget, o.simulateApi);
if (unpriceable !== null) {
  console.error(`${unpriceable} (--price MODEL=IN,OUT,CACHE)`);
  process.exit(1);
}
if (o.outDir !== null) mkdirSync(o.outDir, { recursive: true });
if (choices.usesModels)
  console.log(`Estimated model cost: ${CostEstimate.describeFor(choices)} per ${CostEstimate.TypicalSeasons}-season game; stopping at $${fmt(o.budget, "0.00")} in total.`);

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
if (parOut !== null && results.length > 0) writeFileSync(parOut, parResultsSource(results, `seeds ${o.seed}-${o.seed + results.length - 1}`));
if (o.versus && results.length > 0) console.log(versusReport(results, sides));
if (o.roadPlayHalf && results.length > 0)
  console.log("\nScript kings that close their roads to their foes (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.plainEconomyHalf && results.length > 0)
  console.log("\nScript kings that play the economy well (\"current\") against those that sell everything and send no caravans (\"baseline\"):" + versusReport(results, sides));
if (o.tradePlayHalf && results.length > 0)
  console.log("\nScript kings that trade abroad, ship goods and set tolls (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.peoplePlayHalf && results.length > 0)
  console.log("\nScript kings that judge people by what they did, question and hand over captives, steal tablets and see through false envoys (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.landPlayHalf && results.length > 0)
  console.log("\nScript kings that set each province's tax to what its farmers bear, feed a hungry countryside, levy where it costs the harvest least and settle colonists (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.borderPlayHalf && results.length > 0)
  console.log("\nScript kings that settle the loose, send back runaways they promised, deport from land they took and put out a besieged city's mouths (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.seasonPlayHalf && results.length > 0)
  console.log("\nScript kings that reckon the tax and famines by the granaries, raise smaller levies, choose how many mouths to put out, deport by safe roads, grant passage by order, post watching spies and strike by sea in winter (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.worksPlayHalf && results.length > 0)
  console.log("\nScript kings that build relay stations and roads to their far provinces, police their bandit country, raise harbours for their fleets, dig water works, repair their walls under siege and raze a besieged foe's stations (\"current\") against those that build only walls (\"baseline\"):" + versusReport(results, sides));
if (o.giftPlayHalf && results.length > 0)
  console.log("\nScript kings that give gifts, bribes and tribute where they judge they return more than they cost (\"current\") against those that give none (\"baseline\"):" + versusReport(results, sides));
if (o.cofferPlayHalf && results.length > 0)
  console.log("\nScript kings that send gold ahead to their far provinces' coffers (\"current\") against those that leave them to pay their own way and run on credit (\"baseline\"):" + versusReport(results, sides));
if (o.wallPlayHalf && results.length > 0)
  console.log("\nScript kings that reckon a storm by the city's men on its walls (\"current\") against those that reckon only the walls and the garrison (\"baseline\"):" + versusReport(results, sides));
if (o.caravanPlayHalf && results.length > 0)
  console.log("\nScript kings that send their caravans through foreign land, sneaking where the roads are closed to them (\"current\") against those that keep them to their own land (\"baseline\"):" + versusReport(results, sides));
if (o.nullHalf && results.length > 0)
  console.log("\nThe two halves with nothing switched off (\"current\" and \"baseline\" as in every use-against-ignore run on these seeds):" + versusReport(results, sides));
if (o.seaPlayHalf && results.length > 0)
  console.log("\nScript kings that blockade, guard their waters, convoy and land from the sea (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.inventoryPlayHalf && results.length > 0)
  console.log("\nScript kings that send gold without an inventory by envoys they trust (\"current\") against those that always send one (\"baseline\"):" + versusReport(results, sides));
if (o.outlawPlayHalf && results.length > 0)
  console.log("\nScript kings that hunt the bands in their land and buy news of their foes (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.raiderPlayHalf && results.length > 0)
  console.log("\nScript kings that hunt, hire and pay off the raiders from beyond the map (\"current\") against those that ignore them (\"baseline\"):" + versusReport(results, sides));
if (o.vassalPlayHalf && results.length > 0)
  console.log("\nScript players that pay their tribute while it is worth it, demand it of vassals in arrears, and offer vassalage either way (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.commandPlayHalf && results.length > 0)
  console.log("\nScript kings that grant command of their armies away from court, give them mandates and recall losing commanders (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.freedomPlayHalf && results.length > 0)
  console.log("\nScript kings that buy their armies' food where they stand by leave, ease the tax where their governors write of unrest, and send spies with gold to stir a foe's land where their armies stand and hand grain to their restless provinces in their own name (\"current\") against those that take their food and do none of it (\"baseline\"):" + versusReport(results, sides));
if (o.councilPlayHalf && results.length > 0)
  console.log("\nScript kings that play their troops and levies by their royal council's counsel (\"current\") against those that play their own plan (\"baseline\"):" + versusReport(results, sides));
if (o.languagePlayHalf && results.length > 0)
  console.log("\nScript kings that send envoys who say they speak the court's language and take on go-betweens for envoys nobody understands (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.countPlayHalf && results.length > 0)
  console.log("\nScript kings that count their land and ask an amount while the count is fresh (\"current\") against those that never count and always ask a share (\"baseline\"):" + versusReport(results, sides));
if (o.auditPlayHalf && results.length > 0)
  console.log("\nScript kings that raise troops when rich with idle men, threaten only what they can make good and recall a governor whose letters keep calling his land restless (\"current\") against those that play as before (\"baseline\"):" + versusReport(results, sides));
if (o.spyCheckPlayHalf && results.length > 0)
  console.log("\nScript kings that check their governor's word against their own spy's and recall one caught hiding unrest (\"current\") against those that read the governor alone (\"baseline\"):" + versusReport(results, sides));
if (o.talkPlayHalf && results.length > 0)
  console.log("\nScript kings that ease a province talk says leans toward another king (\"current\") against those that ignore the talk (\"baseline\"):" + versusReport(results, sides));
if (o.occupyPlayHalf && results.length > 0)
  console.log("\nScript kings that reckon whether land would obey them and stand in it until it does (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.warPlayHalf && results.length > 0)
  console.log("\nScript kings that wage the war they choose, breaking a plain peace for it (\"current\") against those that name a war on a king at peace with them and never fight it (\"baseline\"):" + versusReport(results, sides));
if (o.tidingsPlayHalf && results.length > 0)
  console.log("\nScript kings that read the word their vassals and allies send of land changing hands (\"current\") against those that leave it unread (\"baseline\"):" + versusReport(results, sides));
if (o.ridePlayHalf && results.length > 0)
  console.log("\nScript kings that hire a rider for the report of a far province that may be in danger, haggling over his fee (\"current\") against those that wait for word (\"baseline\"):" + versusReport(results, sides));
if (o.grantPlayHalf && results.length > 0)
  console.log("\nScript kings that make governors vassal kings where the tribute nets more than keeping the land (\"current\") against those that never grant (\"baseline\"):" + versusReport(results, sides));
if (o.regionPlayHalf && results.length > 0)
  console.log("\nScript kings that give a trusted governor the threatened province beside his own (\"current\") against those that send a new man (\"baseline\"):" + versusReport(results, sides));
if (o.takeUpPlayHalf && results.length > 0)
  console.log("\nScript kings that take up the provinces that look to them where it pays and refuse the rest (\"current\") against those that take up every one (\"baseline\"):" + versusReport(results, sides));
if (o.kingPlayHalf && results.length > 0)
  console.log("\nScript kings that ask a king's ransom for a captive king, or put a foe's to death, and ransom their own (\"current\") against those that let captive kings go and never ransom their own (\"baseline\"):" + versusReport(results, sides));
if (o.fieldPlayHalf && results.length > 0)
  console.log("\nScript kings that go to the front without their courts to command near it (\"current\") against those that stay at court (\"baseline\"):" + versusReport(results, sides));
if (o.remnantPlayHalf && results.length > 0)
  console.log("\nScript kings that fold their remnants into larger armies or disband them (\"current\") against those that leave them standing (\"baseline\"):" + versusReport(results, sides));
if (o.upkeepPlayHalf && results.length > 0)
  console.log("\nScript kings that hold back pay from safe units when the treasury cannot carry the season (\"current\") against those that always pay (\"baseline\"):" + versusReport(results, sides));
if (o.moneyPlayHalf && results.length > 0)
  console.log("\nScript kings that borrow from lenders at court when hard up and repay what is due (\"current\") against those that never do (\"baseline\"):" + versusReport(results, sides));
if (o.authorityPlayHalf && results.length > 0)
  console.log("\nScript kings that give their envoys the seal and ask and grant passage (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.winterPlayHalf && results.length > 0)
  console.log("\nScript kings that strike over the passes in winter (\"current\") against those that never do (\"baseline\"):" + versusReport(results, sides));
if (o.clausePlayHalf && results.length > 0)
  console.log("\nScript kings that act on the clauses they read (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
if (o.planAheadHalf && results.length > 0)
  console.log("\nSleeping script kings that plan ahead (\"current\") against those that do not (\"baseline\"):" + versusReport(results, sides));
console.log(`\n${fmt((Date.now() - started) / 1000, "0.0")}s`);
