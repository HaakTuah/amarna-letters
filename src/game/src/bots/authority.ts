/**
 * Script kings and envoy authority and passage (build order item 9): the seal and limits they give their envoys, the
 * tablets of their own they offer an envoy that carries its king's seal, the leave they ask for their troops to stand in
 * a friend's land on the way to their war, the leave they grant, the guests they keep moving, and the tablets they
 * repudiate or revoke. `--no-authority-play` turns it off, and `--authority-play-half` on for half the kings.
 */
import {
  type Authority,
  type AudienceView,
  type Clause,
  type Order,
  type Power,
  type TabletProposal,
  clause,
  cmpStr,
  grant,
  move,
  newAuthority,
  newTabletProposal,
  repudiate,
  revoke,
  sortBy,
} from "@amarna/engine";
import { Board } from "./board.ts";
import { SeasonPlay } from "./land.ts";
import type { Brain } from "./brain.ts";
import type { MilitaryPlan } from "./tactics.ts";

/** Script kings play envoy authority and passage; off only to measure it. `envoys`: script envoys seal with the seal they carry. */
export const AuthorityPlay: { on: boolean; only: ReadonlySet<string> | null; envoys: boolean } = { on: true, only: null, envoys: true };

export const authorityOn = (me: Power): boolean => AuthorityPlay.on && (AuthorityPlay.only === null || AuthorityPlay.only.has(me));

/** How long a script king asks leave for: three years. */
const LeaveSeasons = 9;

/** Is the province one a script king would open to a friend's troops: its own, not its capital, not walled. */
function openable(b: Board, id: string): boolean {
  const p = Board.Map.get(id);
  return b.isMine(id) && !p.capital && !b.walls(id);
}

/** Does the province border land of a king who is no friend of ours: a road toward someone's war, not into our heart. */
function facesAFoe(b: Board, brain: Brain, id: string): boolean {
  return Board.Map.neighbors(id).some((n) => {
    const o = b.ownerOf(n);
    return o !== null && o !== b.me && !brain.isFriend(o);
  });
}

/**
 * The authority a script king gives an envoy it trusts with a tablet or sends to a friend: its seal, no gold, no land to
 * cede, and to a full ally or a friend it trusts, the provinces on its borders with him that face a foe, to open to his
 * troops. Its credentials shown to a friend it trusts, by an honest king. Null: no seal.
 */
export function authorityFor(b: Board, brain: Brain, to: Power, trusted: boolean): Authority | null {
  if (!authorityOn(b.me) || !trusted) return null;
  const r = brain.rel.get(to);
  if (r.hostile || brain.warTarget === to || brain.betraying === to) return null;
  const close = r.allied || (brain.isFriend(to) && r.trust > 0.3);
  const open = close
    ? sortBy(
        [...b.v.owner.entries()].filter(([k, o]) => o === b.me && openable(b, k) && facesAFoe(b, brain, k) && Board.Map.neighbors(k).some((n) => b.ownerOf(n) === to)).map(([k]) => k),
        [(x: string) => x, cmpStr],
      )
    : [];
  return newAuthority({ seal: true, show: brain.isFriend(to) && r.trust > 0.3 && brain.p.honesty > 0.4, maxGold: 0, cede: [], open });
}

/**
 * Where our war needs a friend's land: a king we make war on or are sworn against, whose land touches none of ours nor any
 * province our troops stand in, while a friend's province touches both ours and his. The friend and that province, to
 * stand in on the way, and the foe; null if none, if he has granted it, or if we asked him within six seasons.
 */
export function stagingFor(b: Board, brain: Brain): [Power, string, Power] | null {
  const ours = new Set<string>([...b.v.owner.entries()].filter(([, o]) => o === b.me).map(([k]) => k));
  for (const u of b.mine) ours.add(u.province);
  const foes = sortBy([...new Set<Power>([...(brain.warTarget !== null ? [brain.warTarget] : []), ...brain.swornFoes(b)])].filter((x) => b.alive.has(x)), [(x: Power) => x === brain.warTarget, (a: boolean, c: boolean) => (a === c ? 0 : a ? -1 : 1)], [(x: Power) => x, cmpStr]);
  for (const foe of foes) {
    const touchesFoe = (id: string): boolean => Board.Map.neighbors(id).some((n) => b.ownerOf(n) === foe);
    if ([...ours].some(touchesFoe)) continue;
    for (const p of Board.Map.landProvinces) {
      const holder = b.ownerOf(p.id);
      if (holder === null || holder === b.me || holder === foe || !brain.isFriend(holder) || brain.betraying === holder) continue;
      if (p.capital || b.walls(p.id) || !touchesFoe(p.id) || !Board.Map.neighbors(p.id).some((n) => ours.has(n))) continue;
      if (b.v.grants.some((g) => g.grantee === b.me && g.grantor === holder && (g.province === p.id || g.province === null))) return null;
      if (b.v.turn - brain.basingAsked.getOrDefault(holder, -99) < 6) continue;
      return [holder, p.id, foe];
    }
  }
  return null;
}

