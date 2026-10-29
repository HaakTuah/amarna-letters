import {
  MaxStanding,
  payFee,
  unitOf,
} from "@amarna/engine";
import { describeOrder, powerName, provinceName } from "../../ui/format.ts";
import { OrderDraft, byName } from "../../ui/order-draft.ts";
import { Emblem } from "../Emblem.tsx";
import { StandingAnswersPanel } from "../StandingAnswersPanel.tsx";
import { map, unitLetter } from "./form.ts";
import type { OrdersContext } from "./use-orders.ts";

/** The orders panel's Troops, standing answers and standing orders: split from OrdersPanel.tsx, unchanged. */
export function TroopsSection({ c }: { c: OrdersContext }) {
  const { draft, onChanged, v, me, f, set, structured, visibleUnits, others, addStandingOrder, addStanding, add } = c;
  return (
    <>
    <div className="section">
      <h3>Troops</h3>
      {draft.units.size === 0 && <p className="muted">You have no troops.</p>}
      {[...draft.units]
        .sort((a, b) => byName(a[0], b[0]))
        .map(([at, d]) => {
          const unit = draft.unitAt(at)!;
          const change = (patch: Partial<typeof d>): void => {
            Object.assign(d, patch);
            onChanged();
          };
          return (
            <div className="unitrow" key={at}>
              <span>
                <Emblem power={me} /> {unit.kind === "Army" ? "Army" : "Fleet"} {provinceName(at)}
                {unit.men > 0 && <span className="muted"> · {unit.men} men</span>}
                {unit.march !== null && <span className="muted"> · on the road to {provinceName(unit.march)}, about {unit.marchDays} days left</span>}
              </span>
              <select value={d.kind} onChange={(e) => change({ kind: e.target.value, target: null, to: null })}>
                <option value="hold">Hold</option>
                <option value="move">Move</option>
                <option value="force">Move by forced march</option>
                <option value="support">Support</option>
                {unit.kind === "Fleet" && map.get(at).isSea && <option value="convoy">Convoy</option>}
                {unit.kind === "Army" && v.walls.getOrDefault(at, 0) > 0 && v.owner.tryGet(at) !== me && <option value="besiege">Besiege the city</option>}
                <option value="disband">Disband</option>
                {!map.get(at).isSea && v.owner.tryGet(at) === me && <option value="settle">Disband and settle its men here</option>}
              </select>
              <span className="row" style={{ gap: ".3rem" }}>
                {(d.kind === "move" || d.kind === "force") && (
                  <select value={d.target ?? ""} onChange={(e) => change({ target: e.target.value })}>
                    <option value="">— where? —</option>
                    {draft.movesFor(at).map((to) => (
                      <option key={to} value={to}>
                        {provinceName(to)}
                        {map.canMove(unit.kind, at, to) ? "" : " (by sea)"}
                      </option>
                    ))}
                  </select>
                )}
                {d.kind === "support" && (
                  <>
                    <select value={d.target ?? ""} onChange={(e) => change({ target: e.target.value, to: null })}>
                      <option value="">— whom? —</option>
                      {visibleUnits
                        .filter((u) => u.province !== at)
                        .map((u) => (
                          <option key={u.province} value={u.province}>
                            {powerName(u.power)} {unitLetter(u.kind)} {provinceName(u.province)}
                          </option>
                        ))}
                    </select>
                    {d.target !== null && (
                      <select value={d.to ?? ""} onChange={(e) => change({ to: e.target.value })}>
                        <option value="">to hold</option>
                        {map
                          .movesFrom(unit.kind, at)
                          .filter((x) => x !== d.target)
                          .map((to) => (
                            <option key={to} value={to}>
                              into {provinceName(to)}
                            </option>
                          ))}
                      </select>
                    )}
                  </>
                )}
                {d.kind === "convoy" && (
                  <>
                    <select value={d.target ?? ""} onChange={(e) => change({ target: e.target.value })}>
                      <option value="">— which army? —</option>
                      {visibleUnits
                        .filter((u) => u.kind === "Army" && map.get(u.province).isCoastal)
                        .map((u) => (
                          <option key={u.province} value={u.province}>
                            {powerName(u.power)} A {provinceName(u.province)}
                          </option>
                        ))}
                    </select>
                    <select value={d.to ?? ""} onChange={(e) => change({ to: e.target.value })}>
                      <option value="">— to? —</option>
                      {map.landProvinces
                        .filter((p) => p.isCoastal)
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </select>
                  </>
                )}
              </span>
            </div>
          );
        })}
    </div>

    {/* Standing answers: a human seat may set them too (item 8). */}
    <StandingAnswersPanel draft={draft} structured={structured} onChanged={onChanged} />
    {/* Standing orders: every seat may keep them, awake or asleep (since the additions to the fix pass after item 4). */}
    <div className="section standing">
      <h3>Standing orders</h3>
      <p className="muted">
        <small>
          A standing order waits for a move you can see and answers it in the same season through your commanders on the spot: its orders then replace
          yours for the same troops, each unit's only where its commander, or you, stand with it, once word of it has reached it, on a move its army
          sees. It first fires next season, fires once, and costs nothing to give. At most {MaxStanding}.
        </small>
      </p>
      {v.standing.map((st) => {
        const cancelled = draft.cancelStanding.has(st.id);
        return (
          <div className="row" key={st.id}>
            <small style={cancelled ? { textDecoration: "line-through" } : undefined}>
              {st.id}: {OrderDraft.when(st.when, st.power, st.province, me)}, then {st.orders.map((o) => describeOrder(o, v)).join("; ")}
            </small>
            <button
              className="small"
              onClick={() => {
                if (!draft.cancelStanding.delete(st.id)) draft.cancelStanding.add(st.id);
                onChanged();
              }}
            >
              {cancelled ? "Keep" : "Cancel"}
            </button>
          </div>
        );
      })}
      {/* Haakon's answers to item 11b+: a job's order to pay the rest when it is done is a standing order of yours, to cancel like any. */}
      {[...new Map([...v.court, ...v.known].filter((s) => s.ours && s.payOnDone).map((s) => [s.id, s])).values()].map((s) => (
        <div className="row" key={`paydone-${s.id}`}>
          <small>Pay {s.name} the rest of the fee when the job is done</small>
          <button className="small" disabled={draft.other.some((o) => o.type === "payFee" && o.character === s.id)} onClick={() => add(payFee(s.id, false))}>
            Cancel
          </button>
        </div>
      ))}
      {draft.standing.map((r, i) => (
        <div className="row" key={`new${i}`}>
          <small>
            New: {OrderDraft.when(r.when, r.power, r.province, me)}, then {r.orders.map((o) => describeOrder(o, v)).join("; ")}
          </small>
          <button
            className="small"
            onClick={() => {
              draft.standing.splice(draft.standing.indexOf(r), 1);
              onChanged();
            }}
          >
            Remove
          </button>
        </div>
      ))}
      {v.standing.length - draft.cancelStanding.size + draft.standing.length < MaxStanding && (
        <>
          <div className="row" style={{ marginTop: ".4rem" }}>
            <select value={f.stWhen} onChange={(e) => set({ stWhen: e.target.value, stPlace: "" })}>
              <option value="enters">When troops enter…</option>
              {draft.units.size > 0 && <option value="attacked">When my troop is attacked…</option>}
            </select>
            <select value={f.stPlace} onChange={(e) => set({ stPlace: e.target.value })}>
              <option value="">— where? —</option>
              {f.stWhen === "attacked"
                ? [...draft.units.keys()].sort(byName).map((at) => (
                    <option key={at} value={at}>
                      {provinceName(at)}
                    </option>
                  ))
                : [...map.provinces]
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
            </select>
            {f.stWhen === "enters" && (
              <select value={f.stPower} onChange={(e) => set({ stPower: e.target.value })}>
                <option value="">any foreign troops</option>
                {others.map((p) => (
                  <option key={p} value={p}>
                    {powerName(p)}'s troops
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="row" style={{ marginTop: ".3rem" }}>
            <span>then</span>
            <select value={f.stUnit} onChange={(e) => set({ stUnit: e.target.value, stTarget: "", stTo: "" })}>
              <option value="">— which troop? —</option>
              {[...draft.units.keys()]
                .filter((a) => f.stOrders.every((o) => unitOf(o) !== a))
                .sort(byName)
                .map((at) => (
                  <option key={at} value={at}>
                    {draft.unitAt(at)!.kind === "Army" ? "Army" : "Fleet"} {provinceName(at)}
                  </option>
                ))}
            </select>
            <select value={f.stKind} onChange={(e) => set({ stKind: e.target.value, stTarget: "", stTo: "" })}>
              <option value="support">supports</option>
              <option value="move">moves</option>
              <option value="hold">holds</option>
            </select>
            {f.stUnit !== "" && f.stKind === "move" && (
              <select value={f.stTarget} onChange={(e) => set({ stTarget: e.target.value })}>
                <option value="">— where? —</option>
                {map
                  .movesFrom(draft.unitAt(f.stUnit)!.kind, f.stUnit)
                  .sort(byName)
                  .map((to) => (
                    <option key={to} value={to}>
                      {provinceName(to)}
                    </option>
                  ))}
              </select>
            )}
            {f.stUnit !== "" && f.stKind === "support" && (
              <>
                <select value={f.stTarget} onChange={(e) => set({ stTarget: e.target.value, stTo: "" })}>
                  <option value="">— whom? —</option>
                  {visibleUnits
                    .filter((u) => u.province !== f.stUnit)
                    .map((u) => (
                      <option key={u.province} value={u.province}>
                        {powerName(u.power)} {unitLetter(u.kind)} {provinceName(u.province)}
                      </option>
                    ))}
                </select>
                {f.stTarget !== "" && (
                  <select value={f.stTo} onChange={(e) => set({ stTo: e.target.value })}>
                    <option value="">to hold</option>
                    {map
                      .movesFrom(draft.unitAt(f.stUnit)!.kind, f.stUnit)
                      .filter((x) => x !== f.stTarget)
                      .sort(byName)
                      .map((to) => (
                        <option key={to} value={to}>
                          into {provinceName(to)}
                        </option>
                      ))}
                  </select>
                )}
              </>
            )}
            <button className="small" disabled={f.stUnit === "" || OrderDraft.unitOrder(f.stUnit, f.stKind, f.stTarget, f.stTo) === null} onClick={addStandingOrder}>
              Add this order
            </button>
          </div>
          {f.stOrders.length > 0 && (
            <div className="row" style={{ marginTop: ".3rem" }}>
              <small>Its orders: {f.stOrders.map((o) => describeOrder(o, v)).join("; ")}</small>{" "}
              <button className="small" onClick={() => set({ stOrders: [] })}>
                Clear
              </button>
            </div>
          )}
          <button className="small" style={{ marginTop: ".3rem" }} disabled={f.stPlace === "" || f.stOrders.length === 0} onClick={addStanding}>
            Add this standing order
          </button>
        </>
      )}
    </div>
    </>
  );
}
