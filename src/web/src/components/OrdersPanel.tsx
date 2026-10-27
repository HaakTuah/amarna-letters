import {
  AllPowers,
  Greeting,
  MaxStanding,
  WorldMap,
  assay,
  authenticate,
  buy,
  captive,
  cede,
  check,
  counterIntel,
  dismiss,
  dispatch,
  forge,
  fortify,
  giftUnit,
  newGreetingOptions,
  newStandingRequest,
  newTabletProposal,
  payRansom,
  placeSpy,
  raise,
  recall,
  release,
  renew,
  hire,
  sally,
  seekCandidates,
  unitOf,
  type GameState,
  type GreetingOptions,
  type Order,
  type Power,
  type UnitKind,
} from "@amarna/engine";
import { useState } from "react";
import { describeOrder, dated, powerName, provinceName, shekels, when } from "../ui/format.ts";
import { OrderDraft, byName } from "../ui/order-draft.ts";
import { Emblem } from "./Emblem.tsx";
import { Person } from "./Person.tsx";

const map = WorldMap.default;
const clamp = (x: number, lo: number, hi: number): number => Math.min(Math.max(x, lo), hi);
const num = (s: string): number => (s.trim() === "" || !Number.isFinite(Number(s)) ? 0 : Math.trunc(Number(s)));
const unitLetter = (k: UnitKind): string => (k === "Army" ? "A" : "F");

interface Form {
  raiseAt: string;
  raiseKind: string;
  buyCity: string;
  fortifyAt: string;
  sallyCity: string;
  sallyFrom: string;
  cedeWhat: string;
  cedeTo: string;
  giftUnit: string;
  giftTo: string;
  envoy: string;
  sendTo: string;
  letter: string;
  mandate: string;
  tabletText: string;
  gold: number;
  purity: number;
  watch: number;
  checkSpend: number;
  authSpend: number;
  ransom: number;
  term: number;
  oath: boolean;
  g: GreetingOptions;
  copies: string[];
  wages: Record<string, number>;
  checkWho: string;
  spyWho: string;
  spyAt: string;
  poisonText: string;
  releaseWords: string;
  forgeWho: string;
  forgeText: string;
  forgeSeals: Power[];
  // The standing order being written: what it waits for, and its orders so far.
  stWhen: string;
  stPlace: string;
  stPower: string;
  stUnit: string;
  stKind: string;
  stTarget: string;
  stTo: string;
  stOrders: Order[];
}

function newForm(me: Power): Form {
  const first = AllPowers.find((p) => p !== me)!;
  const other = (p: Power): Power => (p === me ? first : p);
  return {
    raiseAt: "",
    raiseKind: "Army",
    buyCity: "",
    fortifyAt: "",
    sallyCity: "",
    sallyFrom: "",
    cedeWhat: "",
    cedeTo: other("Egypt"),
    giftUnit: "",
    giftTo: other("Egypt"),
    envoy: "",
    sendTo: other("Hatti"),
    letter: "",
    mandate: "",
    tabletText: "",
    gold: 0,
    purity: 100,
    watch: 0,
    checkSpend: 30,
    authSpend: 40,
    ransom: 80,
    term: 6,
    oath: false,
    g: newGreetingOptions(),
    copies: [],
    wages: {},
    checkWho: "",
    spyWho: "",
    spyAt: other("Hatti"),
    poisonText: "",
    releaseWords: "",
    forgeWho: "",
    forgeText: "",
    forgeSeals: [],
    stWhen: "enters",
    stPlace: "",
    stPower: "",
    stUnit: "",
    stKind: "support",
    stTarget: "",
    stTo: "",
    stOrders: [],
  };
}

