import {
  Greeting,
  WorldMap,
  type Power,
} from "@amarna/engine";
import { player } from "../../audio/player.ts";
import { powerName, shekels } from "../../ui/format.ts";
import { ClauseEditor } from "../ClauseEditor.tsx";
import { num } from "./form.ts";
import type { OrdersContext } from "./use-orders.ts";

/** The orders panel's Envoys: split from OrdersPanel.tsx, unchanged. */
export function EnvoysSection({ c }: { c: OrdersContext }) {
  const { state, v, f, set, structured, ready, reserved, others, mine, price, addDispatch, toggle, g, greetingText } = c;
  return (
    <>
    <div className="section">
      <h3>Envoys</h3>
      {ready.length === 0 ? (
        <p className="muted">No envoy is at court and free this season.</p>
      ) : (
        <>
          <div className="field">
            <span>Envoy</span>
            <select value={f.envoy} onChange={(e) => set({ envoy: e.target.value })}>
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
          {f.envoy !== "" && (
            <>
              <div className="field">
                <span>To the court of</span>
                <select value={f.sendTo} onChange={(e) => set({ sendTo: e.target.value })}>
                  {others.map((p) => (
                    <option key={p} value={p}>
                      {powerName(p)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <span>Greeting (sealed on the tablet: the envoy cannot change it)</span>
                <div className="row">
                  {(
                    [
                      ["callBrother", "call them brother"],
                      ["grantGreatKing", "call them Great King"],
                      ["claimGreatKing", "claim Great King yourself"],
                      ["senderFirst", "your name first"],
                      ["byHouse", "call them by their house, where another claims their name"],
                      ["omit", "no greeting"],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k}>
                      <input type="checkbox" checked={g[k] === true} onChange={(e) => set({ g: { ...g, [k]: e.target.checked } })} /> {label}
                    </label>
                  ))}
                </div>
                <div className="tablet" style={{ fontSize: ".88rem", marginTop: ".3rem" }}>
                  {greetingText.length > 0 ? greetingText : "(no greeting)"}
                </div>
              </div>
              <div className="field">
                <span>
                  {structured
                    ? "Your letter, in clauses (structured press: kings write only these, and the envoy recites them)"
                    : "The letter's clauses (kings who read only clauses read these; optional beside your words)"}
                </span>
                <ClauseEditor clauses={f.clauses} onChange={(cs) => set({ clauses: cs })} from={v.power} to={f.sendTo as Power} turn={v.turn} />
              </div>
              {!structured && (
              <div className="field">
                <span>Your message (the envoy will speak it in their own words)</span>
                <textarea
                  maxLength={1500}
                  rows={4}
                  enterKeyHint="enter"
                  value={f.letter}
                  onChange={(e) => set({ letter: e.target.value })}
                  placeholder="What should your envoy say? A few lines is best."
                />
                <small className={`count ${f.letter.length > 600 ? "long" : ""}`}>
                  {f.letter.length} / 1500{f.letter.length > 600 ? " · long: kings and envoys read short letters best" : ""}
                </small>
              </div>
              )}
              <div className="field">
                <span>Mandate: what the envoy may agree to</span>
                <input value={f.mandate} onChange={(e) => set({ mandate: e.target.value })} enterKeyHint="done" autoComplete="off" placeholder="e.g. peace and gifts; no land" />
              </div>
              <div className="row">
                <label>
                  Gold <input type="number" inputMode="numeric" min="0" value={f.gold} onChange={(e) => set({ gold: num(e.target.value) })} /> shekels
                </label>
                <label title="Below 100% the gold is debased: the receiver sees only its weight until they pay for an assay">
                  of purity <input type="number" inputMode="numeric" min="10" max="100" value={f.purity} onChange={(e) => set({ purity: num(e.target.value) })} /> %
                </label>
                <label title={`An inventory costs the scribe ${shekels(price("inventoryFee"))}; without one nobody can check what arrived`}>
                  <input type="checkbox" checked={f.noInventory} disabled={f.gold <= 0} onChange={(e) => set({ noInventory: e.target.checked })} /> no inventory
                </label>
              </div>
              <div className="field" style={{ marginTop: ".4rem" }}>
                <span>Authority (AUTHORITY AND PASSAGE in the rules)</span>
                <div className="row">
                  <label title="He may seal, in your name, a tablet the king he visits offers him">
                    <input type="checkbox" checked={f.seal} onChange={(e) => set({ seal: e.target.checked })} /> carries your seal
                  </label>
                  <label title="The king he visits reads his mandate and these limits">
                    <input type="checkbox" checked={f.showCredentials} onChange={(e) => set({ showCredentials: e.target.checked })} /> shows his credentials
                  </label>
                  {f.seal && (
                    <label>
                      gold he may give <input type="number" inputMode="numeric" min="0" value={f.sealGold} onChange={(e) => set({ sealGold: num(e.target.value) })} style={{ width: "5em" }} />
                    </label>
                  )}
                </div>
                {f.seal && (
                  <div className="row" style={{ flexWrap: "wrap" }}>
                    {mine.map((id) => (
                      <span key={id} className="muted" style={{ fontSize: ".85rem" }}>
                        {WorldMap.default.get(id).name}:{" "}
                        <label>
                          <input type="checkbox" checked={f.sealCede.includes(id)} onChange={(e) => set({ sealCede: toggle(f.sealCede, id, e.target.checked) })} /> cede
                        </label>{" "}
                        <label>
                          <input type="checkbox" checked={f.sealOpen.includes(id)} onChange={(e) => set({ sealOpen: toggle(f.sealOpen, id, e.target.checked) })} /> open
                        </label>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="field" style={{ marginTop: ".4rem" }}>
                <span>A tablet for both kings to seal (optional, {shekels(price("tabletFee"))} for the scribe)</span>
                {!structured && <textarea maxLength={1200} value={f.tabletText} onChange={(e) => set({ tabletText: e.target.value })} placeholder="By Shamash: ..." />}
                <ClauseEditor clauses={f.tabletClauses} onChange={(cs) => set({ tabletClauses: cs })} from={v.power} to={f.sendTo as Power} turn={v.turn} />
                <label>
                  <input type="checkbox" checked={f.oath} onChange={(e) => set({ oath: e.target.checked })} /> a sworn alliance
                  {state.config.sharedVictory ? " (counts for a shared victory)" : ""}
                </label>
                <label>
                  A vassal treaty:{" "}
                  <select value={f.vassal} onChange={(e) => set({ vassal: e.target.value as "" | "me" | "them" })}>
                    <option value="">no</option>
                    <option value="me">I am the vassal</option>
                    <option value="them">they are my vassal</option>
                  </select>
                </label>
              </div>
              {v.tablets.length > 0 && (
                <div className="field">
                  <span>Show tablets you hold as evidence</span>
                  {v.tablets.map((t) => (
                    <label key={t.copyId}>
                      <input type="checkbox" checked={f.copies.includes(t.copyId)} onChange={(e) => set({ copies: toggle(f.copies, t.copyId, e.target.checked) })} />{" "}
                      {Greeting.cap(t.text, 70)}
                    </label>
                  ))}
                </div>
              )}
              <button className="primary small" disabled={structured ? f.clauses.length === 0 : f.letter.trim().length === 0 && f.clauses.length === 0}
                onClick={() => {
                  // The letter pressed into clay and closed in its envelope (item 19+++).
                  player.play("stylus");
                  player.play("envelope", 0.9);
                  addDispatch();
                }}
              >
                Send this envoy
              </button>
            </>
          )}
        </>
      )}
    </div>
    </>
  );
}
