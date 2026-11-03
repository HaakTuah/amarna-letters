/**
 * Envoy authority and passage (build order item 9): a tablet an envoy seals in its king's name by his seal, marked within
 * or beyond its authority; the passage and basing that sealed tablets grant; revoking them, repudiating a tablet an envoy
 * sealed, and what a grant changes: a guest's troops take none of the land they stand in by leave, and its travellers
 * are not turned back there. The model is in model/authority.ts.
 */
import { upper } from "../rules/wording.ts";
import { renderClauses } from "../rules/clauses.ts";
import { isBlank } from "../core/text.ts";
import { cap } from "../rules/greeting.ts";
import { grantLive, grantLiveFor, grantStands, grantsIn, newGrant, withinAuthority, type Grant } from "../model/authority.ts";
import type { Dispatch, HomeCargo, MessageTrail, Tablet } from "../model/records.ts";
import { newTablet, newTabletCopy } from "../model/records.ts";
import type { EnvoyReaction, HostReply } from "../model/exchanges.ts";
import type { GrantOrder, RepudiateOrder, RevokeOrder } from "../model/orders.ts";
import type { Character } from "../model/people.ts";
import { remember } from "../model/people.ts";
import { land, type Power, quoteWords, powerName, whose } from "../model/power.ts";
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
    endGrant(g: Grant, heard: number, by?: Power): void;
    endKnown(g: Grant, heard: number): void;
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
    trail.outcomes.push(`${upper(powerName(host))} offered a tablet of its own, which ${c.name} could not seal: he did not carry your seal ("${cap(offeredText(this, host, sender, offered), 300)}")`);
    return false;
  }
  if (!e.sealCounter) {
    trail.outcomes.push(`${upper(powerName(host))} offered a tablet of its own, which ${c.name} did not seal ("${cap(offeredText(this, host, sender, offered), 300)}")`);
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
  trail.outcomes.push(`sealed a tablet of ${whose(host)} in your name, by his own hand${within ? ", within his authority" : ", beyond his authority"}`);
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
    const where = g.province !== null ? this.map.get(g.province).name : `all the land of ${powerName(g.grantor)}`;
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
  // The owner's answers to item 11a: word of it travels to the grantee's court as any news does, never known there at
  // once; until it comes, his view keeps the grant as it was (bug #565).
  const heard = S.turn + this.travelTurns(p, o.grantee);
  // What he revokes as he knows it: a grant its grantee ended by repudiation, word of which has not come, he revokes all
  // the same; it stays as it ended, and both sides know it ended (bug #609).
  const known = S.grants.filter((g) => g.grantor === p && g.grantee === o.grantee && grantLiveFor(g, p, S.turn));
  const ended = known.filter((g) => o.province === null || g.province === o.province);
  for (const g of ended) this.endKnown(g, heard);
  // One province of a passage through all his land: the grant stands for the rest, as a new grant over the rest that
  // the grantee's court learns of with the word, the old one standing in its view until then (bug #611). One its grantee
  // ended already is only narrowed as its grantor reads it. One left with no land opens nothing, but stands as the courts
  // know it: ending it would tell its grantor that land he thought his was not in it (Codex's find on #623).
  // Chosen by what he revoked it in, not by its true land (which he may not know): the order check holds it to land he
  // knows as his.
  const cut = o.province === null ? [] : known.filter((g) => g.province === null && !g.cut.includes(o.province!));
  for (const g of cut) {
    const lands = g.lands.filter((x) => x !== o.province);
    const was = [...g.cut, o.province!];
    if (!grantLive(g, S.turn)) Object.assign(g, { lands, cut: was });
    else {
      this.endGrant(g, heard);
      // In the old one's place, so it is read in the same order beside basing granted after it (`grantCovers`).
      S.grants.splice(S.grants.indexOf(g) + 1, 0, newGrant({ ...g, id: newId(S, "p"), lands, cut: was, heardTurn: Math.max(g.heardTurn, heard), endedTurn: null, endHeard: 0, endedBy: null }));
    }
  }
  if (ended.length === 0 && cut.length === 0) return;
  const what = o.province !== null ? `in ${this.map.get(o.province).name}` : "in his land";
  this.word(p, o.grantee, "Grant", `The king of ${powerName(p)} revoked in turn ${S.turn} the passage and basing he granted your troops ${what}. Troops of yours still there now take the land as any troops do, and he will count it an attack.`);
  logEvent(S, "passage", `${p} revoked the passage and basing it granted ${o.grantee} ${what}.`, [p], "grant-revoked");
};

/** Its grantor ends a grant he believes stands: it ends now, or, ended already by its grantee unheard of, he knows it now. */
P.endKnown = function (g, heard) {
  if (grantLive(g, this.s.turn)) this.endGrant(g, heard);
  else g.endHeard = this.s.turn;
};

/** A grant ends this season by `by` (its grantor unless named); the other side hears of it at `heard` (bugs #565, #609). */
P.endGrant = function (g, heard, by) {
  g.endedTurn = this.s.turn;
  g.endHeard = heard;
  g.endedBy = by === undefined || by === g.grantor ? null : by;
};

/**
 * A king grants another passage or basing by order (item 11a+, the owner's answer to item 9's review), with no tablet: his
 * border guards and garrisons obey him from next season, over land he holds now, and the news reaches the grantee's court
 * as fast as a messenger rides between the capitals; until then that court does not know of it.
 */
