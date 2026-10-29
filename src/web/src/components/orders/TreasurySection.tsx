import {
  assay,
  caravan,
  feed,
  harbourOf,
  priceForTen,
  ship,
  toll,
  trade,
  TradeData,
  purchase,
  sell,
  tax,
  welcome,
  deport,
  expel,
  returnRunaways,
  cede,
  fortify,
  giftUnit,
  raise,
  sally,
  type Power,
  type UnitKind,
} from "@amarna/engine";
import { powerName, provinceName, shekels } from "../../ui/format.ts";
import { byName } from "../../ui/order-draft.ts";
import { map } from "./form.ts";
import type { OrdersContext } from "./use-orders.ts";

/** The orders panel's Treasury and land: split from OrdersPanel.tsx, unchanged. */
export function TreasurySection({ c }: { c: OrdersContext }) {
  const { draft, state, v, me, f, set, others, add, price, sallying } = c;
  return (
    <>
    <div className="section">
      <h3>Treasury and land</h3>
      <div className="row">
        <select value={f.raiseAt} onChange={(e) => set({ raiseAt: e.target.value })}>
          <option value="">Raise troops in…</option>
          {map
            .homeOf(me)
            .filter((p) => v.owner.tryGet(p.id) === me && v.units.every((u) => u.province !== p.id))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </select>
        <select value={f.raiseKind} onChange={(e) => set({ raiseKind: e.target.value })}>
          <option value="Army">army ({shekels(price("army"))})</option>
          <option value="Fleet">fleet ({shekels(price("fleet"))})</option>
        </select>
        <button className="small" disabled={f.raiseAt === ""} onClick={() => add(raise(f.raiseAt, f.raiseKind as UnitKind))}>
          Add
        </button>
      </div>
      {/* Walls (the siege package): a level higher at the end of the season, for the price of the new level, then upkeep above
          the map's own. Not where foreign troops stand within, which the rules refuse (since the review of the siege package). */}
      <div className="row" style={{ marginTop: ".4rem" }}>
        <select value={f.fortifyAt} onChange={(e) => set({ fortifyAt: e.target.value })}>
          <option value="">Strengthen walls in…</option>
          {[...v.owner]
            .filter(
              ([id, o]) =>
                o === me &&
                v.walls.getOrDefault(id, 0) < state.config.maxWalls &&
                v.sieges.every((s) => s.province !== id) &&
                !v.units.some((u) => u.province === id && u.power !== me),
            )
            .map(([id]) => id)
            .sort(byName)
            .map((id) => {
              const level = v.walls.getOrDefault(id, 0) + 1;
              return (
                <option key={id} value={id}>
                  {provinceName(id)} to level {level} ({shekels(level * price("fortifyPerLevel"))})
                </option>
              );
            })}
        </select>
        <button className="small" disabled={f.fortifyAt === ""} onClick={() => add(fortify(f.fortifyAt))}>
          Add
        </button>
      </div>
      {/* Grain (item 9+a): sell or buy at a province's own market, hand it to its town, or send a caravan with it. */}
      <div className="row" style={{ marginTop: ".4rem" }}>
        <select value={f.grainAction} onChange={(e) => set({ grainAction: e.target.value })}>
          <option value="sell">Sell grain</option>
          <option value="purchase">Buy grain</option>
          <option value="feed">Feed the town</option>
          <option value="caravan">Send a caravan</option>
          <option value="tax">Set the tax</option>
        </select>
        <select value={f.grainAt} onChange={(e) => set({ grainAt: e.target.value })}>
          <option value="">{f.grainAction === "caravan" ? "from…" : "at…"}</option>
          {v.provinces
            .map((x) => x.province)
            .sort(byName)
            .map((id) => {
              const x = v.provinces.find((y) => y.province === id)!;
              return (
                <option key={id} value={id}>
                  {f.grainAction === "tax"
                    ? `${provinceName(id)} (tax ${x.taxRate}%, harvest ${x.harvest}, ${x.fed < 1000 ? `ate ${Math.round(x.fed / 10)}% of its need` : "fed"})`
                    : `${provinceName(id)} (stores ${x.stores}/${x.capacity}, market ${x.stock}, ${shekels(priceForTen(x.price))} for ten, purse ${shekels(x.purse)})`}
                </option>
              );
            })}
        </select>
        {f.grainAction === "caravan" && (
          <select value={f.grainTo} onChange={(e) => set({ grainTo: e.target.value })}>
            <option value="">to…</option>
            {[...new Set([...v.provinces.map((x) => x.province), ...v.units.filter((u) => u.power === me && !map.get(u.province).isSea).map((u) => u.province)])]
              .filter((id) => id !== f.grainAt)
              .sort(byName)
              .map((id) => (
                <option key={id} value={id}>
                  {provinceName(id)}
                </option>
              ))}
          </select>
        )}
        <input type="number" min={f.grainAction === "tax" ? 0 : 1} placeholder={f.grainAction === "tax" ? "percent" : "measures"} value={f.grainAmount} onChange={(e) => set({ grainAmount: e.target.value })} style={{ width: "6rem" }} />
        <button
          className="small"
          disabled={f.grainAt === "" || f.grainAmount === "" || !(Number(f.grainAmount) > 0 || (f.grainAction === "tax" && Number(f.grainAmount) === 0)) || (f.grainAction === "caravan" && f.grainTo === "")}
          onClick={() => {
            const n = Math.floor(Number(f.grainAmount));
            add(
              f.grainAction === "sell"
                ? sell(f.grainAt, n)
                : f.grainAction === "purchase"
                  ? purchase(f.grainAt, n)
                  : f.grainAction === "feed"
                    ? feed(f.grainAt, n)
                    : f.grainAction === "tax"
                      ? tax(n, f.grainAt)
                      : caravan(f.grainAt, f.grainTo, n),
            );
          }}
        >
          Add
        </button>
      </div>
      {/* People in a king's hands (item 10+b): settle the loose, deport, send runaways back, put the mouths out. */}
      <div className="row" style={{ marginTop: ".4rem" }}>
        <select value={f.peopleAction} onChange={(e) => set({ peopleAction: e.target.value, peopleTo: "" })}>
          <option value="welcome">Settle the loose men</option>
          <option value="returnRunaways">Send runaways back</option>
          <option value="deport">Deport people</option>
          <option value="expel">Put out the mouths that cannot fight</option>
        </select>
        <select value={f.peopleAt} onChange={(e) => set({ peopleAt: e.target.value, peopleTo: "" })}>
          <option value="">{f.peopleAction === "deport" ? "from…" : "in…"}</option>
          {v.provinces
            .filter((x) => (f.peopleAction === "deport" ? map.get(x.province).home !== me : f.peopleAction === "expel" ? v.sieges.some((s) => s.province === x.province) : f.peopleAction === "returnRunaways" ? x.runaways.size > 0 : x.loose > 0))
            .map((x) => x.province)
            .sort(byName)
            .map((id) => {
              const x = v.provinces.find((y) => y.province === id)!;
              return (
                <option key={id} value={id}>
                  {`${provinceName(id)} (settled ${x.settled.toLocaleString("en")} of ${x.room.toLocaleString("en")}, loose ${x.loose.toLocaleString("en")})`}
                </option>
              );
            })}
        </select>
        {f.peopleAction === "deport" && (
          <select value={f.peopleTo} onChange={(e) => set({ peopleTo: e.target.value })}>
            <option value="">to…</option>
            {v.provinces
              .map((x) => x.province)
              .filter((id) => id !== f.peopleAt)
              .sort(byName)
              .map((id) => (
                <option key={id} value={id}>
                  {provinceName(id)}
                </option>
              ))}
          </select>
        )}
        {f.peopleAction === "returnRunaways" && (
          <select value={f.peopleTo} onChange={(e) => set({ peopleTo: e.target.value })}>
            <option value="">to…</option>
            {[...(v.provinces.find((x) => x.province === f.peopleAt)?.runaways.entries() ?? [])].map(([k, n]) => (
              <option key={k} value={k}>
                {powerName(k as Power)} ({n.toLocaleString("en")})
              </option>
            ))}
          </select>
        )}
        {f.peopleAction === "expel" && <input type="number" min={1} max={100} placeholder="in 100" value={f.peopleAmount} onChange={(e) => set({ peopleAmount: e.target.value })} style={{ width: "5rem" }} />}
        {f.peopleAction === "deport" && <input type="number" min={1} placeholder="people" value={f.peopleAmount} onChange={(e) => set({ peopleAmount: e.target.value })} style={{ width: "6rem" }} />}
        <button
          className="small"
          disabled={f.peopleAt === "" || ((f.peopleAction === "deport" || f.peopleAction === "returnRunaways") && f.peopleTo === "") || ((f.peopleAction === "deport" || f.peopleAction === "expel") && !(Number(f.peopleAmount) > 0))}
          onClick={() =>
            add(
              f.peopleAction === "welcome"
                ? welcome(f.peopleAt)
                : f.peopleAction === "expel"
                  ? expel(f.peopleAt, Math.min(100, Math.floor(Number(f.peopleAmount))))
                  : f.peopleAction === "deport"
                    ? deport(f.peopleAt, f.peopleTo, Math.floor(Number(f.peopleAmount)))
                    : returnRunaways(f.peopleAt, f.peopleTo as Power),
            )
          }
        >
          Add
        </button>
      </div>
      {/* Trade abroad (item 9+b): a caravan or a smuggler to a foreign market, or a fleet in cargo service. */}
      <div className="row" style={{ marginTop: ".4rem" }}>
        <select value={f.tradeAction} onChange={(e) => set({ tradeAction: e.target.value, tradeFrom: "", tradeTo: "" })}>
          <option value="trade">Trade abroad by caravan</option>
          <option value="smuggle">Smuggle abroad</option>
          <option value="shipTrade">Trade abroad by ship</option>
          <option value="shipDeliver">Ship grain to</option>
        </select>
        <select value={f.tradeFrom} onChange={(e) => set({ tradeFrom: e.target.value })}>
          <option value="">from…</option>
          {v.provinces
            .map((x) => x.province)
            .filter((id) => !f.tradeAction.startsWith("ship") || (harbourOf(map.get(id)) > 0 && v.units.some((u) => u.power === me && u.kind === "Fleet" && (u.province === id || u.province === map.get(id).waters))))
            .sort(byName)
            .map((id) => (
              <option key={id} value={id}>
                {provinceName(id)} (stores {v.provinces.find((y) => y.province === id)!.stores})
              </option>
            ))}
        </select>
        <select value={f.tradeTo} onChange={(e) => set({ tradeTo: e.target.value })}>
          <option value="">to…</option>
          {map.landProvinces
            .filter((x) => !x.kingless && x.id !== f.tradeFrom && (f.tradeAction === "shipDeliver" || !v.provinces.some((y) => y.province === x.id)) && (!f.tradeAction.startsWith("ship") || harbourOf(x) > 0))
            .map((x) => x.id)
            .sort(byName)
            .map((id) => {
              const seen = v.markets.tryGet(id);
              return (
                <option key={id} value={id}>
                  {provinceName(id)}
                  {seen !== undefined ? ` (${shekels(priceForTen(seen.price))} for ten, purse ${shekels(seen.purse)}, seen season ${seen.turn})` : ""}
                </option>
              );
            })}
        </select>
        <input type="number" min={0} max={f.tradeAction.startsWith("ship") ? TradeData.shipCapacity : undefined} placeholder="measures" value={f.tradeGrain} onChange={(e) => set({ tradeGrain: e.target.value })} style={{ width: "6rem" }} />
        {f.tradeAction !== "shipDeliver" && <input type="number" min={0} placeholder="gold to buy with" value={f.tradeGold} onChange={(e) => set({ tradeGold: e.target.value })} style={{ width: "7rem" }} />}
        <button
          className="small"
          disabled={f.tradeFrom === "" || f.tradeTo === "" || !(Math.max(0, Number(f.tradeGrain) || 0) + (f.tradeAction === "shipDeliver" ? 0 : Math.max(0, Number(f.tradeGold) || 0)) > 0)}
          onClick={() => {
            const grain = Math.max(0, Math.floor(Number(f.tradeGrain) || 0));
            const gold = f.tradeAction === "shipDeliver" ? 0 : Math.max(0, Math.floor(Number(f.tradeGold) || 0));
            const fleet = v.units.find((u) => u.power === me && u.kind === "Fleet" && u.province === f.tradeFrom)?.province ?? map.get(f.tradeFrom).waters ?? f.tradeFrom;
            add(
              f.tradeAction === "trade" || f.tradeAction === "smuggle"
                ? trade(f.tradeFrom, f.tradeTo, grain, gold, f.tradeAction === "smuggle")
                : ship(fleet, f.tradeFrom, f.tradeTo, grain, gold, f.tradeAction === "shipTrade"),
            );
          }}
        >
          Add
        </button>
      </div>
      {/* Tolls (item 9+b): a percent of the goods entering your land, for everyone or one partner, in all your land or one province. */}
      <div className="row" style={{ marginTop: ".4rem" }}>
        <span>Toll</span>
        <input type="number" min={0} max={TradeData.tollMost} placeholder="%" value={f.tollPercent} onChange={(e) => set({ tollPercent: e.target.value })} style={{ width: "4rem" }} />
        <select value={f.tollPartner} onChange={(e) => set({ tollPartner: e.target.value })}>
          <option value="">on everyone</option>
          {others.map((p) => (
            <option key={p} value={p}>
              on {p}
            </option>
          ))}
        </select>
        <select value={f.tollAt} onChange={(e) => set({ tollAt: e.target.value })}>
          <option value="">in all your land</option>
          {v.provinces
            .map((x) => x.province)
            .sort(byName)
            .map((id) => (
              <option key={id} value={id}>
                at {provinceName(id)}
              </option>
            ))}
        </select>
        <button
          className="small"
          disabled={f.tollPercent.trim() === "" || !(Number(f.tollPercent) >= 0 && Number(f.tollPercent) <= TradeData.tollMost)}
          onClick={() => add(toll(Math.floor(Number(f.tollPercent)), f.tollPartner === "" ? null : (f.tollPartner as Power), f.tollAt === "" ? null : f.tollAt))}
        >
          Add
        </button>
        {v.tolls.length > 0 && (
          <span className="muted">
            {" "}
            Known: {v.tolls.map((t) => `${t.holder} ${t.percent}%${t.partner !== null ? ` on ${t.partner}` : ""}${t.province !== null ? ` at ${provinceName(t.province)}` : ""}`).join("; ")}
          </span>
        )}
      </div>
      {sallying.length > 0 && (
        // A sally (the siege package): the walls of a city with foreign troops within them support one attack on them, for +1.
        <div className="row" style={{ marginTop: ".4rem" }}>
          <select value={f.sallyCity} onChange={(e) => set({ sallyCity: e.target.value, sallyFrom: "" })}>
            <option value="">Sally from the walls of…</option>
            {sallying.map((c) => (
              <option key={c} value={c}>
                {provinceName(c)}
              </option>
            ))}
          </select>
          {f.sallyCity !== "" && (
            <select value={f.sallyFrom} onChange={(e) => set({ sallyFrom: e.target.value })}>
              <option value="">supporting the attack from…</option>
              {[...new Set(map.neighbors(f.sallyCity))].sort(byName).map((n) => (
                <option key={n} value={n}>
                  {provinceName(n)}
                </option>
              ))}
            </select>
          )}
          <button className="small" disabled={f.sallyCity === "" || f.sallyFrom === ""} onClick={() => add(sally(f.sallyCity, f.sallyFrom))}>
            Add
          </button>
        </div>
      )}
      <div className="row" style={{ marginTop: ".4rem" }}>
        <select value={f.cedeWhat} onChange={(e) => set({ cedeWhat: e.target.value })}>
          <option value="">Cede a province…</option>
          {[...v.owner]
            .filter(([, o]) => o === me)
            .map(([id]) => id)
            .sort(byName)
            .map((id) => (
              <option key={id} value={id}>
                {provinceName(id)}
              </option>
            ))}
        </select>
        <select value={f.cedeTo} onChange={(e) => set({ cedeTo: e.target.value })}>
          {others.map((p) => (
            <option key={p} value={p}>
              to {powerName(p)}
            </option>
          ))}
        </select>
        <button className="small" disabled={f.cedeWhat === ""} onClick={() => add(cede(f.cedeWhat, f.cedeTo as Power))}>
          Add
        </button>
      </div>
      <div className="row" style={{ marginTop: ".4rem" }}>
        <select value={f.giftUnit} onChange={(e) => set({ giftUnit: e.target.value })}>
          <option value="">Give troops…</option>
          {[...draft.units.keys()].map((at) => (
            <option key={at} value={at}>
              {provinceName(at)}
            </option>
          ))}
        </select>
        <select value={f.giftTo} onChange={(e) => set({ giftTo: e.target.value })}>
          {others.map((p) => (
            <option key={p} value={p}>
              to {powerName(p)}
            </option>
          ))}
        </select>
        <button className="small" disabled={f.giftUnit === ""} onClick={() => add(giftUnit(f.giftUnit, f.giftTo as Power))}>
          Add
        </button>
      </div>
      {v.unassayedGold.map((lot) => (
        <div className="row" style={{ marginTop: ".4rem" }} key={lot.id}>
          <small>
            {shekels(lot.weighed)} from {powerName(lot.from)} (inventory said {shekels(lot.stated)}), not yet assayed
          </small>
          <button className="small" onClick={() => add(assay(lot.id))}>
            Assay ({shekels(price("assay"))})
          </button>
        </div>
      ))}
    </div>
    </>
  );
}
