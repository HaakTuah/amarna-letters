import { FixedPowers, FirstYearBce, SeasonsPerYear, dateLabel, tier, yearBce, type Power } from "@amarna/engine";
import { GameLog, GameRunner, type LogHeader } from "@amarna/game";
import {
  AnthropicId,
  CostEstimate,
  LocalBridge,
  ModelIds,
  Presets,
  bridgeReady,
  choicesFromHeader,
  leaderModel,
  startProblem,
  type LeaderKind,
  type Preset,
  type SeatChoices,
} from "@amarna/llm";
import { useEffect, useState } from "react";
import { takeResume } from "../ui/update.ts";
import { Emblem } from "../components/Emblem.tsx";
import { ModelPicker, ProvidersPanel, RungsPanel } from "../components/ModelSettings.tsx";
import { session } from "../session/client.ts";
import { choicesOf, estimate, handLimitNeeded, newSettings, randomSeed, usesModels, withChoices, type GameSettings } from "../session/settings.ts";
import { deleteLog, getSessionKey, listLogs, loadLog, setSessionKey, type SavedLog } from "../session/storage.ts";
import { powerName } from "../ui/format.ts";
import { navigate } from "../ui/router.ts";
import { useSession } from "../ui/use-session.ts";

/**
 * The player's API keys, held in memory for this tab only: the Anthropic key (in session storage too if the player asks),
 * and the key of each other provider by its id (memory only).
 */
export const keys: {
  key: string | null;
  remember: boolean;
  others: Record<string, string>;
} = { key: null, remember: false, others: {} };

/** Every key, by provider id, as the engine's worker takes them. */
const allKeys = (anthropic: string | null): Record<string, string> => ({
  // A provider set up with no key typed (a local endpoint) is sent with an empty one.
  ...Object.fromEntries((kept?.providers ?? []).map((p) => [p.id, ""] as const)),
  ...keys.others,
  ...(anthropic !== null && anthropic.trim() !== "" ? { [AnthropicId]: anthropic } : {}),
});

function freshSettings(): GameSettings {
  const s = newSettings();
  const c = choicesOf(s);
  Presets.Free.applyTo(c);
  return withChoices(s, c);
}

/** Whether this app runs on this computer (not the published site): only then can it reach the local bridge. */
const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const shownPresets: readonly Preset[] = isLocal ? [...Presets.all, Presets.Local] : Presets.all;

const kindName = (k: LeaderKind): string =>
  k === "Script" ? "script" : k === "Human" ? "you" : k === "LocalAgent" ? "local agents" : ModelIds.display(leaderModel(k) ?? k);
/** Envoys' or the narrator's choice as the page names it: "script", "template" or the model. */
const jobName = (k: string, none: string): string => (k === none ? none.toLowerCase() : kindName(k));

/** The kings' line: where the small rung plays the king, it names that model, with the king's own model above it. */
const kingsName = (p: Preset): string =>
  p.rungs.plays === "small" && leaderModel(p.leaders) !== null ? `${kindName(p.rungs.small)} (plans: ${kindName(p.leaders)})` : kindName(p.leaders);

const roles = (p: Preset): string =>
  `Kings: ${kingsName(p)} · Envoys: ${jobName(p.characters, "Script")} · Narrator: ${jobName(p.narrator, "Template")}`;

const LeaderOptions: [string, string][] = [
  ["Script", "Script bot"],
  ["Human", "Human (you)"],
  ["Haiku", "Haiku 5.5"],
  ["Sonnet", "Sonnet 5.5"],
  ["Opus", "Opus 5.5"],
];
const CharacterOptions: [string, string][] = [
  ["Script", "Script characters (free; structured press)"],
  ["Haiku", "Haiku 5.5"],
  ["Sonnet", "Sonnet 5.5 (sharper, costs more)"],
];
/** On this computer only: characters played by local agents through the bridge, as kings may be (item 8). */
const LocalCharacterOption: [string, string] = ["LocalAgent", "Local agents (Claude Code)"];
const NarratorOptions: [string, string][] = [
  ["Template", "Template narrator (free)"],
  ["Haiku", "Haiku 5.5"],
  ["Sonnet", "Sonnet 5.5"],
  ["Opus", "Opus 5.5"],
];

const localKings = (c: SeatChoices): Power[] => FixedPowers.filter((p) => c.leaders.get(p) === "LocalAgent");

let kept: GameSettings | null = null;
let budgetTouched = false;

