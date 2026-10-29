import { useState } from "react";
import {
  AllPowers,
  EngageValues,
  MandateTaskValues,
  MostGovernorLevies,
  WithdrawValues,
  bandCost,
  command,
  enlist,
  govern,
  mandateOrder,
  mandateText,
  moveCourt,
  newMandate,
  relieve,
  supply,
  unseat,
  type Engage,
  type MandateTask,
  type Power,
  type Withdraw,
} from "@amarna/engine";
import { provinceName } from "../../ui/format.ts";
import { byName } from "../../ui/order-draft.ts";
import { map } from "./form.ts";
import type { OrdersContext } from "./use-orders.ts";

/**
 * The orders panel's Command at a distance (item 13): where the court is and moving it, commanders granted and taken back,
 * mandates, and governors. Each order goes into the season's other orders, as the rulebook's COMMAND AT A DISTANCE says.
 */
export function CommandSection({ c }: { c: OrdersContext }) {
  const { v, me, add, mine } = c;
  const [courtTo, setCourtTo] = useState("");
  const [grant, setGrant] = useState<Record<string, string>>({});
  const [m, setM] = useState<{ unit: string; task: MandateTask; target: string; power: string; engage: Engage; withdraw: Withdraw; until: number }>({
    unit: "",
    task: "guard",
    target: "",
    power: "",
    engage: "advantage",
    withdraw: "outnumbered",
    until: 0,
  });
  const [gov, setGov] = useState<{ province: string; person: string; levies: number }>({ province: "", person: "", levies: 1 });
  const [food, setFood] = useState<Record<string, number>>({});
  const ready = v.court.filter((x) => x.ready);
  const own = v.units.filter((u) => u.power === me).sort((a, b) => byName(a.province, b.province));
  const name = (id: string | null): string => v.court.find((x) => x.id === id)?.name ?? id ?? "";
  const lands = map.landProvinces.map((p) => p.id).sort(byName);
  return (
    <div className="section">
      <h3>Command at a distance</h3>
      <p className="muted">
        <small>
          Your court is in {provinceName(v.courtAt)}
          {v.courtTo !== null && <>, on the road to {provinceName(v.courtTo)}</>}. Orders for places your couriers cannot reach this season go out now and are carried out when they arrive.
        </small>
      </p>
      <div className="row">
        <select value={courtTo} onChange={(e) => setCourtTo(e.target.value)}>
          <option value="">— move the court to? —</option>
          {lands.map((p) => (
            <option key={p} value={p}>
              {provinceName(p)}
            </option>
          ))}
        </select>
        <button className="small" disabled={courtTo === ""} onClick={() => add(moveCourt(courtTo))}>
          Set out
        </button>
      </div>
      {own.map((u) => (
        <div className="unitrow" key={u.province}>
          <span>
            {u.kind === "Army" ? "Army" : "Fleet"} {provinceName(u.province)}
            {u.commander !== null && <span className="muted"> · {u.commandFrom > v.turn ? `${name(u.commander)} on his way (turn ${u.commandFrom})` : `commanded by ${name(u.commander)}`}</span>}
            {u.mandate !== null && <span className="muted"> · mandate: {mandateText(u.mandate)}</span>}
          </span>
          <span className="row" style={{ gap: ".3rem" }}>
            {u.commander === null ? (
              <>
                <select value={grant[u.province] ?? ""} onChange={(e) => setGrant({ ...grant, [u.province]: e.target.value })}>
                  <option value="">— grant command to? —</option>
                  {ready.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
                <button className="small" disabled={(grant[u.province] ?? "") === ""} onClick={() => add(command(u.province, grant[u.province]))}>
                  Grant
                </button>
              </>
            ) : (
              !u.relieving && (
                <button className="small" onClick={() => add(relieve(u.province))}>
                  Take back the command
                </button>
              )
            )}
            {u.mandate !== null && (
              <button className="small" onClick={() => add(mandateOrder(u.province, null))}>
                Clear mandate
              </button>
            )}
          </span>
          {u.kind === "Army" && (
            <span className="row" style={{ gap: ".3rem" }}>
              <span className="muted">
                <small>
                  food: {u.buy ? "buys" : "takes"} where it stands by leave, carries {u.chest} shekels for it
                </small>
              </span>
              <input type="number" min={0} style={{ width: "5rem" }} value={food[u.province] ?? 0} onChange={(e) => setFood({ ...food, [u.province]: Math.max(0, Number(e.target.value) || 0) })} />
              <button className="small" onClick={() => add(supply(u.province, true, food[u.province] ?? 0))}>
                Buy food, send gold
              </button>
              <button className="small" onClick={() => add(supply(u.province, false))}>
                Take food
              </button>
            </span>
          )}
        </div>
      ))}
      {own.length > 0 && (
        <div className="row" style={{ flexWrap: "wrap", gap: ".3rem" }}>
          <select value={m.unit} onChange={(e) => setM({ ...m, unit: e.target.value })}>
            <option value="">— mandate for? —</option>
            {own.map((u) => (
              <option key={u.province} value={u.province}>
                {u.kind === "Army" ? "Army" : "Fleet"} {provinceName(u.province)}
              </option>
            ))}
          </select>
          <select value={m.task} onChange={(e) => setM({ ...m, task: e.target.value as MandateTask })}>
            {MandateTaskValues.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select value={m.target} onChange={(e) => setM({ ...m, target: e.target.value })}>
            <option value="">— where? —</option>
            {lands.map((p) => (
              <option key={p} value={p}>
                {provinceName(p)}
              </option>
            ))}
          </select>
          <select value={m.power} onChange={(e) => setM({ ...m, power: e.target.value })}>
            <option value="">— whose troops? —</option>
            {AllPowers.filter((p) => p !== me).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select value={m.engage} onChange={(e) => setM({ ...m, engage: e.target.value as Engage })}>
            {EngageValues.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
          <select value={m.withdraw} onChange={(e) => setM({ ...m, withdraw: e.target.value as Withdraw })}>
            {WithdrawValues.map((x) => (
              <option key={x} value={x}>
                {x === "never" ? "hold at all costs" : "fall back if outnumbered"}
              </option>
            ))}
          </select>
          <button
            className="small"
            disabled={m.unit === ""}
            onClick={() =>
              add(
                mandateOrder(
                  m.unit,
                  newMandate({ task: m.task, target: m.target === "" ? null : m.target, power: m.power === "" ? null : (m.power as Power), engage: m.engage, withdraw: m.withdraw, until: m.until > 0 ? m.until : null }),
                ),
              )
            }
          >
            Give the mandate
          </button>
        </div>
      )}
      {v.bands
        .filter((x) => own.some((u) => u.province === x.province && u.kind === "Army"))
        .map((x) => (
          <div className="row" key={`band-${x.province}`}>
            <small>
              {x.chief}'s band of {x.men} in {provinceName(x.province)}, where your army stands
            </small>
            <button className="small" onClick={() => add(enlist(x.province, bandCost(x.men) * 4 * 3, 4))}>
              Offer {bandCost(x.men) * 4 * 3} shekels for four seasons' service
            </button>
          </div>
        ))}
      <h4>Governors</h4>
      {v.governors.map((g) => (
        <div className="row" key={g.province}>
          <small>
            {provinceName(g.province)}: {name(g.character)}
            {g.from > v.turn ? ` (from turn ${g.from})` : ""}, levies {g.raised} of {g.levies}
          </small>
          {!g.relieving && (
            <button className="small" onClick={() => add(unseat(g.province))}>
              Take back
            </button>
          )}
        </div>
      ))}
      <div className="row" style={{ gap: ".3rem" }}>
        <select value={gov.province} onChange={(e) => setGov({ ...gov, province: e.target.value })}>
          <option value="">— province? —</option>
          {mine
            .filter((p) => !map.get(p).isSea && !v.governors.some((g) => g.province === p))
            .sort(byName)
            .map((p) => (
              <option key={p} value={p}>
                {provinceName(p)}
              </option>
            ))}
        </select>
        <select value={gov.person} onChange={(e) => setGov({ ...gov, person: e.target.value })}>
          <option value="">— governor? —</option>
          {[...ready, ...v.known.filter((x) => x.status === "free" && x.where === "at your court")].map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        <select value={gov.levies} onChange={(e) => setGov({ ...gov, levies: Number(e.target.value) })}>
          {Array.from({ length: MostGovernorLevies + 1 }, (_, i) => i).map((i) => (
            <option key={i} value={i}>
              {i} levies
            </option>
          ))}
        </select>
        <button className="small" disabled={gov.province === "" || gov.person === ""} onClick={() => add(govern(gov.province, gov.person, gov.levies))}>
          Grant the governorship
        </button>
      </div>
    </div>
  );
}
