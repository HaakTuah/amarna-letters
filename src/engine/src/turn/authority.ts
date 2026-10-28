/**
 * Envoy authority and passage (build order item 9): a tablet an envoy seals in its king's name by his seal, marked within
 * or beyond its authority; the passage and basing that sealed tablets grant; revoking them, repudiating a tablet an envoy
 * sealed, and what a grant changes: a guest's troops take none of the land they stand in by leave, and its travellers
 * are not turned back there. The model is in model/authority.ts.
 */
import { renderClauses } from "../rules/clauses.ts";
import { isBlank } from "../core/text.ts";
import { cap } from "../rules/greeting.ts";
import { grantLive, grantStands, grantsIn, newGrant, withinAuthority, type Grant } from "../model/authority.ts";
import type { Dispatch, HomeCargo, MessageTrail, Tablet } from "../model/records.ts";
import { newTablet, newTabletCopy } from "../model/records.ts";
import type { EnvoyReaction, HostReply } from "../model/exchanges.ts";
import type { GrantOrder, RepudiateOrder, RevokeOrder } from "../model/orders.ts";
import type { Character } from "../model/people.ts";
import { remember } from "../model/people.ts";
import { land, type Power } from "../model/power.ts";
import type { Clause } from "../model/clauses.ts";
import { isAlive, logEvent, newId, notify, ownedBy, type Unit } from "../model/state.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    sealByHand(sender: Power, host: Power, c: Character, d: Dispatch, h: HostReply, e: EnvoyReaction, trail: MessageTrail, cargo: HomeCargo): boolean;
    grantsFrom(t: Tablet): void;
    grantCovers(grantor: Power | null, grantee: Power, province: string): Grant | null;
    guestOf(u: Unit): Grant | null;
    passageFor(host: Power | null, master: Power, province: string): boolean;
    guestAt(province: string, power: Power): boolean;
    revokeGrants(p: Power, o: RevokeOrder): void;
    grantByOrder(p: Power, o: GrantOrder): void;
    repudiate(p: Power, o: RepudiateOrder): void;
    endGrants(grantor: Power, grantee: Power, why: string): void;
  }
}

/** The notice to a king whose land was opened to another's troops on a sealed tablet, or who was granted passage. */
export const GrantTitle = "Passage and basing";
/** The notice to a king whose partner repudiated a tablet the partner's envoy sealed. */
export const RepudiatedTitle = "A tablet repudiated";

const P = TurnEngine.prototype;

/** The words of a tablet a host offered: as written, or its clauses in the templates' words. */
function offeredText(e: TurnEngine, host: Power, sender: Power, t: { text: string; clauses: Clause[] }): string {
  return isBlank(t.text) || e.s.config.pressMode === "structured" ? renderClauses(t.clauses, host, sender) : t.text;
}

/**
 * The envoy seals the host's own tablet in its king's name, if it carries his seal and chose to: the tablet records it
 * as sealed by the envoy's hand, within or beyond its authority, and grants what its clauses grant. The host keeps a copy;
 * the envoy brings its king his. One such tablet an audience. True if it sealed one.
 */
P.sealByHand = function (sender, host, c, d, h, e, trail, cargo) {
  const S = this.s;
  const offered = h.counter;
  if (offered === null) return false;
  const a = d.authority;
  if (a === null || !a.seal) {
    trail.outcomes.push(`${host} offered a tablet of its own, which ${c.name} could not seal: he did not carry your seal ("${cap(offeredText(this, host, sender, offered), 300)}")`);
    return false;
  }
  if (!e.sealCounter) {
    trail.outcomes.push(`${host} offered a tablet of its own, which ${c.name} did not seal ("${cap(offeredText(this, host, sender, offered), 300)}")`);
    return false;
  }
  const clauses = this.clausesOf(host, sender, offered.clauses, "tablet");
  const structured = S.config.pressMode === "structured";
  const text = structured || isBlank(offered.text) ? renderClauses(clauses, host, sender) : this.scribe(host, cap(offered.text, 1200));
  if (isBlank(text)) return false;
  const within = withinAuthority(clauses, a, ownedBy(S, sender));
  const tablet = newTablet({
    id: newId(S, "t"),
    text,
    proposedBy: host,
    partner: sender,
    seals: [host, sender],
    createdTurn: S.turn,
    sealedTurn: S.turn,
    clauses,
    byHandOf: sender,
    byHand: c.name,
    within,
    credentialsShown: a.show,
  });
  S.tablets.push(tablet);
  S.copies.push(newTabletCopy({ id: newId(S, "k"), tabletId: tablet.id, holder: host, acquiredTurn: S.turn, source: `sealed at audience by the hand of ${c.name}` }));
  cargo.copyIds.push(tablet.id);
  trail.outcomes.push(`sealed a tablet of ${host}'s in your name, by his own hand${within ? ", within his authority" : ", beyond his authority"}`);
  remember(c, S.turn, `I set the seal of my lord of ${land(sender)} on a tablet the king of ${land(host)} offered me${within ? "" : ", though it went beyond what I was allowed"}.`);
  logEvent(S, "tablet", `${c.name}, envoy of ${sender}, sealed a tablet of ${host}'s in his king's name: "${cap(text, 160)}"`, [sender, host], "envoy-sealed");
  this.grantsFrom(tablet);
  return true;
};