/** The years a table may choose for the median ending, and the middle season of each (1332 BCE: season 44). */
const MedianYears = Array.from({ length: 21 }, (_, i) => FirstYearBce - 4 - i);
const medianSeason = (y: number): number => (FirstYearBce - y) * SeasonsPerYear + 2;

export function Home() {
  const s = useSession();
  const [settings, setSettingsRaw] = useState<GameSettings>(() => kept ?? recost(freshSettings()));
  const [saved, setSaved] = useState<SavedLog[]>([]);
  const [loadedText, setLoadedText] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [loadProblem, setLoadProblem] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [bridge, setBridge] = useState<{ line: string; ok: boolean } | null>(null);
  const [key, setKey] = useState(keys.key ?? "");
  const [remember, setRemember] = useState(keys.remember);

  const setSettings = (next: GameSettings): void => {
    kept = next;
    setSettingsRaw(next);
  };

  useEffect(() => {
    if (keys.key === null) {
      const k = getSessionKey();
      if (k !== null) {
        keys.key = k;
        keys.remember = true;
        setKey(k);
        setRemember(true);
      }
    }
    void listLogs().then(setSaved);
    // Reloaded into a new version from a game (ui/update.ts): back into it, from its last saved season.
    const resume = takeResume();
    if (resume !== null) void loadSaved(resume, true, true);
  }, []);

  const choices = choicesOf(settings);
  const selected = shownPresets.find((p) => p.matches(choices)) ?? null;
  const seat = FixedPowers.find((p) => settings.leaders[p] === "Human") ?? null;
  const est = estimate(settings);

  function recost(next: GameSettings): GameSettings {
    return budgetTouched ? next : { ...next, budgetUsd: CostEstimate.suggestedBudget(estimate(next)) };
  }
  const change = (f: (c: SeatChoices) => void): void => {
    const c = choicesOf(settings);
    f(c);
    setSettings(recost(withChoices(settings, c)));
  };
  const set = <K extends keyof GameSettings>(k: K, v: GameSettings[K]): void => setSettings({ ...settings, [k]: v });
  // The ending sets how long a game runs, and so what it is likely to cost.
  const setEnding = (v: Partial<Pick<GameSettings, "endMedian" | "capped" | "capMin" | "capMax" | "openAge">>): void => setSettings(recost({ ...settings, ...v }));

  const estimateFor = (p: Preset): number => {
    const c = choices.copy();
    p.applyTo(c);
    return CostEstimate.perGame(c);
  };
  const describeFor = (p: Preset): string => {
    const c = choices.copy();
    p.applyTo(c);
    return CostEstimate.describeFor(c);
  };

  const changeSeat = (value: string): void =>
    change((c) => {
      const preset = selected ?? Presets.Free;
      for (const p of FixedPowers) if (c.leaders.get(p) === "Human") c.leaders.set(p, preset.leaders);
      if ((FixedPowers as readonly string[]).includes(value)) c.leaders.set(value as Power, "Human");
    });

  const summary = (): string => {
    const counts = new Map<LeaderKind, number>();
    for (const p of FixedPowers) if (settings.leaders[p] !== "Human") counts.set(settings.leaders[p], (counts.get(settings.leaders[p]) ?? 0) + 1);
    const kings = [...counts].map(([k, n]) => `${n} ${kindName(k)}`);
    return `kings ${kings.join(", ")}; envoys ${jobName(settings.characters, "Script")}; narrator ${jobName(settings.narrator, "Template")}`;
  };

  /** Asks the local bridge whether it runs and keeps a folder for every king played by a local agent. */
  async function bridgeCheck(c: SeatChoices, seed: number | null = null): Promise<{ line: string; ok: boolean; characters: string[] }> {
    // Characters played by local agents need the folders of this game's seed: ids differ from seed to seed.
    const charactersOf = c.characters === "LocalAgent" ? seed : null;
    const status = await LocalBridge.check(c.bridgeAddress, localKings(c), charactersOf);
    const ok = bridgeReady(status);
    const chars = charactersOf !== null ? ` and the ${status.characters.length} characters of seed ${charactersOf}` : "";
    return {
      ok,
      characters: status.characters,
      line: ok ? `The bridge is running and keeps a folder for each of the ${localKings(c).length} kings played by local agents${chars}.` : status.problem,
    };
  }

  function keyReady(): boolean {
    setProblem(null);
    if (!usesModels(settings) || settings.simulateApi) return true;
    const missing = choices.providersInUse.filter((id) => id !== AnthropicId && !choices.providers.some((p) => p.id === id));
    if (missing.length > 0) {
      setProblem(`A seat names the provider ${missing.join(", ")}, which is not set up under "Other providers".`);
      return false;
    }
    if (choices.providersInUse.includes(AnthropicId) && key.trim() === "") {
      setProblem("This setup uses Claude models: enter your Anthropic API key above, or choose Free.");
      return false;
    }
    keys.key = key;
    keys.remember = remember;
    setSessionKey(remember ? key : null);
    return true;
  }

  async function start(): Promise<void> {
    if (!keyReady()) return;
    // An open age has no end: with model-played seats, its spending limit is the table's own, never the default.
    if (settings.openAge && handLimitNeeded(settings) && !budgetTouched) {
      setProblem("An open age has no end, and its model calls none either: set by hand the spending limit at which the game pauses, below, before it begins.");
      return;
    }
    const unpriced = startProblem(choices, settings.budgetUsd, settings.simulateApi);
    if (unpriced !== null) {
      setProblem(unpriced);
      return;
    }
    let characters: string[] = [];
    if (choices.usesLocalAgents) {
      const b = await bridgeCheck(choices, settings.seed);
      if (!b.ok) {
        // Said once, next to the button that was pressed.
        setProblem(b.line);
        setBridge(null);
        return;
      }
      characters = b.characters;
    }
    setStarting(true);
    const game = settings.characters === "LocalAgent" ? { ...settings, bridgeCharacters: characters } : settings;
    setSettings({ ...settings, seed: randomSeed() });
    navigate("play");
    session.start(game, allKeys(keys.key));
    setStarting(false);
  }

  /** `keepId`: a game resumed after an update, saved on under its own id. */
  async function load(text: string, continuePlay: boolean, keepId: string | null = null): Promise<void> {
    setLoadProblem(null);
    let header: LogHeader | null = null;
    try {
      header = GameLog.fromJsonl(text).header;
    } catch {
      // not a log: the game page says so
    }
    // A game saved under other rules cannot be replayed or continued: say so here, next to the buttons, before anything else.
    const old = header !== null ? GameRunner.versionProblem(header) : null;
    if (old !== null) {
      setLoadProblem(old);
      return;
    }
    let characters: string[] = [];
    if (continuePlay && header !== null) {
      const seats = choicesFromHeader(header, settings.providers);
      const missing = seats.providersInUse.filter((id) => id !== AnthropicId && !seats.providers.some((p) => p.id === id));
      if (missing.length > 0) {
        setLoadProblem(`This game used models of ${missing.join(", ")}: set that provider up under "Other providers and prices" above, then continue.`);
        return;
      }
      if (seats.providersInUse.includes(AnthropicId) && (keys.key ?? key).trim() === "") {
        setLoadProblem("This game used Claude models. Choose any preset that needs a key, enter your key above, then continue.");
        return;
      }
      // A saved game with kings played by local agents goes on through the bridge at its usual address.
      if (seats.usesLocalAgents) {
        const b = await bridgeCheck(seats, header.seed);
        if (!b.ok) {
          setLoadProblem(b.line);
          return;
        }
        characters = b.characters;
      }
    }
    navigate("play");
    session.load(text, continuePlay, allKeys(keys.key ?? key), { providers: settings.providers, prices: settings.prices, pauseFallbackShare: settings.pauseFallbackShare, bridgeCharacters: characters }, keepId);
  }

  async function loadSaved(id: string, continuePlay: boolean, resumed = false): Promise<void> {
    const text = await loadLog(id);
    if (text === null) {
      setLoadProblem("That saved game could not be read.");
      return;
    }
    await load(text, continuePlay, resumed ? id : null);
  }

  return (
    <div className="page">
      <h1>Amarna Letters</h1>
      <p className="muted" style={{ maxWidth: "46rem" }}>
        Seven Great Kings of the Late Bronze Age and the city-states between them. The engine enforces movement, combat and gold; every treaty, alliance and betrayal is invented by the players.
        Kings never speak to each other directly: every word travels with an envoy, who has motives of their own.
      </p>

      <div className="card">
        <h2>How do you want to play?</h2>
        <div className="presets" role="radiogroup" aria-label="Game presets">
          {shownPresets.map((p) => {
            const on = selected?.id === p.id;
            const e = estimateFor(p);
            const local = p === Presets.Local;
            const price = local ? "your Claude subscription" : `${describeFor(p)}${e > 0 ? " a game" : ""}`;
            return (
              <button
                key={p.id}
                className={`preset ${on ? "on" : ""}`}
                role="radio"
                aria-checked={on ? "true" : "false"}
                aria-label={`${p.name}: ${price}`}
                onClick={() => change((c) => p.applyTo(c))}
              >
                <span className="preset-head">
                  <strong>{p.name}</strong>
                  {p === Presets.Standard && <span className="pill">recommended</span>}
                  {local && <span className="pill">this computer only</span>}
                </span>
                <span className="preset-models">{roles(p)}</span>
                <span className="preset-text">{p.tagline}</span>
                <span className="preset-foot">
                  <span className="pill">{price}</span>
                  <small className="muted">{local ? "needs the local bridge" : p.needsKey ? "your API key" : "no key needed"}</small>
                </span>
              </button>
            );
          })}
        </div>
        {selected === null && (
          <p className="notice">
            Custom setup: {summary()}. Estimated {CostEstimate.describeFor(choices, settings.endMedian)}
            {est > 0 ? " a game" : ""}.
          </p>
        )}

        <div className="row" style={{ marginTop: ".9rem" }}>
          <label>
            <span className="muted">Your seat</span>
            <select value={seat ?? ""} onChange={(e) => changeSeat(e.target.value)}>
              <option value="">Watch the kings (spectator)</option>
              {FixedPowers.map((p) => (
                <option key={p} value={p}>
                  Play as {powerName(p)} ({tier(p).toLowerCase()})
                </option>
              ))}
            </select>
          </label>
        </div>

        <details className="customize">
          <summary>Customize the table</summary>
          <div className="grid2" style={{ marginTop: ".7rem" }}>
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Power</th>
                    <th>Tier</th>
                    <th>Played by</th>
                  </tr>
                </thead>
                <tbody>
                  {FixedPowers.map((p) => (
                    <tr key={p}>
                      <td>
                        <Emblem power={p} /> {powerName(p)}
                      </td>
                      <td className="muted">{tier(p)}</td>
                      <td>
                        <ModelPicker
                          value={settings.leaders[p]}
                          options={
                            isLocal || settings.leaders[p] === "LocalAgent" ? [...LeaderOptions, ["LocalAgent", "Local agent (Claude Code)"]] : LeaderOptions
                          }
                          onChange={(v) => change((c) => c.leaders.set(p, v))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div className="field">
                <span>Envoys, spies and candidates</span>
                <ModelPicker
                  value={settings.characters}
                  options={isLocal || settings.characters === "LocalAgent" ? [...CharacterOptions, LocalCharacterOption] : CharacterOptions}
                  onChange={(v) => change((c) => (c.characters = v))}
                />
              </div>
              <div className="field">
                <span>Narrator (personas, check reports, chronicles)</span>
                <ModelPicker value={settings.narrator} options={NarratorOptions} onChange={(v) => change((c) => (c.narrator = v))} />
              </div>
              <div className="field">
                <span>How hard model kings think</span>
                <select value={settings.leaderEffort} onChange={(e) => change((c) => (c.leaderEffort = e.target.value))}>
                  <option value="low">Low (cheaper, quicker)</option>
                  <option value="medium">Medium</option>
                  <option value="high">High (deeper, costs more)</option>
                </select>
              </div>
              <div className="row">
                <label>
                  <input type="checkbox" checked={settings.chronicles} onChange={(e) => set("chronicles", e.target.checked)} /> Chronicles at the end
                </label>
                <label>
                  <input type="checkbox" checked={settings.customsPrimer} onChange={(e) => set("customsPrimer", e.target.checked)} /> Customs primer for kings
                </label>
                <label>
                  <input type="checkbox" checked={settings.sharedVictory} onChange={(e) => set("sharedVictory", e.target.checked)} /> Shared victory for sworn
                  allies
                </label>
                <label title="A player whose kingdom falls watches the rest of the game seeing everything. Off, a fallen player watches with what his kingdom knew when it fell, so he cannot pass hidden facts to a friend still playing.">
                  <input type="checkbox" checked={settings.fallenSeeAll} onChange={(e) => set("fallenSeeAll", e.target.checked)} /> A fallen player watches in
                  god view
                </label>
              </div>
              <div className="row" style={{ marginTop: ".6rem" }}>
                <label title="An age with no end: no last season and no cap. Kings are told the age has no end. It makes model calls with no end, so the game pauses at the spending limit below.">
                  <input type="checkbox" checked={settings.openAge} onChange={(e) => setEnding({ openAge: e.target.checked })} /> An open age, with no end
                </label>
                {!settings.openAge && (
                  <>
                    <label title="Any season may be the last, from the first, and the chance grows every season: half of all ages have ended by this year. Kings are told the rule in words only.">
                      Half of all ages end by{" "}
                      <select value={yearBce(settings.endMedian)} onChange={(e) => setEnding({ endMedian: medianSeason(Number(e.target.value)) })}>
                        {MedianYears.map((y) => (
                          <option key={y} value={y}>
                            {y} BCE{y === yearBce(newSettings().endMedian) ? " (the archive's end)" : ""}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label title="The last possible season, drawn in secret at the start from this range, so nobody at the table knows it. A range of one season is a known cap.">
                      <input type="checkbox" checked={settings.capped} onChange={(e) => setEnding({ capped: e.target.checked })} /> A hard cap, from
                    </label>
                    {settings.capped && (
                      <label title={`${dateLabel(Math.max(1, settings.capMin))} to ${dateLabel(Math.max(1, settings.capMax))}`}>
                        <input type="number" min="1" max="300" value={settings.capMin} onChange={(e) => setEnding({ capMin: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} /> to{" "}
                        <input type="number" min="1" max="300" value={settings.capMax} onChange={(e) => setEnding({ capMax: Math.max(1, Math.floor(Number(e.target.value) || 1)) })} /> seasons
                      </label>
                    )}
                  </>
                )}
              </div>
              <div className="row" style={{ marginTop: ".6rem" }}>
                <label title="The world still moves every season; after its orders a model king sleeps, and is called again only when something concerns it: it never chooses when it wakes. Off, every king is called every season. Script and human kings play every season.">
                  <input type="checkbox" checked={settings.sleepingSeats} onChange={(e) => set("sleepingSeats", e.target.checked)} /> Sleeping seats for model
                  kings
                </label>
                {settings.sleepingSeats && (
                  <label title="A safety net only: a sleeping king is woken after this many seasons at the latest. The kings are never told it.">
                    Hidden safety cap on sleep (seasons){" "}
                    <input type="number" min="1" max="30" value={settings.maxSleep} onChange={(e) => set("maxSleep", Number(e.target.value) || 1)} />
                  </label>
                )}
              </div>
              <div className="row" style={{ marginTop: ".6rem" }}>
                <label>
                  Envoys per season{" "}
                  <input type="number" min="1" max="6" value={settings.messagesPerTurn} onChange={(e) => set("messagesPerTurn", Number(e.target.value) || 1)} />
                </label>
                <label>
                  Seed <input type="number" min="1" value={settings.seed} onChange={(e) => set("seed", Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
                </label>
              </div>
              <label
                style={{ marginTop: ".6rem" }}
                title="A model call that fails or does not fit is played by a script in its place, and the viewer counts these fallbacks. Past this share of a season's calls the game pauses, so a broken call cannot quietly turn a model game into a script game. 0 never pauses."
              >
                Pause when more than{" "}
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={Math.round(settings.pauseFallbackShare * 100)}
                  onChange={(e) => set("pauseFallbackShare", Math.min(Math.max(Number(e.target.value) || 0, 0), 100) / 100)}
                />
                % of a season's model calls fall back to scripts
              </label>
              <label style={{ marginTop: ".6rem" }}>
                <input type="checkbox" checked={settings.simulateApi} onChange={(e) => set("simulateApi", e.target.checked)} />
                Simulate the API (canned replies, nothing leaves the browser, no cost: for testing the app)
              </label>
            </div>
          </div>
          <RungsPanel choices={choices} change={change} />
          <ProvidersPanel
            choices={choices}
            keys={keys.others}
            onKey={(id, k) => {
              keys.others[id] = k;
              setSettings({ ...settings });
            }}
            change={change}
          />
        </details>

        {choices.usesLocalAgents && (
          <div className="section">
            <h3>Kings played by Claude agents on this computer</h3>
            <p className="muted" style={{ maxWidth: "46rem" }}>
              Local play: each king marked "local agent" is answered by its own guarded agent in a Claude Code session on this computer, on your Claude
              subscription, through the local bridge. Start the bridge (<code>node sim/bridge.js</code>) and the session (<code>docs/PLAY-PROMPT.md</code>)
              first: the steps are under "Local play" in <code>sim/README.md</code>. It works only when this app runs on your computer, not on the published
              site. Kings sleep after their orders until something concerns them, so a season takes minutes when they are woken. Envoys and the narrator stay
              scripts. For your own games only.
            </p>
            <div className="row">
              <label>
                Bridge{" "}
                <input
                  style={{ width: "16rem" }}
                  value={settings.bridgeAddress}
                  onChange={(e) => {
                    set("bridgeAddress", e.target.value);
                    setBridge(null);
                  }}
                />
              </label>
              <label title="After this, the script king stands in for that one decision.">
                Wait for an agent up to{" "}
                <input
                  type="number"
                  min="1"
                  max="600"
                  value={settings.localAgentMinutes}
                  onChange={(e) => set("localAgentMinutes", Number(e.target.value) || 1)}
                />{" "}
                minutes
              </label>
              <button className="small" onClick={() => void bridgeCheck(choices).then(setBridge)}>
                Check the bridge
              </button>
            </div>
            {bridge !== null && <p className={bridge.ok ? "notice" : "notice error"}>{bridge.line}</p>}
          </div>
        )}

        {usesModels(settings) && !settings.simulateApi && (
          <div className="section">
            {choices.providersInUse.includes(AnthropicId) && (
              <>
                <h3>Your Anthropic API key</h3>
                <p className="muted">
                  Model calls go straight from this page to the Anthropic API with your own key. The key stays in this tab's memory (and, if you tick the box,
                  in this tab's session storage); it is never written to local storage, a cookie or any server. Use a dedicated key with a spend limit set in
                  the Anthropic Console.
                </p>
                <div className="row">
                  <input
                    type="password"
                    style={{ width: "28rem" }}
                    placeholder="sk-ant-..."
                    autoComplete="off"
                    value={key}
                    onChange={(e) => {
                      setKey(e.target.value);
                      keys.key = e.target.value;
                    }}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => {
                        setRemember(e.target.checked);
                        keys.remember = e.target.checked;
                      }}
                    />{" "}
                    Keep for this tab
                  </label>
                </div>
              </>
            )}
            <p style={{ marginTop: ".6rem" }}>
              Estimated cost: <strong>{CostEstimate.describeFor(choices, settings.endMedian)}</strong> for {settings.openAge ? `the first ${settings.endMedian} seasons of an open age, which has no end` : `a game of median length (${settings.endMedian} seasons)`} (a rough figure: the meter
              in the game shows the real spend).{" "}
              <label>
                The game pauses at $
                <input
                  type="number"
                  min="0.5"
                  step="0.5"
                  value={settings.budgetUsd}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (!Number.isFinite(v)) return;
                    budgetTouched = true;
                    set("budgetUsd", Math.max(0.5, v));
                  }}
                />
              </label>
            </p>
          </div>
        )}

        {problem !== null && <div className="notice error">{problem}</div>}
        <div className="row" style={{ marginTop: ".8rem" }}>
          <button className="primary" disabled={starting} onClick={() => void start()}>
            Begin the age
          </button>
          {s.live.hasRunner && <button onClick={() => navigate("play")}>Return to the current game</button>}
        </div>
      </div>

      <div className="card">
        <h2>Saved games and replays</h2>
        <p className="muted">Every game is saved in this browser as an event log. A log replays the game exactly, season by season.</p>
        <div className="row" style={{ marginBottom: ".6rem" }}>
          <input
            type="file"
            accept=".jsonl,.json,.txt"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void f.text().then(setLoadedText);
            }}
          />
          {loadedText !== null && (
            <>
              <button onClick={() => void load(loadedText, false)}>Watch replay</button>
              <button onClick={() => void load(loadedText, true)}>Continue playing</button>
            </>
          )}
        </div>
        {loadProblem !== null && <div className="notice error">{loadProblem}</div>}
        {saved.length === 0 ? (
          <p className="muted">No saved games yet.</p>
        ) : (
          <table>
            <tbody>
              {saved.slice(0, 15).map((x) => (
                <tr key={x.id}>
                  <td>
                    {x.meta}
                    <br />
                    <small>{localStamp(x.saved)}</small>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <button className="small" onClick={() => void loadSaved(x.id, false)}>
                      Replay
                    </button>{" "}
                    <button className="small" onClick={() => void loadSaved(x.id, true)}>
                      Continue
                    </button>{" "}
                    <button className="small danger" onClick={() => void deleteLog(x.id).then(listLogs).then(setSaved)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function localStamp(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