/** The tablet asking a friend leave for our troops to stand in his province, on the way to our war. */
export const basingTablet = (province: string, turn: number): TabletProposal => newTabletProposal({ clauses: [clause("askBasing", { province, turn: turn + LeaveSeasons })] });

/** The leave we grant a friend we plead with to relieve our besieged city: passage through our land. */
export const passageClause = (turn: number): Clause => clause("passage", { turn: turn + LeaveSeasons / 3 * 2 });

/**
 * Whether a script king grants what a tablet asks of its land (askPassage, askBasing): to a friend it trusts who is not the
 * king it is turning on nor the leader, for a province of its own, not its capital nor walled, that faces a foe; passage
 * through all its land only to a full ally. A careful king grants none.
 */
export function grantsOk(b: Board, brain: Brain, sender: Power, clauses: readonly Clause[]): boolean {
  if (!authorityOn(b.me) || brain.p.caution > 0.85) return false;
  const r = brain.rel.get(sender);
  if (!brain.isFriend(sender) || r.trust < 0.2 || brain.betraying === sender || sender === b.leader()) return false;
  return clauses
    .filter((c) => c.kind === "askPassage" || c.kind === "askBasing")
    .every((c) => (c.province === null ? c.kind === "askPassage" && r.allied : openable(b, c.province) && facesAFoe(b, brain, c.province)));
}

/**
 * The tablet a host offers an envoy that carries its king's seal: the proposal it would not seal for what it gives away,
 * with that left out (the leave it would grant kept, written as granted); for one it would not seal for itself, a stand
 * against our own foe where his land touches the foe's, or else peace from a king it has no treaty with; and, where our
 * war needs his land, leave for our troops; a greedy king short of gold asks a gift with it.
 * `refused`: why it would not seal the proposal, if it would not.
 */
export function counterFor(b: Board, brain: Brain, view: AudienceView, refused: "gives" | "other" | null): TabletProposal | null {
  if (!authorityOn(b.me) || !view.sealCarried) return null;
  const sender = view.from;
  const out: Clause[] = [];
  const proposal = view.proposal;
  const r = brain.rel.get(sender);
  if (refused === "gives" && proposal !== null && proposal.clauses.length > 0) {
    for (const c of proposal.clauses) {
      if (c.kind === "peace" || c.kind === "alliance" || c.kind === "noAttack" || (c.kind === "against" && c.power !== b.me)) out.push({ ...c });
      else if ((c.kind === "askPassage" || c.kind === "askBasing") && grantsOk(b, brain, sender, [c])) out.push({ ...c, kind: c.kind === "askPassage" ? "passage" : "basing" });
    }
  } else if (refused === "other" && proposal !== null && !r.hostile && brain.warTarget !== sender && brain.betraying !== sender) {
    // Not against the king he names, but against ours, where his land touches our foe's; or else peace, if we have none.
    const ours = brain.warTarget ?? [...brain.swornFoes(b)][0] ?? null;
    const named = proposal.clauses.find((c) => c.kind === "against")?.power ?? null;
    const reaches = (k: Power, foe: Power): boolean => [...b.v.owner.entries()].some(([id, o]) => o === k && Board.Map.neighbors(id).some((n) => b.ownerOf(n) === foe));
    if (ours !== null && ours !== sender && ours !== named && b.alive.has(ours) && reaches(sender, ours)) out.push(clause("against", { power: ours }));
    else if (!r.treaty && !proposal.clauses.some((c) => c.kind === "peace")) out.push(clause("peace"));
  }
  const staging = stagingFor(b, brain);
  if (staging !== null && staging[0] === sender) {
    out.push(clause("askBasing", { province: staging[1], turn: view.turn + LeaveSeasons }));
    brain.basingAsked.set(sender, view.turn);
  }
  // A greedy king short of gold asks a gift for his seal: more than a script king lets his envoy give, so only a careless,
  // disloyal or bought envoy seals it, and his king may repudiate it.
  if (out.length > 0 && brain.p.greed > 0.6 && brain.spareGold < 200) out.push(clause("askGold", { amount: 50 }));
  return out.length > 0 ? newTabletProposal({ clauses: out }) : null;
}

/**
 * The tablets our envoys sealed in our name that we will not stand by, once their copies are home: one beyond his
 * authority that gives away what we would not, and, for a faithless king, one within it with a king we have come to count
 * hostile. Weighed once each.
 */