/**
 * The passage and basing a sealed tablet grants, by its clauses (model/authority.ts, grantsIn): each over land its
 * granting king holds as it is sealed. Each king it binds is told when he learns of the tablet: the host at once, the
 * envoy's king when his copy comes home (his view shows the grant from then).
 */
P.grantsFrom = function (t) {
  const S = this.s;
  if (t.partner === null || t.forged) return;
  for (const g of grantsIn(t.clauses, t.proposedBy, t.partner)) {
    if (g.grantor === g.grantee) continue;
    if (g.province !== null && S.owner.getOrDefault(g.province, null) !== g.grantor) continue;
    if (g.kind === "basing" && g.province === null) continue;
    // All his land: the land he holds as it is sealed, not land he wins after.
    const lands = g.province === null ? ownedBy(S, g.grantor).filter((x) => !this.map.get(x).isSea) : [];
    S.grants.push(newGrant({ id: newId(S, "p"), kind: g.kind, grantor: g.grantor, grantee: g.grantee, province: g.province, lands, sinceTurn: S.turn, untilTurn: g.untilTurn, tabletId: t.id }));
    const where = g.province !== null ? this.map.get(g.province).name : `all the land of ${g.grantor}`;
    logEvent(S, "passage", `${g.grantor} granted ${g.grantee} ${g.kind === "passage" ? "passage through" : "basing within the walls of"} ${where}.`, [g.grantor, g.grantee], g.kind === "passage" ? "passage-granted" : "basing-granted");
  }
};

/**
 * The grant that lets `grantee`'s troops stand in `province` without taking it from `grantor`: basing there, or passage
 * through it (or through all his land). Null if none stands this season.
 */
P.grantCovers = function (grantor, grantee, province) {
  const S = this.s;
  if (grantor === null || grantor === grantee) return null;
  for (const g of S.grants) {
    if (g.grantor !== grantor || g.grantee !== grantee || !grantStands(g, S.turn)) continue;
    if (g.kind === "basing" ? g.province === province : g.province === null ? g.lands.includes(province) : g.province === province) return g;
  }
  return null;
};

/**
 * The grant under which a troop stands in another's land as a guest this season, taking none of it: basing there, or
 * passage while it passes through (it moved this season). A troop that does not move on, under passage alone, has
 * overstayed, and takes the land as any troop does.
 */
P.guestOf = function (u) {
  const S = this.s;
  const holder = S.owner.getOrDefault(u.province, null);
  const g = this.grantCovers(holder, u.power, u.province);
  if (g === null) return null;
  if (g.kind === "basing") return g;
  if (this._movedNow.has(u.id)) return g;
  // Basing in the same province, under another grant, still covers it.
  for (const x of S.grants) if (x.kind === "basing" && x.grantor === holder && x.grantee === u.power && x.province === u.province && grantStands(x, S.turn)) return x;
  return null;
};

/** Does the host let this court's travellers pass through this province of his, by a passage he granted it on a sealed tablet? */
P.passageFor = function (host, master, province) {
  const g = this.grantCovers(host, master, province);
  return g !== null && g.kind === "passage";
};

/**
 * Does a move by `power` into `province` go in as a guest: into land its holder opened to it, where none of the holder's
 * troops stands (a move on them is an attack, whatever was granted)? Read before the moves.
 */
P.guestAt = function (province, power) {
  const S = this.s;
  const holder = S.owner.getOrDefault(province, null);
  if (this.grantCovers(holder, power, province) === null) return false;
  return !S.units.some((u) => u.province === province && u.power === holder);
};

/** The king ends what he granted another (in one province, or all of it): from next season the guests must be gone. */
P.revokeGrants = function (p, o) {
  const S = this.s;
  const ended = S.grants.filter((g) => g.grantor === p && g.grantee === o.grantee && grantLive(g, S.turn) && (o.province === null || g.province === o.province));
  for (const g of ended) g.endedTurn = S.turn;
  // One province of a passage through all his land: the grant stands for the rest.
  let narrowed = false;
  if (o.province !== null)
    for (const g of S.grants)
      if (g.grantor === p && g.grantee === o.grantee && grantLive(g, S.turn) && g.province === null && g.lands.includes(o.province)) {
        g.lands = g.lands.filter((x) => x !== o.province);
        narrowed = true;
      }
  if (ended.length === 0 && !narrowed) return;
  const what = o.province !== null ? `in ${this.map.get(o.province).name}` : "in his land";
  notify(S, o.grantee, "Notice", GrantTitle, `The king of ${land(p)} has revoked the passage and basing he granted your troops ${what}. Troops of yours still standing there next season will take the land as any troop does, and he will count it an attack.`);
  logEvent(S, "passage", `${p} revoked the passage and basing it granted ${o.grantee} ${what}.`, [p, o.grantee], "grant-revoked");
};

