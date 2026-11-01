import { AllPowers, TurnEngine, Views, Wealth, courtDecided, isAlive, landGrowth, ledger, openingTroops, openings, ownedBy, shortDate, type GameState, type Power } from "@amarna/engine";
import { highlights, temperament } from "@amarna/game";
import { color, powerName, shekels, when } from "../ui/format.ts";
import { Emblem } from "./Emblem.tsx";
import { useMemo } from "react";

const X = (turn: number, last: number, w: number): number => (last <= 1 ? 0 : ((turn - 1) * w) / (last - 1));
const Y = (g: number, max: number, h: number): number => h - (g / max) * h + 4;
const F = (v: number): string => v.toFixed(1);

/** Who stands where: growth, land, the richest characters at the end, the opening positions and (in god view) the kings. */
export function StandingsPanel({ state, viewer, seats }: { state: GameState; viewer: Power | null; seats: Record<string, string> | null }) {
  const engine = new TurnEngine(state);
  const latest = state.scores.length === 0 ? 0 : Math.max(...state.scores.map((s) => s.turn));
  const known = viewer === null;
  // The estimate every court can make from who holds what: the same figures a model king reads on its LAND STANDINGS line.
  // For a seat, by the holders its court knows (its seat view's owner, dated by word), never the true map: distant
  // changes of hands reach it as late as they reach its court, as on its own standings line.
  const seatView = useMemo(() => (known || viewer === null ? null : Views.for(state, viewer)), [state, viewer, known]);
  const land = new Map(
    (seatView === null ? Views.landStandings(state.owner, state.eliminated) : Views.landStandings(seatView.owner, seatView.fallen)).map((x) => [x.power, x]),
  );
  // A seat sees its own strength and gold by its ledger (unassayed gold at its weight), never the true figures.
  const growth = (p: Power): number => {
    if (known) return engine.growth(p);
    const start = state.startStrength.getOrDefault(p, 0);
    return start > 0 && isAlive(state, p) ? engine.ledgerStrength(p) / start : 0;
  };
  const order = [...AllPowers].sort((a, b) => {
    const k = (p: Power): number => (known ? engine.growth(p) : land.get(p)!.fallen ? -1 : landGrowth(land.get(p)!));
    return k(b) - k(a);
  });

  return (
    <>
      <h3>Standings</h3>
      <p className="muted">
        Each power finishes as high as it can: the final score blends its size (its wealth against the largest realm's) and its performance (its growth
        ranked among the results of powers that started where it did), and the highest score wins. {known ? "" : "You see only your own figures; rivals' treasuries are private."} The
        land-yield ratio is what any court can reckon from who holds what: the yield of the land a power holds now over its homeland's yield at the start.
        It is not growth, which counts treasuries and what people and men hold too, against a starting strength that includes them.
      </p>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Power</th>
              <th title="The yield of the land held now over the homeland's at the start: not growth">
                Land yield<span className="sr"> (not growth)</span>
              </th>
              <th>Growth</th>
              <th>Lands</th>
              <th>Units</th>
              <th>Gold</th>
            </tr>
          </thead>
          <tbody>
            {order.map((p) => {
              const mine = known || p === viewer;
              const l = land.get(p)!;
              const t = state.treasuries.get(p);
              return (
                <tr key={p}>
                  <td>
                    <Emblem power={p} /> {powerName(p)} {(seatView === null ? isAlive(state, p) : !seatView.fallen.includes(p)) ? "" : "(fallen)"}
                  </td>
                  <td>
                    {l.fallen ? (
                      "-"
                    ) : (
                      <>
                        {landGrowth(l).toFixed(2)}
                        <span className="muted sub hide-sm">
                          ({l.yield} of {l.startYield})
                        </span>
                      </>
                    )}
                  </td>
                  <td>{mine ? growth(p).toFixed(2) : "?"}</td>
                  <td>{seatView === null ? ownedBy(state, p).length : [...seatView.owner.values()].filter((o) => o === p).length}</td>
                  <td>{mine ? String(state.units.filter((u) => u.power === p).length) : "?"}</td>
                  <td className="nowrap">{mine ? shekels(known ? t.gold : ledger(t)) : "?"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {state.ended && (
        // The score that decided, with size and performance beside it (item 11e), shown to every viewer once the age has ended.
        <>
          <h4 style={{ marginTop: "1rem" }}>The final score</h4>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>Place</th>
                  <th>Power</th>
                  <th>Score</th>
                  <th>Size</th>
                  <th>Performance</th>
                </tr>
              </thead>
              <tbody>
                {engine.finalScores().map((x, i) => (
                  <tr key={x.power}>
                    <td>{i + 1}</td>
                    <td>
                      <Emblem power={x.power} /> {powerName(x.power)}
                    </td>
                    <td>{x.score.toFixed(2)}</td>
                    <td>{x.size.toFixed(2)}</td>
                    <td>{x.performance.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {state.ended && (
        // Shown once the age has ended, to every viewer: during play a character knows its own wealth, never the ranking.
        <>
          <h4 style={{ marginTop: "1rem" }}>The richest characters</h4>
          <p className="muted">
            Beside the kings' standings, the people of the age ranked by their wealth: the second game, played under the kings', in which the greedy have
            a victory of their own. {Wealth.WhatCounts}
          </p>
          <div className="tablewrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Character</th>
                  <th>At the end</th>
                  <th>Wealth</th>
                  <th>Purse</th>
                  <th>Hoard</th>
                  <th>Where the gold came from</th>
                </tr>
              </thead>
              <tbody>
                {Wealth.ranking(state).map((w, i) => (
                  <tr key={w.character.id}>
                    <td>{i + 1}</td>
                    <td>
                      {w.character.name} <span className="muted">of {w.character.origin}</span>
                    </td>
                    <td>{Wealth.standing(w.character)}</td>
                    <td>{shekels(w.total)}</td>
                    <td>{shekels(w.purse)}</td>
                    <td>{shekels(w.hoard)}</td>
                    <td>{Wealth.sources(w.character.earned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h4 style={{ marginTop: "1rem" }}>Opening positions (known to every court)</h4>
      <p className="muted">
        Each king began with these troops and this treasury, holding its whole homeland. Its starting strength is {state.config.provinceWeight} × what its
        homeland produces in a season (its harvest at the price of grain, plus its mines' gold) + its treasury + what its people and
        men hold, and its growth is measured against it.
      </p>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Power</th>
              <th>Opening troops</th>
              <th>Treasury</th>
              <th title="What its homeland produces in a season: its harvest at the price of grain, plus its mines' gold, in shekels">Homeland's worth a season</th>
              <th>Starting strength</th>
            </tr>
          </thead>
          <tbody>
            {openings(state.config).map((o) => (
              <tr key={o.power}>
                <td>
                  <Emblem power={o.power} /> {powerName(o.power)}
                </td>
                <td>{openingTroops(o)}</td>
                <td>{o.gold} shekels</td>
                <td>{o.homelandYield}</td>
                <td>{o.strength}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {known && (
        <>
          <h4 style={{ marginTop: "1rem" }}>The kings</h4>
          <p className="muted">
            Script kings play by temperament: each power has its own, varied a little in every game. A model king falls back on the same script temperament
            whenever a call to the model fails.
          </p>
          <ul className="kings">
            {AllPowers.map((p) => {
              const seat = seats?.[p] ?? "";
              // The script seat's temperament, drawn from its own seat seed, derived from the game's seed as the seat derives it.
              const t = temperament(p, state.seed);
              const sleep = state.config.sleepingSeats ? state.sleep.tryGet(p) : undefined;
              return (
                <li key={p}>
                  <Emblem power={p} />
                  <strong>{powerName(p)}</strong> <span className="muted">{seat}</span>
                  {seat !== "Human" && (
                    <div>
                      {seat.endsWith("leader") ? "Stand-in: " : ""}
                      <em>{t.epithet}</em> ({highlights(t).join(", ")}). <span className="muted">{t.description}</span>
                    </div>
                  )}
                  {sleep !== undefined && <div className="muted">{sleepSummary(sleep)}</div>}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {known && latest > 0 && <GrowthChart state={state} latest={latest} viewer={viewer} />}
    </>
  );
}

function sleepSummary(sleep: NonNullable<ReturnType<GameState["sleep"]["tryGet"]>>): string {
  const spells = sleep.history.length;
  const lengths = sleep.history.filter((h) => h.wokeAt > 0).map((h) => h.wokeAt - h.from);
  const woke = sleep.history.filter((h) => h.wokeAt > 0);
  const last = woke.length > 0 ? woke[woke.length - 1] : null;
  const stood = sleep.courts.filter((c) => !courtDecided(c)).length;
  const first = sleep.asleep ? `Asleep since ${when(sleep.lastCalled + 1, null)}, wakes by ${when(sleep.wakeAt, null)} at the latest.` : "Awake.";
  const second =
    lengths.length > 0
      ? `Has slept ${lengths.length} time${lengths.length === 1 ? "" : "s"}, for ${lengths.join(", ")} season${lengths.length === 1 && lengths[0] === 1 ? "" : "s"}; last woken in ${when(last!.wokeAt, null)} by: ${last!.reasons.join("; ")}.`
      : spells > 0
        ? "Sleeping for the first time."
        : "Has not slept yet.";
  const third =
    sleep.courts.length > 0
      ? `Held court with its orders standing ${sleep.courts.length} time${sleep.courts.length === 1 ? "" : "s"}, reopening them ${sleep.courts.filter((c) => c.reopened).length}${stood > 0 ? `; asked for orders after a failed call ${stood}` : ""}.`
      : "";
  return `${first} ${second} ${third}`;
}

function GrowthChart({ state, latest, viewer }: { state: GameState; latest: number; viewer: Power | null }) {
  const max = Math.max(1.5, ...state.scores.map((s) => s.growth));
  const w = 600;
  const h = 200;
  return (
    <>
      <h4 style={{ marginTop: "1rem" }}>Growth over time</h4>
      <svg viewBox={`0 0 ${w} ${h + 20}`} style={{ width: "100%", height: "auto" }} role="img" aria-label="Growth of each power by turn">
        <line x1="0" y1={Y(1, max, h)} x2={w} y2={Y(1, max, h)} stroke="var(--line)" strokeDasharray="4 4" />
        <text x="2" y={Y(1, max, h) - 4} fontSize="11" fill="var(--muted)">
          start
        </text>
        {AllPowers.map((p) => {
          const rows = state.scores.filter((s) => s.power === p).sort((a, b) => a.turn - b.turn);
          const pts = rows.map((r) => `${F(X(r.turn, latest, w))},${F(Y(r.growth, max, h))}`).join(" ");
          return <polyline key={p} points={pts} fill="none" stroke={color(p)} strokeWidth="2.2" />;
        })}
        <text x="0" y={h + 16} fontSize="11" fill="var(--muted)">
          {shortDate(1)}
        </text>
        <text x={w} y={h + 16} fontSize="11" fill="var(--muted)" textAnchor="end">
          {when(latest, viewer)}
        </text>
      </svg>
      <div className="row">
        {AllPowers.map((p) => (
          <span className="pill" key={p}>
            <Emblem power={p} />
            {powerName(p)}
          </span>
        ))}
      </div>
    </>
  );
}
