import {
  AllPowers,
  captive,
  giftTo,
  handOver,
  question,
  steal,
  check,
  counterIntel,
  dismiss,
  payRansom,
  recall,
  release,
  renew,
  roads,
  revoke,
  grant,
  repudiate,
  hire,
  payFee,
  borrow,
  buyNews,
  repay,
  seekCandidates,
  seize,
  sellDebt,
  payCarriers,
  huntBands,
  hunt,
  type Power,
} from "@amarna/engine";
import { dated, grantLine, powerName, provinceName, shekels } from "../../ui/format.ts";
import { byName } from "../../ui/order-draft.ts";
import { Person } from "../Person.tsx";
import { map, num } from "./form.ts";
import type { OrdersContext } from "./use-orders.ts";

/** The orders panel's Court: servants, candidates, jobs and their fees, lenders and debts, inquiries and captives. */
export function CourtSection({ c }: { c: OrdersContext }) {
  const { draft, v, me, f, set, wage, ready, reserved, others, add, term, addSpy } = c;
  return (
    <>
    <div className="section">
      <h3>Court</h3>
      <div className="row">
        <button className="small" disabled={draft.other.some((o) => o.type === "seekCandidates")} onClick={() => add(seekCandidates())}>
          Ask for candidates
        </button>
        <label>
          Watch for spies: <input type="number" min="0" value={f.watch} onChange={(e) => set({ watch: num(e.target.value) })} />
        </label>
        <button className="small" disabled={f.watch <= 0} onClick={() => add(counterIntel(f.watch))}>
          Add
        </button>
      </div>
      <div className="row" style={{ marginTop: ".4rem" }}>
        <span>Roads (they stand until changed):</span>
        {others.map((p) => {
          const closed = v.roadsClosed.includes(p);
          return (
            <button key={p} className="small" disabled={draft.other.some((o) => o.type === "roads" && o.court === p)} onClick={() => add(roads(p, !closed))}>
              {closed ? `Open to ${powerName(p)}` : `Close to ${powerName(p)}`}
            </button>
          );
        })}
      </div>
      {/* Item 11a+: passage or basing granted by order, standing from next season. */}
      <div className="row" style={{ marginTop: ".4rem" }}>
        <select value={f.grantKind} onChange={(e) => set({ grantKind: e.target.value, grantAt: "" })}>
          <option value="passage">Grant passage</option>
          <option value="basing">Grant basing</option>
        </select>
        <select value={f.grantTo} onChange={(e) => set({ grantTo: e.target.value })}>
          <option value="">to…</option>
          {others.map((p) => (
            <option key={p} value={p}>
              {powerName(p)}
            </option>
          ))}
        </select>
        <select value={f.grantAt} onChange={(e) => set({ grantAt: e.target.value })}>
          <option value="">{f.grantKind === "passage" ? "all your land" : "in…"}</option>
          {[...v.owner.entries()]
            .filter(([id, o]) => o === me && !map.get(id).isSea)
            .map(([id]) => id)
            .sort()
            .map((id) => (
              <option key={id} value={id}>
                {map.get(id).name}
              </option>
            ))}
        </select>
        <input type="number" min={1} placeholder="seasons" value={f.grantSeasons} onChange={(e) => set({ grantSeasons: e.target.value })} style={{ width: "5rem" }} />
        <button
          className="small"
          disabled={f.grantTo === "" || (f.grantKind === "basing" && f.grantAt === "")}
          onClick={() => add(grant(f.grantTo as Power, f.grantKind === "basing" ? "basing" : "passage", f.grantAt === "" ? null : f.grantAt, Number(f.grantSeasons) > 0 ? Math.floor(Number(f.grantSeasons)) : null))}
        >
          Add
        </button>
      </div>
      {v.roadsClosedToUs.length > 0 && <p className="muted">Closed to your people, as far as you have heard: {v.roadsClosedToUs.map(powerName).join(", ")}.</p>}
      {v.grants.length > 0 && (
        <div className="field" style={{ marginTop: ".4rem" }}>
          <span>Passage and basing</span>
          {v.grants.map((g, i) => (
            <div key={i} className="row">
              <span style={{ flex: 1 }}>{grantLine(g, v.power)}</span>
              {g.grantor === v.power && (
                <button className="small" disabled={draft.other.some((o) => o.type === "revoke" && o.grantee === g.grantee)} onClick={() => add(revoke(g.grantee, g.province))}>
                  Revoke
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      {v.tablets.some((t) => t.byHandOf === v.power && t.repudiatedTurn === null) && (
        <div className="row" style={{ marginTop: ".4rem", flexWrap: "wrap" }}>
          <span>Sealed in your name by your envoys:</span>
          {v.tablets
            .filter((t) => t.byHandOf === v.power && t.repudiatedTurn === null)
            .map((t) => (
              <button key={t.copyId} className="small" title={t.text} disabled={draft.other.some((o) => o.type === "repudiate" && o.copy === t.copyId)} onClick={() => add(repudiate(t.copyId))}>
                Repudiate {t.name}
                {t.within === false ? " (beyond his authority)" : ""}
              </button>
            ))}
        </div>
      )}
      <div className="row" style={{ marginTop: ".4rem", flexWrap: "wrap" }}>
        <label>
          A job offered:{" "}
          <select value={f.errandWhat} onChange={(e) => set({ errandWhat: e.target.value as "envoy" | "spy" | "stay" })}>
            <option value="envoy">envoy to</option>
            <option value="spy">spy on</option>
            <option value="stay">stay at my court until the term ends</option>
          </select>{" "}
          {f.errandWhat !== "stay" && (
            <select value={f.errandWhere} onChange={(e) => set({ errandWhere: e.target.value })}>
              {AllPowers.filter((p) => p !== me).map((p) => (
                <option key={p} value={p}>
                  {powerName(p)}
                </option>
              ))}
            </select>
          )}
        </label>
        <label>
          within <input type="number" min="1" max="30" value={f.term} onChange={(e) => set({ term: num(e.target.value) })} /> seasons
        </label>
        <label>
          <input type="checkbox" checked={f.payOnDone} onChange={(e) => set({ payOnDone: e.target.checked })} /> pay the rest when it is done
        </label>
      </div>
      {v.known
        .filter((c) => c.status === "free" && (c.pitch !== null || c.askingPrice !== null))
        .map((c) => (
          <div className="item" key={c.id}>
            <Person c={c} court={me} />
            <div className="row">
              <label>
                Fee{" "}
                <input type="number" min="1" value={f.wages[c.id] ?? wage(c.id, c.askingPrice ?? 15)} onChange={(e) => set({ wages: { ...f.wages, [c.id]: num(e.target.value) } })} />
              </label>
              <button
                className="small"
                disabled={c.where !== "at your court"}
                onClick={() => add(hire(c.id, wage(c.id, c.askingPrice ?? 15), term, null, { what: f.errandWhat, where: f.errandWhat === "stay" ? me : f.errandWhere, payOnDone: f.payOnDone }))}
              >
                Offer the job ({f.errandWhat === "stay" ? "to stay at court" : `${f.errandWhat} ${f.errandWhat === "envoy" ? "to" : "on"} ${powerName(f.errandWhere as Power)}`}), half now
              </button>
              {c.hoardHere !== null && (
                <button className="small danger" disabled={draft.other.some((o) => o.type === "seize" && o.character === c.id)} onClick={() => add(seize(c.id))}>
                  Seize their hoard here ({shekels(c.hoardHere)})
                </button>
              )}
              {c.lends !== null && (
                <button className="small" onClick={() => add(borrow(c.id, c.lends!.amount, c.lends!.amount + Math.ceil((c.lends!.amount * c.lends!.perHundred) / 100), c.lends!.seasons))}>
                  Borrow {shekels(c.lends.amount)}, {c.lends.perHundred} in 100 more back in {c.lends.seasons} seasons
                </button>
              )}
              {c.news.map((n) => (
                <button className="small" key={n.court} onClick={() => add(buyNews(c.id, n.court as Power))}>
                  Buy news of {n.court} (turn {n.turn}, {n.lines} {n.lines === 1 ? "report" : "reports"}) for {shekels(n.price)}
                </button>
              ))}
            </div>
          </div>
        ))}
      {/* Your own people at court: a new job is a new errand, which they may refuse. Hire is only for people not in your service. */}
      {v.court
        .filter((c) => c.ready)
        .map((c) => (
          <div className="row" style={{ marginTop: ".3rem" }} key={c.id}>
            <small>
              {c.name}: {dated(c.term, me)}.
            </small>
            <label>
              Fee{" "}
              <input type="number" min="1" value={f.wages[c.id] ?? wage(c.id, Math.trunc((c.fee ?? 90) / 6))} onChange={(e) => set({ wages: { ...f.wages, [c.id]: num(e.target.value) } })} />
            </label>
            <button
              className="small"
              disabled={draft.other.some((o) => o.type === "renew" && o.character === c.id)}
              onClick={() => add(renew(c.id, wage(c.id, Math.trunc((c.fee ?? 90) / 6)), term, null, { what: f.errandWhat, where: f.errandWhat === "stay" ? me : f.errandWhere, payOnDone: f.payOnDone }))}
            >
              Offer a new job ({f.errandWhat === "stay" ? "to stay at court" : `${f.errandWhat} ${f.errandWhat === "envoy" ? "to" : "on"} ${powerName(f.errandWhere as Power)}`}), half now
            </button>
            <button className="small" disabled={draft.other.some((o) => o.type === "payFee" && o.character === c.id)} onClick={() => add(payFee(c.id, false))}>
              Withhold the rest of the fee
            </button>
          </div>
        ))}
      {/* Item 11a: people you let a fee fall due unpaid, and your debts. */}
      {[...v.court, ...v.known]
        .filter((c) => c.owed !== null && c.where === "at your court")
        .map((c) => (
          <div className="row" key={`owed-${c.id}`}>
            <small>
              You owe {c.name} {shekels(c.owed!)} of a fee that fell due.
            </small>
            <button className="small" onClick={() => add(payFee(c.id, true))}>
              Pay it
            </button>
          </div>
        ))}
      {v.debts.map((d) => (
        <div className="row" key={d.id}>
          <small>
            Debt {d.id}: {shekels(d.left)} left to repay by turn {d.dueTurn}; the tablet is held by {d.holder}
            {d.here ? ", who stands at your court" : ""}.
          </small>
          {d.here && (
            <button className="small" onClick={() => add(repay(d.id, d.left))}>
              Repay it
            </button>
          )}
        </div>
      ))}
      {v.debtsHeld.map((d) => (
        <div className="row" key={`held-${d.id}`}>
          <small>
            Tablet {d.id} in your archive: {d.holder} owes {shekels(d.left)}, by turn {d.dueTurn}
            {d.here ? "; they stand at your court" : ""}. Send it with an envoy to collect, or sell it to a lender here.
          </small>
          {[...v.court, ...v.known]
            .filter((c) => c.lends !== null && c.id !== d.holderId)
            .slice(0, 2)
            .map((c) => (
              <button className="small" key={c.id} onClick={() => add(sellDebt(d.id, c.id, Math.trunc(d.left / 2)))}>
                Sell to {c.name} for {shekels(Math.trunc(d.left / 2))}
              </button>
            ))}
        </div>
      ))}
      <div className="row">
        <button className="small" disabled={draft.other.some((o) => o.type === "payCarriers")} onClick={() => add(payCarriers(!v.payCarriers))}>
          {v.payCarriers ? "Stop paying letter carriers on delivery" : "Pay letter carriers on delivery"}
        </button>
        <button className="small" disabled={draft.other.some((o) => o.type === "huntBands")} onClick={() => add(huntBands(!v.huntBands))}>
          {v.huntBands ? `Stop hunting bands ${v.huntWhere.length > 0 ? `in ${v.huntWhere.map(provinceName).join(", ")}` : "in your land"}` : "Armies hunt any band in your land"}
        </button>
        {/* Haakon's answers to item 11b+: a standing hunt names provinces, or the whole land. */}
        <select value="" disabled={draft.other.some((o) => o.type === "huntBands")} onChange={(e) => e.target.value !== "" && add(huntBands(true, [...new Set([...v.huntWhere, e.target.value])]))}>
          <option value="">{v.huntBands && v.huntWhere.length === 0 ? "Hunt only in a province of yours (narrows the whole-land hunt)…" : "Armies hunt bands in a province of yours…"}</option>
          {[...v.owner.entries()]
            .filter(([at, who]) => who === me && !v.huntWhere.includes(at))
            .map(([at]) => at)
            .sort(byName)
            .map((at) => (
              <option key={at} value={at}>
                {provinceName(at)}
              </option>
            ))}
        </select>
        {/* The one-off hunt: this season, an army of yours where it stands falls on any band working there. */}
        <select value="" onChange={(e) => e.target.value !== "" && add(hunt(e.target.value))}>
          <option value="">Hunt the bands this season in…</option>
          {[...new Set(v.units.filter((u) => u.power === me && u.kind === "Army" && v.owner.tryGet(u.province) === me).map((u) => u.province))]
            .filter((at) => !draft.other.some((o) => o.type === "hunt" && o.province === at))
            .sort(byName)
            .map((at) => (
              <option key={at} value={at}>
                {provinceName(at)}
              </option>
            ))}
        </select>
      </div>
      <p className="muted">
        <small>
          People count on {v.trust} in a hundred of what you promise, as far as they have heard your record (kept {v.kept}, broken {v.broken}). A job is one errand,
          offered to a person at your court (or abroad, by an envoy); nothing is paid but by your order.
        </small>
      </p>
      <div className="row" style={{ marginTop: ".4rem" }}>
        <select value={f.checkWho} onChange={(e) => set({ checkWho: e.target.value })}>
          <option value="">Inquire into…</option>
          {[...v.court, ...v.known].map((c, i) => (
            <option key={`${c.id}${i}`} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label>
          spend <input type="number" min="10" value={f.checkSpend} onChange={(e) => set({ checkSpend: num(e.target.value) })} />
        </label>
        <button className="small" disabled={f.checkWho === ""} onClick={() => add(check(f.checkWho, f.checkSpend))}>
          Add
        </button>
      </div>
      <div className="row" style={{ marginTop: ".4rem" }}>
        <select value={f.spyWho} onChange={(e) => set({ spyWho: e.target.value })}>
          <option value="">Send a spy…</option>
          {ready
            .filter((c) => !reserved.has(c.id))
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
        </select>
        <select value={f.spyAt} onChange={(e) => set({ spyAt: e.target.value })}>
          {others.map((p) => (
            <option key={p} value={p}>
              to the court of {powerName(p)}
            </option>
          ))}
          {[...map.landProvinces]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((p) => (
              <option key={p.id} value={`@${p.id}`}>
                to watch {p.name}
              </option>
            ))}
        </select>
        <button className="small" disabled={f.spyWho === ""} onClick={addSpy}>
          Add
        </button>
      </div>
      {v.court
        .filter((c) => c.duty.startsWith("watching"))
        .map((c) => (
          <div className="row" style={{ marginTop: ".3rem" }} key={`w${c.id}`}>
            <small>
              {c.name} is {c.duty}.
            </small>{" "}
            <button className="small" onClick={() => add(recall(c.id))}>
              Recall
            </button>
            {c.duty.startsWith("watching") && !c.duty.includes(" in ") ? (
              <button className="small" onClick={() => add(steal(c.id))}>
                Steal a tablet
              </button>
            ) : null}
          </div>
        ))}
      {/* Anyone in your service, at court or away: whoever is away keeps going where they were going, and is free when they get there. */}
      {v.court.map((c) => (
        <div className="row" style={{ marginTop: ".3rem" }} key={`d${c.id}`}>
          <small>
            {c.name}
            {c.ready ? "" : ` (${dated(c.duty, me)})`}
          </small>{" "}
          <button className="small danger" onClick={() => add(dismiss(c.id))}>
            Dismiss
          </button>
        </div>
      ))}
      {/* Only once the demand has reached this court: until then a captive appears at its post, as its master believes. */}
      {v.court
        .filter((c) => c.ransomDemand !== null)
        .map((c) => (
          <div className="row" style={{ marginTop: ".3rem" }} key={`r${c.id}`}>
            <small>
              {c.name} is held captive {c.where}.
            </small>{" "}
            <button className="small" onClick={() => add(payRansom(c.id))}>
              Pay the ransom demanded ({shekels(c.ransomDemand!)})
            </button>
          </div>
        ))}
      {v.known
        .filter((c) => c.status === "your captive")
        .map((c) => (
          <div className="item" key={`c${c.id}`}>
            <strong>{c.name}</strong>, a spy you caught.
            <div className="row">
              <button className="small" onClick={() => add(captive(c.id, "Ransom", f.ransom))}>
                Ransom for
              </button>
              <input type="number" min="1" value={f.ransom} onChange={(e) => set({ ransom: num(e.target.value) })} />
              <small>
                {c.ransomCarrier !== null
                  ? ` (if nobody sets out that way, a carrier is hired at your court for ${shekels(c.ransomCarrier)}, paid now from your treasury)`
                  : " (it waits for someone setting out that way)"}
              </small>
              <button className="small" onClick={() => add(captive(c.id, "Turn", 0, f.poisonText))}>
                Turn them
              </button>
              {(c.carries ?? 0) > 0 && (
                <button className="small" onClick={() => add(captive(c.id, "TakePurse"))}>
                  Take what they carry ({shekels(c.carries!)})
                </button>
              )}
              <button className="small" onClick={() => add(captive(c.id, "Release"))}>
                Release
              </button>
              <button className="small danger" onClick={() => add(captive(c.id, "Execute"))}>
                Execute
              </button>
            </div>
            <div className="row">
              <button className="small" onClick={() => add(question(c.id, f.questionSpend))}>
                Question, spending
              </button>
              <input type="number" min="10" value={f.questionSpend} onChange={(e) => set({ questionSpend: num(e.target.value) })} />
              <button className="small" onClick={() => add(handOver(c.id, f.handTo))}>
                Hand over to
              </button>
              <select value={f.handTo} onChange={(e) => set({ handTo: e.target.value as Power })}>
                {AllPowers.filter((p) => p !== me).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <input style={{ width: "100%", marginTop: ".3rem" }} value={f.poisonText} onChange={(e) => set({ poisonText: e.target.value })} placeholder="If turned: what they should report home" />
          </div>
        ))}
      {/* Item 10: a person at your court who says they are an envoy, with no letter: a host's gift, or check the claim. */}
      {v.known
        .filter((c) => c.claimsToServe !== null)
        .map((c) => (
          <div className="row" style={{ marginTop: ".3rem" }} key={`e${c.id}`}>
            <small>
              {c.name} says they are an envoy of {c.claimsToServe}, with no letter (an envoy you send to {c.claimsToServe} will ask there whether they serve him).
            </small>{" "}
            <button className="small" onClick={() => add(giftTo(c.id, f.giftGold))}>
              Give a gift of
            </button>
            <input type="number" min="1" value={f.giftGold} onChange={(e) => set({ giftGold: num(e.target.value) })} />
          </div>
        ))}
      {/* An envoy you hold whose king has dismissed them, or fallen, is free but still held: you may let them go. */}
      {v.known
        .filter((c) => c.heldByYou && (c.status === "employed" || c.status === "free"))
        .map((c) => (
          <div className="row" style={{ marginTop: ".3rem" }} key={`h${c.id}`}>
            <small>
              You are holding {c.name}
              {c.employer !== null ? `, envoy of ${powerName(c.employer)}` : ""}.
            </small>
            <input value={f.releaseWords} onChange={(e) => set({ releaseWords: e.target.value })} placeholder="Words to send with them" />
            <button className="small" onClick={() => add(release(c.id, f.releaseWords))}>
              Release
            </button>
          </div>
        ))}
    </div>
    </>
  );
}