/**
 * A king grants another passage or basing by order (item 11a+, Haakon's answer to item 9's review), with no tablet: his
 * border guards and garrisons obey him from next season, over land he holds now, and the news reaches the grantee's court
 * as fast as a messenger rides between the capitals; until then that court does not know of it.
 */
P.grantByOrder = function (p, o) {
  const S = this.s;
  const Map = this.map;
  const why =
    o.province !== null && S.owner.getOrDefault(o.province, null) !== p
      ? "you no longer hold it"
      : o.kind === "basing" && o.province === null
        ? "basing is granted in one city"
        : !isAlive(S, o.grantee)
          ? `${o.grantee} has fallen`
          : null;
  const where = o.province !== null ? Map.get(o.province).name : "all your land";
  if (why !== null) {
    notify(S, p, "Rejected", "Order failed", `No ${o.kind} was granted to ${o.grantee} in ${where}: ${why}.`);
    return;
  }
  const lands = o.province === null ? ownedBy(S, p).filter((x) => !Map.get(x).isSea) : [];
  const since = S.turn + 1;
  const heard = S.turn + Math.max(1, this.travelTurns(p, o.grantee));
  S.grants.push(newGrant({ id: newId(S, "p"), kind: o.kind, grantor: p, grantee: o.grantee, province: o.province, lands, sinceTurn: since, untilTurn: o.seasons !== null ? since + Math.max(1, o.seasons) - 1 : null, tabletId: "", heardTurn: heard }));
  notify(S, p, "Resolution", GrantTitle, `From next season ${o.grantee}'s troops may ${o.kind === "passage" ? "pass through" : "stand within the walls of"} ${where} by your order${o.seasons !== null ? `, for ${o.seasons} seasons` : ", until you revoke it"}. Word of it reaches ${o.grantee}'s court as fast as a messenger rides.`);
  logEvent(S, "passage", `${p} granted ${o.grantee} ${o.kind === "passage" ? "passage through" : "basing within the walls of"} ${o.province !== null ? Map.get(o.province).name : `all the land of ${p}`}, by order.`, [p, o.grantee], o.kind === "passage" ? "passage-granted" : "basing-granted");
};

/** Closing one's roads to a court ends what one granted it. */
P.endGrants = function (grantor, grantee, why) {
  const S = this.s;
  const ended = S.grants.filter((g) => g.grantor === grantor && g.grantee === grantee && grantStands(g, S.turn));
  for (const g of ended) g.endedTurn = S.turn;
  if (ended.length === 0) return;
  logEvent(S, "passage", `${grantor} ended the passage and basing it granted ${grantee}: ${why}.`, [grantor, grantee], "grant-revoked");
};

/**
 * The king repudiates a tablet his envoy sealed in his name, as beyond his authority: what it granted ends, both ways,
 * and the tablet's other king is told. Whether it was beyond is for that king to judge: the engine tells him only if he
 * read the envoy's credentials (the tablet's view then says whether it lay within them).
 */
P.repudiate = function (p, o) {
  const S = this.s;
  const copy = S.copies.find((k) => k.id === o.copy && k.holder === p);
  const t = copy === undefined ? undefined : S.tablets.find((x) => x.id === copy.tabletId);
  if (t === undefined || t.byHandOf !== p || t.repudiatedTurn !== null) return;
  t.repudiatedTurn = S.turn;
  for (const g of S.grants) if (g.tabletId === t.id && grantStands(g, S.turn)) g.endedTurn = S.turn;
  const other = t.proposedBy === p ? t.partner! : t.proposedBy;
  notify(
    S,
    other,
    "Notice",
    RepudiatedTitle,
    `The king of ${land(p)} repudiates the tablet his envoy ${t.byHand ?? ""} sealed in his name ("${cap(t.text, 160)}"): he says it went beyond the envoy's authority, and it does not bind him. What it granted, either way, has ended.` +
      (t.credentialsShown ? ` His envoy showed you its credentials: by them the tablet lay ${t.within ? "within" : "beyond"} his authority.` : ""),
  );
  logEvent(S, "tablet", `${p} repudiated the tablet its envoy ${t.byHand ?? ""} sealed with ${other}, as beyond his authority.`, [p, other], "repudiated");
};
