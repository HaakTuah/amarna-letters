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
  repudiate,
  hire,
  payFee,
  borrow,
  repay,
  seekCandidates,
  type Power,
} from "@amarna/engine";
import { dated, grantLine, powerName, shekels } from "../../ui/format.ts";
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
      {v.roadsClosedToUs.length > 0 && <p className="muted">Closed to your people, as far as you have heard: {v.roadsClosedToUs.map(powerName).join(", ")}.</p>}
      {v.grants.length > 0 && (
        <div className="field" style={{ marginTop: ".4rem" }}>
          <span>Passage and basing on sealed tablets</span>
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
      <div className="row" style={{ marginTop: ".4rem" }}>
        <label>
          Term for hiring and renewing <input type="number" min="1" max="30" value={f.term} onChange={(e) => set({ term: num(e.target.value) })} /> seasons
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
              <button className="small" disabled={c.where !== "at your court"} onClick={() => add(hire(c.id, wage(c.id, c.askingPrice ?? 15), term))}>
                Hire for {term} seasons, half now
              </button>
              {c.lends !== null && (
                <button className="small" onClick={() => add(borrow(c.id, c.lends!.amount, c.lends!.amount + Math.ceil((c.lends!.amount * c.lends!.perHundred) / 100), c.lends!.seasons))}>
                  Borrow {shekels(c.lends.amount)}, {c.lends.perHundred} in 100 more back in {c.lends.seasons} seasons
                </button>
              )}
            </div>
          </div>
        ))}
      {/* Your own people: at court at any time, or wherever they are once they have given notice. Hire is only for people not in your service. */}
      {v.court
        .filter((c) => c.ready || c.noticePrice !== null)
        .map((c) => (
          <div className="row" style={{ marginTop: ".3rem" }} key={c.id}>
            <small>
              {c.name}: {dated(c.term, me)}.
            </small>
            <label>
              Fee{" "}
              <input type="number" min="1" value={f.wages[c.id] ?? wage(c.id, c.noticePrice ?? Math.trunc((c.fee ?? 90) / 6))} onChange={(e) => set({ wages: { ...f.wages, [c.id]: num(e.target.value) } })} />
            </label>
            <button
              className="small"
              disabled={draft.other.some((o) => o.type === "renew" && o.character === c.id)}
              onClick={() => add(renew(c.id, wage(c.id, c.noticePrice ?? Math.trunc((c.fee ?? 90) / 6)), term))}
            >
              Renew for {term} seasons, half now
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
      <p className="muted">
        <small>
          People count on {v.trust} in a hundred of what you promise (kept {v.kept}, broken {v.broken}); the going rate of service is {v.goingRate} in a hundred. A
          person is hired in person, at your court.
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
              <button className="small" onClick={() => add(captive(c.id, "Turn", 0, f.poisonText))}>
                Turn them
              </button>
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