P.grantByOrder = function (p, o) {
  const S = this.s;
  const Map = this.map;
  // Given at court as the court knows its land (bug #517): a grant over land lost out of its sight is recorded all the
  // same, and means nothing while another holds it (grantCovers reads the holder's grants), so it tells nothing at once.
  const why =
    o.kind === "basing" && o.province === null
        ? "basing is granted in one city"
        : !isAlive(S, o.grantee)
          ? `${powerName(o.grantee)} has fallen`
          : (S.roadsClosed.tryGet(p) ?? []).includes(o.grantee)
            ? `your roads are closed to ${whose(o.grantee)} people: open them first`
            : null;
  const where = o.province !== null ? Map.get(o.province).name : "all your land";
  if (why !== null) {
    notify(S, p, "Rejected", "Order failed", `No ${o.kind} was granted to ${powerName(o.grantee)} in ${where}: ${why}.`);
    return;
  }
  const lands = o.province === null ? ownedBy(S, p).filter((x) => !Map.get(x).isSea) : [];
  const since = S.turn + 1;
  const heard = S.turn + Math.max(1, this.travelTurns(p, o.grantee));
  S.grants.push(newGrant({ id: newId(S, "p"), kind: o.kind, grantor: p, grantee: o.grantee, province: o.province, lands, sinceTurn: since, untilTurn: o.seasons !== null ? since + Math.max(1, o.seasons) - 1 : null, tabletId: "", heardTurn: heard }));
  const term = o.seasons !== null ? `, for ${o.seasons} seasons` : ", until you revoke it";
  notify(S, p, "Resolution", GrantTitle, `From next season ${whose(o.grantee)} troops may ${o.kind === "passage" ? "pass through" : "stand within the walls of"} ${where} by your order${term}. Word of it reaches ${whose(o.grantee)} court as fast as a messenger rides.`);
  // The grantee learns of it by that word, as his view does (bug #565), never from the season's events.
  const there = o.province !== null ? Map.get(o.province).name : "all his land";
  this.word(p, o.grantee, "Grant", `The king of ${powerName(p)} has granted your troops ${o.kind === "passage" ? "passage through" : "leave to stand within the walls of"} ${there} from season ${since}${o.seasons !== null ? `, for ${o.seasons} seasons` : ", until he revokes it"}.`);
  logEvent(S, "passage", `${p} granted ${o.grantee} ${o.kind === "passage" ? "passage through" : "basing within the walls of"} ${o.province !== null ? Map.get(o.province).name : `all the land of ${p}`}, by order.`, [p], "granted-by-order");
};

/** Closing one's roads to a court ends what one granted it. */
P.endGrants = function (grantor, grantee, why) {
  const S = this.s;
  // As the grantor knows them: one its grantee ended by repudiation, unheard of, stays as it ended (bug #609).
  const ended = S.grants.filter((g) => g.grantor === grantor && g.grantee === grantee && grantLiveFor(g, grantor, S.turn));
  // The grantee hears of it with the word of the closed roads (`roads`).
  for (const g of ended) this.endKnown(g, S.turn + this.travelTurns(grantor, grantee));
  if (ended.length === 0) return;
  logEvent(S, "passage", `${grantor} ended the passage and basing it granted ${grantee}: ${why}.`, [grantor], "grant-revoked");
};

/**
 * The king repudiates a tablet his envoy sealed in his name, as beyond his authority: what it granted ends, both ways,
 * and the tablet's other king is told by word, which reaches his court as any news does; until then his view keeps the
 * tablet and what it granted as they were (bug #609). Whether it was beyond is for that king to judge: the engine tells
 * him only if he read the envoy's credentials (the tablet's view then says whether it lay within them).
 */
P.repudiate = function (p, o) {
  const S = this.s;
  const copy = S.copies.find((k) => k.id === o.copy && k.holder === p);
  const t = copy === undefined ? undefined : S.tablets.find((x) => x.id === copy.tabletId);
  if (t === undefined || t.byHandOf !== p || t.repudiatedTurn !== null) return;
  const other = t.proposedBy === p ? t.partner! : t.proposedBy;
  const heard = S.turn + this.travelTurns(p, other);
  t.repudiatedTurn = S.turn;
  t.repudiatedHeard = heard;
  for (const g of S.grants)
    if (g.tabletId === t.id && grantStands(g, S.turn)) this.endGrant(g, heard, p);
    // One its grantor ended already (a narrowing, word of which has not come): the repudiating king knows it ended now.
    else if (g.tabletId === t.id && grantLiveFor(g, p, S.turn) && !grantLive(g, S.turn)) g.endHeard = S.turn;
  const text =
    `The king of ${powerName(p)} repudiates the tablet his envoy ${t.byHand ?? ""} sealed in his name (${quoteWords(cap(t.text, 160))}): he says it went beyond the envoy's authority, and it does not bind him. What it granted, either way, has ended.` +
    (t.credentialsShown ? ` His envoy showed you its credentials: by them the tablet lay ${t.within ? "within" : "beyond"} his authority.` : "");
  this.word(p, other, "Realm", `Notice|${RepudiatedTitle}|${text}`);
  logEvent(S, "tablet", `${p} repudiated the tablet its envoy ${t.byHand ?? ""} sealed with ${other}, as beyond his authority.`, [p], "repudiated");
};
