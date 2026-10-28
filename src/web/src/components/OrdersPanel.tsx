import {
  AllPowers,
  authenticate,
  forge,
  type GameState,
} from "@amarna/engine";
import { describeOrder, powerName, shekels, when } from "../ui/format.ts";
import { OrderDraft } from "../ui/order-draft.ts";
import { num } from "./orders/form.ts";
import { useOrders } from "./orders/use-orders.ts";
import { TroopsSection } from "./orders/TroopsSection.tsx";
import { TreasurySection } from "./orders/TreasurySection.tsx";
import { EnvoysSection } from "./orders/EnvoysSection.tsx";
import { CourtSection } from "./orders/CourtSection.tsx";

/** A human seat's orders for one season: units, treasury, envoys, court and tablets. */
export function OrdersPanel({ draft, state, onChanged, onSubmit }: { draft: OrderDraft; state: GameState; onChanged: () => void; onSubmit: (sleep: boolean) => void }) {
  const c = useOrders(draft, state, onChanged, onSubmit);
  const { v, me, f, set, ready, reserved, add, price, toggle } = c;

  return (
    <div className="orders">
      <div className="section">
        <h3>Orders for {when(v.turn, me)}</h3>
        <p className="muted">
          Treasury {shekels(v.gold)} · gold in since your last orders {shekels(v.income)} · troops' pay {shekels(v.upkeep)}
          {v.wallUpkeep > 0 ? ` · walls ${shekels(v.wallUpkeep)}` : ""} · wages {shekels(v.wages)} (for people away, owed as back pay) · back pay owed{" "}
          {shekels(v.backPay)}. Growth so far: {v.startStrength > 0 ? (v.strength / v.startStrength).toFixed(2) : "-"}.
        </p>
        <p className="muted">
          <small>
            Click one of your units on the map, then a destination, to move it. Click the unit again to hold. Envoys take: {v.travelTimes.join("; ")}.
          </small>
        </p>
      </div>

      <TroopsSection c={c} />

      <TreasurySection c={c} />

      <EnvoysSection c={c} />

      <CourtSection c={c} />

      <div className="section">
        <h3>Your archive</h3>
        <p className="muted">
          Every tablet you hold lies in your archive at your capital: a spy at your court may copy from it, and whoever takes your capital gains copies of
          it all.
        </p>
        {v.tablets.length === 0 && <p className="muted">You hold no tablets.</p>}
        {v.tablets.map((t) => (
          <div className="item" key={t.copyId}>
            <div className="tablet">{t.text}</div>
            <small>
              Seals: {t.seals.join(", ")}
              {t.sealedTurn !== null ? ` · sealed ${when(t.sealedTurn, me)}` : ""} · {t.source}
              {t.authResult !== null ? ` · examined: ${t.authResult}` : ""}
              {t.byHand !== null ? ` · sealed for ${powerName(t.byHandOf!)} by the hand of ${t.byHand}${t.within === null ? "" : t.within ? ", within his authority" : ", beyond his authority"}` : ""}
              {t.repudiatedTurn !== null ? ` · repudiated ${when(t.repudiatedTurn, me)}` : ""}
            </small>
            <div className="row">
              <button className="small" onClick={() => add(authenticate(t.copyId, f.authSpend))}>
                Have it examined
              </button>{" "}
              <label>
                spend <input type="number" min="10" value={f.authSpend} onChange={(e) => set({ authSpend: num(e.target.value) })} />
              </label>
            </div>
          </div>
        ))}
        <details>
          <summary>
            <small>Commission a forgery</small>
          </summary>
          <div className="field">
            <span>Forger (needs real skill; you will not know theirs until they try)</span>
            <select value={f.forgeWho} onChange={(e) => set({ forgeWho: e.target.value })}>
              <option value="">— choose —</option>
              {ready
                .filter((c) => !reserved.has(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>
          <textarea value={f.forgeText} onChange={(e) => set({ forgeText: e.target.value })} placeholder="The text of the false tablet" />
          <div className="row">
            {AllPowers.map((p) => (
              <label key={p}>
                <input type="checkbox" checked={f.forgeSeals.includes(p)} onChange={(e) => set({ forgeSeals: toggle(f.forgeSeals, p, e.target.checked) })} />{" "}
                {powerName(p)}
              </label>
            ))}
          </div>
          <button
            className="small"
            disabled={f.forgeWho === "" || f.forgeText.trim() === "" || f.forgeSeals.length === 0}
            onClick={() => add(forge(f.forgeWho, f.forgeText, [...f.forgeSeals]))}
          >
            Add ({shekels(price("forgery"))})
          </button>
        </details>
      </div>

      <div className="section">
        <h3>This season's other orders</h3>
        {draft.other.length === 0 && <p className="muted">None yet.</p>}
        {draft.other.map((o, i) => (
          <div className="row" key={i}>
            <small>{describeOrder(o, v)}</small>{" "}
            <button
              className="small"
              onClick={() => {
                draft.other.splice(i, 1);
                onChanged();
              }}
            >
              Remove
            </button>
          </div>
        ))}
        <div className="field" style={{ marginTop: ".6rem" }}>
          <span>Private notes (only you see these)</span>
          <textarea
            defaultValue={draft.notes}
            onChange={(e) => {
              draft.notes = e.target.value;
            }}
          />
        </div>
        <button className="primary" onClick={() => onSubmit(false)}>
          Seal the orders for this season
        </button>
        {/* Sleep is for every seat (item 9+a): the seasons pass by themselves until something concerns you, or you wake. */}
        {state.config.sleepingSeats && (
          <button
            className="small"
            style={{ marginLeft: ".5rem" }}
            title="Your orders, scheduled orders, standing orders and answers act for you; you are woken when something concerns you, or when you choose to wake"
            onClick={() => onSubmit(true)}
          >
            Seal and sleep until something concerns me
          </button>
        )}
      </div>
    </div>
  );
}
