/**
 * Envoy authority and passage (build order item 9, "Envoy authority and resident envoys", "Passage and access"; questions
 * 2, 3 and 14 of the old round report). A king may give an envoy his seal, with limits the engine can check (the most
 * gold he may give, the provinces he may cede and those he may open to the other king's troops), and may let him show
 * them or keep them hidden. An envoy with the seal may seal a tablet the host offers him: the engine marks it within or
 * beyond his authority, and his king may repudiate it. Passage and basing are granted on sealed tablets, as the clauses
 * that name them, and stand until they end, are revoked or the tablet is repudiated. Trade rights wait for item 9+b,
 * where caravans first trade at foreign markets.
 */
import { B, I, type ObjSchema, S, list, obj, opt } from "../core/json.ts";
import type { Clause } from "./clauses.ts";
import type { Power } from "./power.ts";

/** What an envoy may do in its king's name: the engine-checkable part of its mandate. The mandate's words guide its tone. */
export interface Authority {
  /** The envoy carries the king's seal: it may seal a tablet the host offers it. Without it nothing it agrees binds. */
  seal: boolean;
  /** The envoy shows its credentials: the host reads its mandate, its words and these limits. Hidden, the king keeps his excuse. */
  show: boolean;
  /** The most gold, in shekels, the envoy may give or promise in a tablet it seals (tribute counted once). */
  maxGold: number;
  /** The king's provinces the envoy may give away in a tablet it seals. */
  cede: string[];
  /** The king's provinces the envoy may open to the other king's troops, by passage or basing, in a tablet it seals. */
  open: string[];
}

export function newAuthority(init: Partial<Authority> = {}): Authority {
  return { seal: false, show: false, maxGold: 0, cede: [], open: [], ...init };
}

export const AuthoritySchema: ObjSchema<Authority> = obj("Authority", newAuthority, {
  seal: B,
  show: B,
  maxGold: I,
  cede: list(S),
  open: list(S),
});

/** The two rights granted on a sealed tablet today: to pass through land, and to stand within its walls. */
export const GrantKindValues = ["passage", "basing"] as const;
export type GrantKind = (typeof GrantKindValues)[number];

/**
 * A right one king granted another on a sealed tablet. Passage: the grantee's troops may move into the granted land and
 * stand there while passing through without taking it, and its travellers are not turned back there; a troop that ends
 * a season there without having moved there that season has overstayed and takes it, as any troop does. Basing: its troops
 * may stand in the named province, within its walls, season after season without taking it. It ends after `untilTurn`,
 * when the grantor revokes it or closes his roads to the grantee, or when the tablet is repudiated.
 */
export interface Grant {
  id: string;
  kind: GrantKind;
  grantor: Power;
  grantee: Power;
  /** The province granted; null for all the grantor's land (passage only). */
  province: string | null;
  sinceTurn: number;
  /** The last season it stands, or null for as long as it is not revoked. */
  untilTurn: number | null;
  tabletId: string;
  /** The season it was revoked or repudiated, or null while it stands (until untilTurn). */
  endedTurn: number | null;
}

export function newGrant(init: Partial<Grant> = {}): Grant {
  return {
    id: "",
    kind: "passage",
    grantor: "Egypt",
    grantee: "Egypt",
    province: null,
    sinceTurn: 0,
    untilTurn: null,
    tabletId: "",
    endedTurn: null,
    ...init,
  };
}

export const GrantSchema: ObjSchema<Grant> = obj("Grant", newGrant, {
  id: S,
  kind: S,
  grantor: S,
  grantee: S,
  province: opt(S),
  sinceTurn: I,
  untilTurn: opt(I),
  tabletId: S,
  endedTurn: opt(I),
});

/** Does the grant stand in this season? */
export const grantStands = (g: Grant, turn: number): boolean => g.endedTurn === null && g.sinceTurn <= turn && (g.untilTurn === null || turn <= g.untilTurn);

/**
 * The rights a sealed tablet grants, by its clauses, as `writer` wrote them to `reader`: a passage or basing clause opens
 * the writer's land to the reader's troops; one asking for it opens the reader's to the writer's. Only land the granting
 * king holds is opened: a province not his when sealed, or all his land when none is named.
 */
export function grantsIn(clauses: readonly Clause[], writer: Power, reader: Power): { kind: GrantKind; grantor: Power; grantee: Power; province: string | null; untilTurn: number | null }[] {
  const out: { kind: GrantKind; grantor: Power; grantee: Power; province: string | null; untilTurn: number | null }[] = [];
  for (const c of clauses) {
    if (c.kind === "passage" || c.kind === "basing") out.push({ kind: c.kind, grantor: writer, grantee: reader, province: c.province, untilTurn: c.turn });
    else if (c.kind === "askPassage") out.push({ kind: "passage", grantor: reader, grantee: writer, province: c.province, untilTurn: c.turn });
    else if (c.kind === "askBasing") out.push({ kind: "basing", grantor: reader, grantee: writer, province: c.province, untilTurn: c.turn });
  }
  return out;
}

/**
 * Whether a tablet the host wrote, sealed by an envoy, lies within the envoy's authority: the gold it
 * has his king give (what the host asks, tribute counted once) within its limit, every province it has him cede among
 * those it may cede, and every province it opens of his land among those it may open (all his land, when none is
 * named). `holds`: the provinces his king holds.
 */
export function withinAuthority(clauses: readonly Clause[], a: Authority, holds: readonly string[]): boolean {
  let gold = 0;
  for (const c of clauses) {
    if (c.kind === "askGold" || c.kind === "askTribute") gold += c.amount ?? 0;
    if (c.kind === "askCede" && (c.province === null || !a.cede.includes(c.province))) return false;
    if (c.kind === "askPassage" || c.kind === "askBasing") {
      const opened = c.province !== null ? [c.province] : holds;
      if (opened.some((p) => !a.open.includes(p))) return false;
    }
  }
  return gold <= a.maxGold;
}

/** The limits in words, as credentials shown read them and as a king's own record of a mandate states them. */
export function authorityText(a: Authority, name: (id: string) => string): string {
  if (!a.seal) return "The envoy does not carry the seal: nothing it agrees binds its king.";
  const gold = a.maxGold > 0 ? `give or promise up to ${a.maxGold} shekels of gold` : "give or promise no gold";
  const cede = a.cede.length > 0 ? `cede ${a.cede.map(name).join(", ")}` : "cede no land";
  const open = a.open.length > 0 ? `open ${a.open.map(name).join(", ")} to the other king's troops` : "open no land to foreign troops";
  return `The envoy carries the seal, and may seal a tablet that its host offers: it may ${gold}, ${cede}, and ${open}.`;
}

/** A grant as the two kings it binds see it in their view: no internal ids, the tablet named as every court names it. */
export interface GrantView {
  kind: GrantKind;
  grantor: Power;
  grantee: Power;
  province: string | null;
  sinceTurn: number;
  untilTurn: number | null;
  tablet: string;
}

export function newGrantView(init: Partial<GrantView> = {}): GrantView {
  return { kind: "passage", grantor: "Egypt", grantee: "Egypt", province: null, sinceTurn: 0, untilTurn: null, tablet: "", ...init };
}

export const GrantViewSchema: ObjSchema<GrantView> = obj("GrantView", newGrantView, {
  kind: S,
  grantor: S,
  grantee: S,
  province: opt(S),
  sinceTurn: I,
  untilTurn: opt(I),
  tablet: S,
});
