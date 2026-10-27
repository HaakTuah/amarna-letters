import { AllPowers, tier, type Power } from "@amarna/engine";
import { GameLog, GameRunner, type LogHeader } from "@amarna/game";
import { CostEstimate, LocalBridge, Presets, bridgeReady, choicesFromHeader, type CharacterKind, type LeaderKind, type NarratorKind, type Preset, type SeatChoices } from "@amarna/llm";
import { useEffect, useState } from "react";
import { Emblem } from "../components/Emblem.tsx";
import { session } from "../session/client.ts";
import { choicesOf, estimate, newSettings, randomSeed, usesModels, withChoices, type GameSettings } from "../session/settings.ts";
import { deleteLog, getSessionKey, listLogs, loadLog, setSessionKey, type SavedLog } from "../session/storage.ts";
import { powerName } from "../ui/format.ts";
import { navigate } from "../ui/router.ts";
import { useSession } from "../ui/use-session.ts";

/** The player's API key, held in memory for this tab only. */
export const keys: { key: string | null; remember: boolean } = { key: null, remember: false };

function freshSettings(): GameSettings {
  const s = newSettings();
  const c = choicesOf(s);
  Presets.Free.applyTo(c);
  return withChoices(s, c);
}

/** Whether this app runs on this computer (not the published site): only then can it reach the local bridge. */
const isLocal = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
const shownPresets: readonly Preset[] = isLocal ? [...Presets.all, Presets.Local] : Presets.all;

const kindName = (k: LeaderKind): string => (k === "Script" ? "script" : k === "Human" ? "you" : k === "LocalAgent" ? "local agents" : `${k} 5.5`);

const roles = (p: Preset): string =>
  `Kings: ${kindName(p.leaders)} · Envoys: ${p.characters === "Script" ? "script" : `${p.characters} 5.5`} · Narrator: ${p.narrator === "Template" ? "template" : `${p.narrator} 5.5`}`;

const localKings = (c: SeatChoices): Power[] => AllPowers.filter((p) => c.leaders.get(p) === "LocalAgent");