export function repudiations(b: Board, brain: Brain, orders: Order[]): void {
  if (!authorityOn(b.me)) return;
  for (const t of b.v.tablets) {
    if (t.byHandOf !== b.me || t.repudiatedTurn !== null || brain.judged.has(t.tabletId)) continue;
    brain.judged.add(t.tabletId);
    const other = t.proposedBy === b.me ? t.partner : t.proposedBy;
    if (other === null) continue;
    const r = brain.rel.get(other);
    const gives = t.clauses.some((c) => c.kind === "askGold" || c.kind === "askTribute" || c.kind === "askCede" || ((c.kind === "askPassage" || c.kind === "askBasing") && !grantsOk(b, brain, other, [c])));
    if ((t.within === false && gives) || (brain.p.honesty < 0.3 && r.hostile)) orders.push(repudiate(t.copyId));
  }
}

/** What we granted a king who has since turned foe, or whom we no longer trust, we revoke. */
export function revocations(b: Board, brain: Brain, orders: Order[]): void {
  if (!authorityOn(b.me)) return;
  for (const g of b.v.grants.filter((x) => x.grantor === b.me)) {
    const r = brain.rel.get(g.grantee);
    if (r.hostile || brain.warTarget === g.grantee || brain.betraying === g.grantee || r.trust < -0.1 || g.grantee === b.leader())
      if (!orders.some((o) => o.type === "revoke" && o.grantee === g.grantee)) orders.push(revoke(g.grantee));
  }
}

/**
 * Leave a friend asked of our land that we would grant but did not seal, and passage for a sworn ally we plead with to
 * relieve our city, we grant by order (item 11a+), once each, unless leave already stands or the friend has turned.
 */
export function leaveByOrder(b: Board, brain: Brain, orders: Order[]): void {
  if (!authorityOn(b.me) || !SeasonPlay.on(b.me)) {
    brain.leaveAsked.clear();
    return;
  }
  for (const [k, asks] of [...brain.leaveAsked.entries()]) {
    brain.leaveAsked.delete(k);
    if (!b.alive.has(k) || !grantsOk(b, brain, k, asks.filter((c) => c.province !== null || brain.rel.get(k).allied))) continue;
    for (const c of asks) {
      if (c.province !== null && !b.isMine(c.province)) continue;
      if (c.province === null && !brain.rel.get(k).allied) continue;
      const kind = c.kind === "askBasing" ? "basing" : "passage";
      if (b.v.grants.some((g) => g.grantor === b.me && g.grantee === k && g.kind === kind && g.province === c.province)) continue;
      orders.push(grant(k, kind, c.province, c.turn !== null ? Math.max(1, c.turn - b.v.turn) : LeaveSeasons));
    }
  }
}

/** How a king reads a tablet his envoy sealed that the other king repudiated: a betrayal if the credentials showed it within. */
export function heardRepudiations(b: Board, brain: Brain): void {
  for (const t of b.v.tablets) {
    if (t.repudiatedTurn === null || t.byHandOf === b.me || t.byHandOf === null || brain.judged.has(t.tabletId)) continue;
    brain.judged.add(t.tabletId);
    const r = brain.rel.get(t.byHandOf);
    r.trust = Math.max(-1, r.trust - (t.within === true ? 0.4 : 0.1));
    if (t.within === true) r.grudge += 1.5;
  }
}

/** Is a province one our troops may stand in this season by the leave its holder granted us? */
export function grantedTo(b: Board, id: string, basingOnly = false): boolean {
  const holder = b.ownerOf(id);
  return b.v.grants.some((g) => g.grantee === b.me && g.grantor === holder && (g.kind === "basing" ? g.province === id : !basingOnly && (g.province === null || g.province === id)));
}

/**
 * A troop of ours standing in a friend's land by passage alone must move on this season, or it overstays and takes the
 * land: if the plan holds it there, it moves to a free province of ours, or one we hold leave in, nearest home first.
 */
export function keepMoving(b: Board, plan: MilitaryPlan): void {
  if (!authorityOn(b.me)) return;
  for (const u of b.mine) {
    const holder = b.ownerOf(u.province);
    if (holder === null || holder === b.me || Board.Map.get(u.province).isSea || !grantedTo(b, u.province) || grantedTo(b, u.province, true)) continue;
    const o = plan.orders.tryGet(u.province);
    if (o !== undefined && o.type === "move" && o.to !== u.province) continue;
    const to =
      sortBy(
        Board.Sail.movesFrom(u.kind, u.province).filter((t) => !Board.Map.get(t).isSea && !b.unitAt.has(t) && !plan.destinations.has(t) && (b.isMine(t) || grantedTo(b, t))),
        [(t: string) => b.isMine(t), (a: boolean, c: boolean) => (a === c ? 0 : a ? -1 : 1)],
        [(t: string) => t, cmpStr],
      )[0] ?? null;
    if (to === null) continue;
    plan.orders.set(u.province, move(u.province, to));
    plan.role.set(u.province, "guest");
    plan.destinations.add(to);
  }
}
