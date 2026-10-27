/**
 * Models are settings ("Built to outlive its models"): each job names any model, and a table may set up other providers
 * (any OpenAI-compatible endpoint, a local model's included) and set the price of a model the game does not know.
 */
import { CostEstimate, ModelIds, type PriceSetting, type ProviderSetting, type SeatChoices } from "@amarna/llm";
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
          No price is set for {unpriced.map(ModelIds.display).join(", ")}: the cost meter and the spending cap count it as free until you set one below.
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