let kept: GameSettings | null = null;
let budgetTouched = false;

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
  }, []);

  const choices = choicesOf(settings);
  const selected = shownPresets.find((p) => p.matches(choices)) ?? null;
  const seat = AllPowers.find((p) => settings.leaders[p] === "Human") ?? null;
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

  const estimateFor = (p: Preset): number => {
    const c = choices.copy();
    p.applyTo(c);
    return CostEstimate.perGame(c);
  };

  const changeSeat = (value: string): void =>
    change((c) => {
      const preset = selected ?? Presets.Free;
      for (const p of AllPowers) if (c.leaders.get(p) === "Human") c.leaders.set(p, preset.leaders);
      if ((AllPowers as readonly string[]).includes(value)) c.leaders.set(value as Power, "Human");
    });

  const summary = (): string => {
    const counts = new Map<LeaderKind, number>();
    for (const p of AllPowers) if (settings.leaders[p] !== "Human") counts.set(settings.leaders[p], (counts.get(settings.leaders[p]) ?? 0) + 1);
    const kings = [...counts].map(([k, n]) => `${n} ${kindName(k)}`);
    return `kings ${kings.join(", ")}; envoys ${settings.characters.toLowerCase()}; narrator ${settings.narrator.toLowerCase()}`;
  };

  /** Asks the local bridge whether it runs and keeps a folder for every king played by a local agent. */
  async function bridgeCheck(c: SeatChoices): Promise<{ line: string; ok: boolean }> {
    const status = await LocalBridge.check(c.bridgeAddress, localKings(c));
    const ok = bridgeReady(status);
    return { ok, line: ok ? `The bridge is running and keeps a folder for each of the ${localKings(c).length} kings played by local agents.` : status.problem };
  }

  function keyReady(): boolean {
    setProblem(null);
    if (!usesModels(settings) || settings.simulateApi) return true;
    if (key.trim() === "") {
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
    if (choices.usesLocalAgents) {
      const b = await bridgeCheck(choices);
      if (!b.ok) {
        // Said once, next to the button that was pressed.
        setProblem(b.line);
        setBridge(null);
        return;
      }
    }
    setStarting(true);
    const game = settings;
    setSettings({ ...settings, seed: randomSeed() });
    navigate("play");
    session.start(game, keys.key);
    setStarting(false);
  }

  async function load(text: string, continuePlay: boolean): Promise<void> {
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
    if (continuePlay && header !== null) {
      const seats = choicesFromHeader(header);
      if (seats.usesModels && (keys.key ?? key).trim() === "") {
        setLoadProblem("This game used Claude models. Choose any preset that needs a key, enter your key above, then continue.");
        return;
      }
      // A saved game with kings played by local agents goes on through the bridge at its usual address.
      if (seats.usesLocalAgents) {
        const b = await bridgeCheck(seats);
        if (!b.ok) {
          setLoadProblem(b.line);
          return;
        }
      }
    }
    navigate("play");
    session.load(text, continuePlay, keys.key ?? (key.trim() === "" ? null : key));
  }

  async function loadSaved(id: string, continuePlay: boolean): Promise<void> {
    const text = await loadLog(id);
    if (text === null) {
      setLoadProblem("That saved game could not be read.");
      return;
    }
    await load(text, continuePlay);
  }

  return (
    <div className="page">
      <h1>Amarna Letters</h1>
      <p className="muted" style={{ maxWidth: "46rem" }}>
        Seven Great Kings of the Late Bronze Age. The engine enforces movement, combat and gold; every treaty, alliance and betrayal is invented by the
        players. Kings never speak to each other directly: every word travels with an envoy, who has motives of their own.
      </p>

      <div className="card">
        <h2>How do you want to play?</h2>
        <div className="presets" role="radiogroup" aria-label="Game presets">
          {shownPresets.map((p) => {
            const on = selected?.id === p.id;
            const e = estimateFor(p);
            const local = p === Presets.Local;
            const price = local ? "your Claude subscription" : `${CostEstimate.describe(e)}${e > 0 ? " a game" : ""}`;
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
            Custom setup: {summary()}. Estimated {CostEstimate.describe(est)}
            {est > 0 ? " a game" : ""}.
          </p>
        )}

        <div className="row" style={{ marginTop: ".9rem" }}>
          <label>
            <span className="muted">Your seat</span>
            <select value={seat ?? ""} onChange={(e) => changeSeat(e.target.value)}>
              <option value="">Watch the kings (spectator)</option>
              {AllPowers.map((p) => (
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
                  {AllPowers.map((p) => (
                    <tr key={p}>
                      <td>
                        <Emblem power={p} /> {powerName(p)}
                      </td>
                      <td className="muted">{tier(p)}</td>
                      <td>
                        <select value={settings.leaders[p]} onChange={(e) => change((c) => c.leaders.set(p, e.target.value as LeaderKind))}>
                          <option value="Script">Script bot</option>
                          <option value="Human">Human (you)</option>
                          <option value="Haiku">Haiku 5.5</option>
                          <option value="Sonnet">Sonnet 5.5</option>
                          <option value="Opus">Opus 5.5</option>
                          {(isLocal || settings.leaders[p] === "LocalAgent") && <option value="LocalAgent">Local agent (Claude Code)</option>}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div className="field">
                <span>Envoys, spies and candidates</span>
                <select value={settings.characters} onChange={(e) => change((c) => (c.characters = e.target.value as CharacterKind))}>
                  <option value="Script">Script characters (free)</option>
                  <option value="Haiku">Haiku 5.5</option>
                  <option value="Sonnet">Sonnet 5.5 (sharper, costs more)</option>
                </select>
              </div>
              <div className="field">
                <span>Narrator (personas, check reports, chronicles)</span>
                <select value={settings.narrator} onChange={(e) => change((c) => (c.narrator = e.target.value as NarratorKind))}>
                  <option value="Template">Template narrator (free)</option>
                  <option value="Haiku">Haiku 5.5</option>
                  <option value="Sonnet">Sonnet 5.5</option>
                  <option value="Opus">Opus 5.5</option>
                </select>
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
                  <input type="checkbox" checked={settings.sharedVictory} onChange={(e) => set("sharedVictory", e.target.checked)} /> Shared victory for sworn allies
                </label>
                <label title="A player whose kingdom falls watches the rest of the game seeing everything. Off, a fallen player watches with what his kingdom knew when it fell, so he cannot pass hidden facts to a friend still playing.">
                  <input type="checkbox" checked={settings.fallenSeeAll} onChange={(e) => set("fallenSeeAll", e.target.checked)} /> A fallen player watches in god view
                </label>
              </div>
              <div className="row" style={{ marginTop: ".6rem" }}>
                <label title="The world still moves every season; after its orders a model king sleeps, and is called again only when something concerns it: it never chooses when it wakes. Off, every king is called every season. Script and human kings play every season.">
                  <input type="checkbox" checked={settings.sleepingSeats} onChange={(e) => set("sleepingSeats", e.target.checked)} /> Sleeping seats for model kings
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
              <label style={{ marginTop: ".6rem" }}>
                <input type="checkbox" checked={settings.simulateApi} onChange={(e) => set("simulateApi", e.target.checked)} />
                Simulate the API (canned replies, nothing leaves the browser, no cost: for testing the app)
              </label>
            </div>
          </div>
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
                <input type="number" min="1" max="600" value={settings.localAgentMinutes} onChange={(e) => set("localAgentMinutes", Number(e.target.value) || 1)} />{" "}
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
            <h3>Your Anthropic API key</h3>
            <p className="muted">
              Model calls go straight from this page to the Anthropic API with your own key. The key stays in this tab's memory (and, if you tick the box,
              in this tab's session storage); it is never written to local storage, a cookie or any server. Use a dedicated key with a spend limit set in the
              Anthropic Console.
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
            <p style={{ marginTop: ".6rem" }}>
              Estimated cost: <strong>{CostEstimate.describe(est)}</strong> for a typical {CostEstimate.TypicalSeasons}-season game (a rough figure: the
              meter in the game shows the real spend).{" "}
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
                    <button
                      className="small danger"
                      onClick={() =>
                        void deleteLog(x.id)
                          .then(listLogs)
                          .then(setSaved)
                      }
                    >
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