/** A human seat's orders for one season: units, treasury, envoys, court and tablets. */
export function OrdersPanel({ draft, state, onChanged, onSubmit }: { draft: OrderDraft; state: GameState; onChanged: () => void; onSubmit: () => void }) {
  const v = draft.view;
  const me = v.power;
  const [f, setF] = useState<Form>(() => newForm(me));
  const set = (patch: Partial<Form>): void => setF((x) => ({ ...x, ...patch }));
  const wage = (id: string, fallback: number): number => f.wages[id] ?? fallback;
  for (const c of v.known) if (c.askingPrice !== null && f.wages[c.id] === undefined) f.wages[c.id] = c.askingPrice;
  for (const c of v.court) {
    const w = c.noticePrice ?? c.wage;
    if (w !== null && f.wages[c.id] === undefined) f.wages[c.id] = w;
  }

  const visibleUnits = [...v.units].sort((a, b) => AllPowers.indexOf(a.power) - AllPowers.indexOf(b.power) || byName(a.province, b.province));
  const ready = v.court.filter((c) => c.ready);
  const reserved = new Set(
    draft.other.map((o) => (o.type === "dispatch" ? o.envoy : o.type === "spy" ? o.character : o.type === "forge" ? o.character : null)).filter((x) => x !== null),
  );
  const others = AllPowers.filter((p) => p !== me && !v.fallen.includes(p));
  const add = (o: Order): void => {
    draft.other.push(o);
    onChanged();
  };
  const term = clamp(f.term, 1, 30);
  const price = (k: string): number => v.prices.getOrDefault(k, 0);
  const sallyMin = v.prices.getOrDefault("sallyMinWalls", 2);
  const sallying = [...v.owner]
    .filter(([id, o]) => o === me && v.walls.getOrDefault(id, 0) >= sallyMin && sallyMin > 0 && v.units.some((u) => u.province === id && u.power !== me))
    .map(([id]) => id)
    .sort(byName);

  const addStandingOrder = (): void => {
    const order = f.stUnit === "" ? null : OrderDraft.unitOrder(f.stUnit, f.stKind, f.stTarget, f.stTo);
    if (order === null) return;
    set({ stOrders: [...f.stOrders, order], stUnit: "", stTarget: "", stTo: "" });
  };
  const addStanding = (): void => {
    if (f.stPlace === "" || f.stOrders.length === 0) return;
    const whose = (AllPowers as readonly string[]).includes(f.stPower) ? (f.stPower as Power) : null;
    draft.standing.push(
      newStandingRequest({
        when: f.stWhen === "attacked" ? "UnitAttacked" : "UnitEnters",
        province: f.stPlace,
        power: f.stWhen === "enters" ? whose : null,
        orders: [...f.stOrders],
      }),
    );
    set({ stOrders: [], stPlace: "", stPower: "" });
    onChanged();
  };
  const addDispatch = (): void => {
    const proposal = f.tabletText.trim() === "" ? null : newTabletProposal({ text: f.tabletText.trim(), allianceOath: f.oath });
    add(
      dispatch(f.envoy, f.sendTo as Power, f.letter.trim(), {
        mandate: f.mandate.trim(),
        greeting: { ...f.g },
        gold: Math.max(0, f.gold),
        purityPercent: clamp(f.purity, 10, 100),
        proposal,
        copies: f.copies.length > 0 ? [...f.copies] : null,
      }),
    );
    set({ envoy: "", letter: "", mandate: "", tabletText: "", gold: 0, purity: 100, oath: false, copies: [], g: newGreetingOptions() });
  };
  const addSpy = (): void => {
    add(f.spyAt.startsWith("@") ? placeSpy(f.spyWho, null, f.spyAt.slice(1)) : placeSpy(f.spyWho, f.spyAt as Power));
    set({ spyWho: "" });
  };
  const toggle = <T,>(list: T[], item: T, on: boolean): T[] => (on ? (list.includes(item) ? list : [...list, item]) : list.filter((x) => x !== item));
  const g = f.g;
  const greetingText = Greeting.render(me, f.sendTo as Power, g);

  return (
    <div className="orders">
      <div className="section">
        <h3>Orders for {when(v.turn, me)}</h3>
        <p className="muted">
          Treasury {shekels(v.gold)} · income {shekels(v.income)} · upkeep {shekels(v.upkeep)}
          {v.wallUpkeep > 0 ? ` · walls ${shekels(v.wallUpkeep)}` : ""} · wages {shekels(v.wages)} (for people away, owed as back pay) · back pay owed{" "}
          {shekels(v.backPay)}. Growth so far: {v.startStrength > 0 ? (v.strength / v.startStrength).toFixed(2) : "-"}.
        </p>
        <p className="muted">
          <small>
            Click one of your units on the map, then a destination, to move it. Click the unit again to hold. Envoys take: {v.travelTimes.join("; ")}.
          </small>
        </p>
      </div>

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
                </span>
                <select value={d.kind} onChange={(e) => change({ kind: e.target.value, target: null, to: null })}>
                  <option value="hold">Hold</option>
                  <option value="move">Move</option>
                  <option value="support">Support</option>
                  {unit.kind === "Fleet" && map.get(at).isSea && <option value="convoy">Convoy</option>}
                  {unit.kind === "Army" && v.walls.getOrDefault(at, 0) > 0 && v.owner.tryGet(at) !== me && <option value="besiege">Besiege the city</option>}
                  <option value="disband">Disband</option>
                </select>
                <span className="row" style={{ gap: ".3rem" }}>
                  {d.kind === "move" && (
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

      {/* Standing orders: every seat may keep them, awake or asleep (since the additions to the fix pass after item 4). */}
      <div className="section standing">
        <h3>Standing orders</h3>
        <p className="muted">
          <small>
            A standing order waits for a move you can see and answers it in the same season, as your commanders on the spot would: its orders then replace
            yours for the same troops. It first fires next season, fires once, and costs nothing to give. At most {MaxStanding}.
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
        <div className="row" style={{ marginTop: ".4rem" }}>
          <select value={f.buyCity} onChange={(e) => set({ buyCity: e.target.value })}>
            <option value="">Buy a free city…</option>
            {[...v.owner]
              .filter(([, o]) => o === null)
              .map(([g]) => g)
              .filter((g) =>
                map.withinReach(
                  g,
                  me,
                  v.owner,
                  v.units.filter((u) => u.power === me).map((u) => u.province),
                ),
              )
              .sort(byName)
              .map((g) => (
                <option key={g} value={g}>
                  {provinceName(g)} ({shekels(map.get(g).yield * price("cityPricePerYield"))})
                </option>
              ))}
          </select>
          <button className="small" disabled={f.buyCity === ""} onClick={() => add(buy(f.buyCity))}>
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
                        ["omit", "no greeting"],
                      ] as const
                    ).map(([k, label]) => (
                      <label key={k}>
                        <input type="checkbox" checked={g[k]} onChange={(e) => set({ g: { ...g, [k]: e.target.checked } })} /> {label}
                      </label>
                    ))}
                  </div>
                  <div className="tablet" style={{ fontSize: ".88rem", marginTop: ".3rem" }}>
                    {greetingText.length > 0 ? greetingText : "(no greeting)"}
                  </div>
                </div>
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
                <div className="field">
                  <span>Mandate: what the envoy may agree to</span>
                  <input value={f.mandate} onChange={(e) => set({ mandate: e.target.value })} enterKeyHint="done" autoComplete="off" placeholder="e.g. peace and gifts; no land" />
                </div>
                <div className="row">
                  <label>
                    Gold <input type="number" inputMode="numeric" min="0" value={f.gold} onChange={(e) => set({ gold: num(e.target.value) })} />
                  </label>
                  <label title="Below 100% the gold is debased: the receiver sees only its weight until they pay for an assay">
                    purity % <input type="number" inputMode="numeric" min="10" max="100" value={f.purity} onChange={(e) => set({ purity: num(e.target.value) })} />
                  </label>
                </div>
                <div className="field" style={{ marginTop: ".4rem" }}>
                  <span>A tablet for both kings to seal (optional, {shekels(price("tabletFee"))} for the scribe)</span>
                  <textarea maxLength={1200} value={f.tabletText} onChange={(e) => set({ tabletText: e.target.value })} placeholder="By Shamash: ..." />
                  <label>
                    <input type="checkbox" checked={f.oath} onChange={(e) => set({ oath: e.target.checked })} /> a sworn alliance
                    {state.config.sharedVictory ? " (counts for a shared victory)" : ""}
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
                <button className="primary small" disabled={f.letter.trim().length === 0} onClick={addDispatch}>
                  Send this envoy
                </button>
              </>
            )}
          </>
        )}
      </div>

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
                  Wage{" "}
                  <input type="number" min="1" value={f.wages[c.id] ?? ""} onChange={(e) => set({ wages: { ...f.wages, [c.id]: num(e.target.value) } })} />
                </label>
                <button className="small" onClick={() => add(hire(c.id, wage(c.id, c.askingPrice ?? 15), term))}>
                  Hire for {term} seasons
                </button>
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
                Wage{" "}
                <input type="number" min="1" value={f.wages[c.id] ?? ""} onChange={(e) => set({ wages: { ...f.wages, [c.id]: num(e.target.value) } })} />
              </label>
              <button
                className="small"
                disabled={draft.other.some((o) => o.type === "renew" && o.character === c.id)}
                onClick={() => add(renew(c.id, wage(c.id, c.noticePrice ?? c.wage ?? 15), term))}
              >
                Renew for {term} seasons
              </button>
            </div>
          ))}
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
              <input style={{ width: "100%", marginTop: ".3rem" }} value={f.poisonText} onChange={(e) => set({ poisonText: e.target.value })} placeholder="If turned: what they should report home" />
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
        <button className="primary" onClick={onSubmit}>
          Seal the orders for this season
        </button>
      </div>
    </div>
  );
}
