import {
  AllPowers,
  Greeting,
  dispatch,
  newGreetingOptions,
  newStandingRequest,
  newTabletProposal,
  placeSpy,
  newAuthority,
  type GameState,
  type Order,
  type Power,
  feeFor,
} from "@amarna/engine";
import { OrderDraft, byName } from "../../ui/order-draft.ts";
import { useState } from "react";
import { type Form, clamp, newForm } from "./form.ts";

/** The orders panel's state and actions, shared by its sections. */
export function useOrders(draft: OrderDraft, state: GameState, onChanged: () => void, onSubmit: (sleep: boolean) => void) {
  const v = draft.view;
  const me = v.power;
  const [f, setF] = useState<Form>(() => newForm(me));
  const set = (patch: Partial<Form>): void => setF((x) => ({ ...x, ...patch }));
  // Structured press (item 8): letters and tablets are clauses only.
  const structured = state.config.pressMode === "structured";
  // Item 11a: a job's whole fee, as typed, else what the person would take for the term with half handed over now.
  const wage = (id: string, ask: number): number => f.wages[id] ?? feeFor(ask, clamp(f.term, 1, 30), 50, v.trust);

  const visibleUnits = [...v.units].sort((a, b) => AllPowers.indexOf(a.power) - AllPowers.indexOf(b.power) || byName(a.province, b.province));
  const ready = v.court.filter((c) => c.ready);
  const reserved = new Set(
    draft.other.map((o) => (o.type === "dispatch" ? o.envoy : o.type === "spy" ? o.character : o.type === "forge" ? o.character : null)).filter((x) => x !== null),
  );
  const others = AllPowers.filter((p) => p !== me && !v.fallen.includes(p));
  // The provinces we hold, which an envoy with our seal may cede or open (item 9).
  const mine = [...v.owner.entries()].filter(([, o]) => o === me).map(([k]) => k);
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
    const words = structured ? "" : f.tabletText.trim();
    const proposal = words === "" && f.tabletClauses.length === 0 ? null : newTabletProposal({ text: words, allianceOath: f.oath, vassal: f.vassal === "me" ? v.power : f.vassal === "them" ? (f.sendTo as Power) : null, clauses: [...f.tabletClauses] });
    add(
      dispatch(f.envoy, f.sendTo as Power, structured ? "" : f.letter.trim(), {
        clauses: [...f.clauses],
        noInventory: f.gold > 0 && f.noInventory,
        // Item 10: an envoy to a king asks there about anyone at your court who says they are his envoy.
        checkClaim: v.known.find((c) => c.claimsToServe === f.sendTo)?.id ?? null,
        // Haakon's answers to item 11a: a tablet in your archive owed by that king goes with the envoy, to be presented.
        collect: v.debtsHeld.find((d) => d.holderId === f.sendTo)?.id ?? null,
        authority: f.seal || f.showCredentials ? newAuthority({ seal: f.seal, show: f.showCredentials, maxGold: Math.max(0, f.sealGold), cede: [...f.sealCede], open: [...f.sealOpen] }) : null,
        mandate: f.mandate.trim(),
        greeting: { ...f.g },
        gold: Math.max(0, f.gold),
        purityPercent: clamp(f.purity, 10, 100),
        proposal,
        copies: f.copies.length > 0 ? [...f.copies] : null,
      }),
    );
    set({ envoy: "", letter: "", clauses: [], tabletClauses: [], noInventory: false, seal: false, showCredentials: false, sealGold: 0, sealCede: [], sealOpen: [], mandate: "", tabletText: "", gold: 0, purity: 100, oath: false, vassal: "", copies: [], g: newGreetingOptions() });
  };
  const addSpy = (): void => {
    add(f.spyAt.startsWith("@") ? placeSpy(f.spyWho, null, f.spyAt.slice(1)) : placeSpy(f.spyWho, f.spyAt as Power));
    set({ spyWho: "" });
  };
  const toggle = <T,>(list: T[], item: T, on: boolean): T[] => (on ? (list.includes(item) ? list : [...list, item]) : list.filter((x) => x !== item));
  const g = f.g;
  const greetingText = Greeting.render(me, f.sendTo as Power, g);
  return { draft, state, onChanged, onSubmit, v, me, f, set, structured, wage, visibleUnits, ready, reserved, others, mine, add, term, price, sallyMin, sallying, addStandingOrder, addStanding, addDispatch, addSpy, toggle, g, greetingText };
}

export type OrdersContext = ReturnType<typeof useOrders>;
