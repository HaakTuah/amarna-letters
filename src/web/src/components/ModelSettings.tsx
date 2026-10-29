/**
 * Models are settings ("Built to outlive its models"): each job names any model, and a table may set up other providers
 * (any OpenAI-compatible endpoint, a local model's included) and set the price of a model the game does not know.
 */
import { FixedPowers } from "@amarna/engine";
import { CostEstimate, ModelIds, leaderModel, type PriceSetting, type ProviderSetting, type SeatChoices, type SpendMode } from "@amarna/llm";
import { useState } from "react";

const Other = "__other__";

/** A job's choice: the usual ones, or any model, typed as "claude-..." or "<provider>:<model>". */
export function ModelPicker(props: { value: string; options: [string, string][]; onChange: (v: string) => void }) {
  const known = props.options.some(([v]) => v === props.value);
  const [typing, setTyping] = useState(!known);
  const other = typing || !known;
  return (
    <span className="model-picker">
      <select
        value={other ? Other : props.value}
        onChange={(e) => {
          if (e.target.value === Other) setTyping(true);
          else {
            setTyping(false);
            props.onChange(e.target.value);
          }
        }}
      >
        {props.options.map(([v, label]) => (
          <option key={v} value={v}>
            {label}
          </option>
        ))}
        <option value={Other}>Other model…</option>
      </select>
      {other && (
        <input
          style={{ width: "13rem" }}
          placeholder="claude-... or provider:model"
          title="Any model: an Anthropic model by its id, or provider:model for a provider set up below."
          defaultValue={known ? "" : props.value}
          onBlur={(e) => e.target.value.trim() !== "" && props.onChange(e.target.value.trim())}
        />
      )}
    </span>
  );
}

/** Providers other than Anthropic, each with its key (memory only), and prices for the models in use that have none. */
export function ProvidersPanel(props: {
  choices: SeatChoices;
  keys: Record<string, string>;
  onKey: (id: string, key: string) => void;
  change: (f: (c: SeatChoices) => void) => void;
}) {
  const { choices, change } = props;
  const unpriced = CostEstimate.unpriced(choices);
  const setProvider = (i: number, p: ProviderSetting | null): void =>
    change((c) => {
      if (p === null) c.providers.splice(i, 1);
      else c.providers[i] = p;
    });
  const setPrice = (model: string, k: number, v: number): void =>
    change((c) => {
      const now: PriceSetting = c.prices[model] ?? [0, 0, 0];
      const next: PriceSetting = [...now];
      next[k] = v;
      c.prices[model] = next;
    });
  return (
    <div className="section">
      <h3>Other providers and prices</h3>
      <p className="muted" style={{ maxWidth: "46rem" }}>
        A seat may name any model: an Anthropic model by its id, or <code>provider:model</code> for a provider set up here, with an OpenAI-compatible endpoint
        (another provider's API, or a local model's, such as <code>http://localhost:11434/v1</code>). Each provider's key stays in this tab's memory only; a
        local endpoint needs none. A provider that refuses calls from a browser can still serve the batch runner.
      </p>
      {choices.providers.map((p, i) => (
        <div className="row" key={i}>
          <label>
            Id <input style={{ width: "7rem" }} value={p.id} onChange={(e) => setProvider(i, { ...p, id: e.target.value.trim() })} />
          </label>
          <label>
            Endpoint <input style={{ width: "18rem" }} value={p.baseUrl} onChange={(e) => setProvider(i, { ...p, baseUrl: e.target.value.trim() })} />
          </label>
          <label>
            Key{" "}
            <input
              type="password"
              autoComplete="off"
              style={{ width: "12rem" }}
              value={props.keys[p.id] ?? ""}
              onChange={(e) => props.onKey(p.id, e.target.value)}
            />
          </label>
          <button className="small" onClick={() => setProvider(i, null)}>
            Remove
          </button>
        </div>
      ))}
      <button className="small" onClick={() => change((c) => c.providers.push({ id: `p${c.providers.length + 1}`, baseUrl: "http://localhost:11434/v1" }))}>
        Add a provider
      </button>
      {unpriced.length > 0 && (
        <p className="notice" style={{ marginTop: ".6rem" }}>
          No price is set for {unpriced.map(ModelIds.display).join(", ")}: its cost shows as unknown, never as free, and the game does not start with a
          spending limit until you set one below (0 for a free local model).
        </p>
      )}
      {choices.models
        .filter((m) => unpriced.includes(m) || choices.prices[m] !== undefined)
        .map((m) => (
          <div className="row" key={m}>
            <span>{ModelIds.display(m)}, dollars per million tokens:</span>
            {["input", "output", "cache read"].map((what, k) => (
              <label key={what}>
                {what}{" "}
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={{ width: "5rem" }}
                  value={choices.prices[m]?.[k] ?? 0}
                  onChange={(e) => setPrice(m, k, Number(e.target.value) || 0)}
                />
              </label>
            ))}
          </div>
        ))}
    </div>
  );
}

const RungOptions: [string, string][] = [
  ["Haiku", "Haiku 5.5"],
  ["Sonnet", "Sonnet 5.5"],
  ["Opus", "Opus 5.5"],
  ["Off", "Off"],
];

/**
 * Who decides ("Every model is the table's choice", "Minds follow what is at stake"): each job is a ladder of the script,
 * a small model and a large one. The kings' small rung (routine audiences, light alerts, the words of standing answers),
 * each seat's own, who plays a woken king, the characters' large rung, planning, and how the game spends.
 */
export function RungsPanel(props: { choices: SeatChoices; change: (f: (c: SeatChoices) => void) => void }) {
  const { choices, change } = props;
  const sp = choices.spending;
  const kings = FixedPowers.filter((p) => leaderModel(choices.leaders.get(p)) !== null);
  if (!choices.usesModels) return null;
  return (
    <div className="section">
      <h3>Who decides</h3>
      <p className="muted" style={{ maxWidth: "46rem" }}>
        Every job is a ladder: the script, a small model and a large one. Only a king's own model commits him: a smaller one answers what is routine and
        passes anything weighty up, or asks the larger one's counsel from a brief. No king is ever told which of them decided; the message trail shows it.
      </p>
      <div className="grid2">
        <div>
          <div className="field" title="Answers routine envoys for a sleeping king, reads the news that reaches him and wakes him when it might matter, and words his standing answers. Off: the king's own model answers every envoy.">
            <span>Kings' small model (routine audiences, light alerts)</span>
            <ModelPicker value={choices.small} options={RungOptions} onChange={(v) => change((c) => (c.small = v))} />
          </div>
          <div className="field">
            <span>A woken king is played by</span>
            <select value={choices.plays} onChange={(e) => change((c) => (c.plays = e.target.value === "small" ? "small" : "large"))}>
              <option value="large">his own model</option>
              <option value="small">the small model, his own above it for what is passed up</option>
            </select>
          </div>
          <div className="field" title="What the envoys', spies' and candidates' own model passes up, or asks counsel of.">
            <span>Above the characters</span>
            <ModelPicker value={choices.charactersUp} options={RungOptions} onChange={(v) => change((c) => (c.charactersUp = v))} />
          </div>
          <div className="field" title="A strong model writes each king's plan at the start, once a year and when something large happens; the king plays each season by it and may ask for a new one.">
            <span>Planning</span>
            <ModelPicker value={choices.planning} options={[["Off", "Off"], ...RungOptions.filter(([v]) => v !== "Off")]} onChange={(v) => change((c) => (c.planning = v))} />
          </div>
        </div>
        <div>
          <div className="field" title="Off: every decision goes to the model its job names. Otherwise calls go to the decisions worth the most for their price, each to the rung that buys the most for it; what cannot be paid for, the script decides where it may, and the rest waits.">
            <span>Spend calls where they matter most</span>
            <select value={sp.mode} onChange={(e) => change((c) => (c.spending.mode = e.target.value as SpendMode))}>
              <option value="off">off: each job's model decides everything</option>
              <option value="limit">paced from the spending limit</option>
              <option value="season">at a cost per season</option>
              <option value="target">to a target</option>
            </select>
          </div>
          {sp.mode === "season" && (
            <label>
              Each season may cost $
              <input type="number" min="0" step="0.05" value={sp.seasonUsd} onChange={(e) => change((c) => (c.spending.seasonUsd = Math.max(0, Number(e.target.value) || 0)))} />
            </label>
          )}
          {sp.mode === "target" && (
            <label title="How often a smaller model may decide otherwise than the one above it, in a way that matters, by the audits.">
              A smaller model may differ in{" "}
              <input type="number" min="1" max="100" value={Math.round(sp.target * 100)} onChange={(e) => change((c) => (c.spending.target = Math.min(Math.max(Number(e.target.value) || 0, 1), 100) / 100))} />% of
              decisions
            </label>
          )}
          <label title="A share of the smaller models' decisions is also put, out of play, to the model above; its answer is never used, and the log records how often the two differed.">
            Audit one decision in{" "}
            <input
              type="number"
              min="0"
              max="1000"
              value={sp.auditShare > 0 ? Math.round(1 / sp.auditShare) : 0}
              onChange={(e) => change((c) => (c.spending.auditShare = (Number(e.target.value) || 0) > 0 ? 1 / Number(e.target.value) : 0))}
            />{" "}
            (0: none)
          </label>
          {kings.length > 0 && (
            <details style={{ marginTop: ".5rem" }}>
              <summary>Each king's own small model</summary>
              {kings.map((p) => (
                <div className="field" key={p}>
                  <span>{p}</span>
                  <ModelPicker
                    value={choices.smallFor[p] ?? ""}
                    options={[["", "the table's"], ...RungOptions]}
                    onChange={(v) => change((c) => (c.smallFor[p] = v))}
                  />
                </div>
              ))}
            </details>
          )}
        </div>
      </div>
    </div>
  );
}
