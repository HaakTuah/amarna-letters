/**
 * The non-military half of a script king, fourth part (build order item 8): reading letters, tablets and answers by their
 * clauses, whoever wrote the words, and answering every proposal and request a letter sets out.
 */
import {
  GivingKinds,
  clause,
  isNews,
  type AudienceView,
  type Clause,
  type ClauseKind,
  type HostReply,
  type InboxItem,
  type Power,
} from "@amarna/engine";
import { Board } from "./board.ts";
import type { Brain } from "./brain.ts";
import { Names } from "./names.ts";
import { willing } from "./tactics.ts";

/** A promise of support for a move: in `turn`, the troops of `by` support the move of `of`'s troops from `from` into `to`. */
export interface SupportPromise {
  turn: number;
  by: Power;
  of: Power;
  from: string;
  to: string;
}

/**
 * Script kings acting on the clauses they read (item 8): answering requests with deeds, promising and keeping supports,
 * telling a king his messenger lied, reading their envoys' reports of answers and the news passed on, and sending gold
 * without an inventory by an envoy they trust. Off (`--no-clause-play`), or for half the kings (`--clause-play-half`), only
 * to measure it: they still write their letters in clauses, which structured press requires.
 */
export const ClausePlay: { on: boolean; only: ReadonlySet<string> | null } = { on: true, only: null };
export const clausePlays = (p: Power): boolean => ClausePlay.on && (ClausePlay.only === null || ClausePlay.only.has(p));

/** How long, in seasons, a promise of support is looked ahead: further than this, nobody can plan it. */
export const SupportHorizon = 4;

/** The king a tablet binds its sealers against: its `against` clause, or, in words alone, any name of him after "against". */
export function againstIn(t: { clauses: readonly Clause[]; text: string }, except: readonly Power[]): Power | null {
  const c = t.clauses.find((x) => x.kind === "against" && x.power !== null && !except.includes(x.power));
  if (c !== undefined) return c.power;
  return t.clauses.length > 0 ? null : Names.swornAgainstAny(t.text, except);
}

/** Whether clauses would make the one who agrees to them give something away: gold, tribute, land or a withdrawal. */
export function givesAwayIn(cs: readonly Clause[]): boolean {
  // Free passage for goods asked in return for the same (item 9+b) gives nothing away.
  return cs.some((x) => GivingKinds.includes(x.kind) && !(x.kind === "askTollFree" && cs.some((y) => y.kind === "tollFree")));
}

const answer = (kind: "accept" | "refuse" | "counter", answers: ClauseKind, init: Partial<Clause> = {}): Clause => clause(kind, { answers, ...init });

/**
 * Reads the clauses an envoy recited at our court and answers each proposal and request among them, adding to the reply's
 * clauses (and to its words, in full press, through `say`). What it agrees to it means: the gold it sends goes home with
 * the envoy, a promised support goes into its plans, a plea for relief into its pleas.
 */
export function answerLetter(view: AudienceView, b: Board, brain: Brain, reply: HostReply, say: (s: string) => void): void {
  const me = view.host;
  if (!clausePlays(me)) return;
  const sender = view.from;
  const r = brain.rel.get(sender);
  const friend = brain.isFriend(sender) && brain.betraying !== sender;
  const p = brain.p;
  const turn = view.turn;
  const answered = new Set<ClauseKind>();
  const once = (k: ClauseKind): boolean => {
    if (answered.has(k)) return false;
    answered.add(k);
    return true;
  };
  for (const c of view.clauses) {
    switch (c.kind) {
      case "askGold": {
        if (!once(c.kind)) break;
        const want = c.amount ?? 0;
        // A friend in need gets what can be spared, up to a quarter of what is spare; anyone else is refused.
        const spare = Math.max(0, Math.trunc((brain.spareGold - 100) / 4 / 10) * 10);
        const give = friend ? Math.min(want, spare) : 0;
        if (give <= 0) reply.clauses.push(answer("refuse", "askGold"));
        else {
          reply.goldBack = Math.max(reply.goldBack, give);
          reply.clauses.push(give >= want ? answer("accept", "askGold") : answer("counter", "askGold", { amount: give }));
          say(give >= want ? `I send you the gold you ask.` : `I cannot send all you ask, but I send ${give} shekels.`);
        }
        break;
      }
      case "askTribute":
      case "askCede":
        // Script kings pay tribute only of their own accord, and give up no land to words.
        if (once(c.kind)) reply.clauses.push(answer("refuse", c.kind));
        r.trust -= 0.05;
        break;
      case "askWithdraw": {
        if (!once(c.kind)) break;
        // Granted only where it costs nothing: none of our troops stand there.
        const ours = c.province !== null && b.unitAt.tryGet(c.province)?.power === me;
        reply.clauses.push(answer(ours ? "refuse" : "accept", "askWithdraw"));
        break;
      }
      case "askHelp": {
        if (c.province === null || c.power === null) break;
        brain.pleas.set(c.province, [sender, c.power, turn]);
        if (!once(c.kind)) break;
        const will = friend && (willing(b, brain, c.power, b.leader()) || (r.allied && !brain.isFriend(c.power)));
        reply.clauses.push(answer(will ? "accept" : "refuse", "askHelp"));
        break;
      }
      case "askSupport": {
        if (!once(c.kind) || c.province === null || c.to === null || c.turn === null) break;
        const target = b.ownerOf(c.to);
        // A friend's move against a king we would fight anyway, which a troop of ours could support, within sight of planning.
        const near = b.units.some((u) => u.power === me && u.province !== c.province && Board.Sail.canMove(u.kind, u.province, c.to!));
        const ok = friend && near && c.turn - turn <= SupportHorizon && target !== me && target !== null && target !== sender && willing(b, brain, target, b.leader());
        reply.clauses.push(answer(ok ? "accept" : "refuse", "askSupport"));
        if (ok) brain.promised.push({ turn: c.turn, by: me, of: sender, from: c.province, to: c.to });
        break;
      }
      case "askOath":
        if (once(c.kind)) reply.clauses.push(answer(friend ? "accept" : "refuse", "askOath"));
        break;
      case "support":
        // A friend's promise to support our move: our plans count on it in that season.
        if (c.province !== null && c.to !== null && c.turn !== null && c.turn - turn <= SupportHorizon) {
          brain.offered.push({ turn: c.turn, by: sender, of: me, from: c.province, to: c.to });
          if (once(c.kind)) reply.clauses.push(answer("accept", "support"));
          r.trust += 0.05;
        }
        break;
      case "peace":
      case "alliance":
      case "against":
        // Proposed in words with no tablet to seal (a tablet's own is answered with its sealing): a word given back, which
        // binds nobody. Peace for any king we bear no grudge; alliance and a common foe only for a friend.
        if (view.proposal !== null || !once(c.kind)) break;
        reply.clauses.push(answer((c.kind === "peace" ? !r.hostile : friend && c.power !== me) ? "accept" : "refuse", c.kind));
        break;
      case "tribute":
      case "cede":
        if (once(c.kind)) reply.clauses.push(answer("accept", c.kind));
        r.trust += 0.05;
        break;
      case "noAttack":
        // Words of peace from a king we have no quarrel with: a little trust, less for the wary.
        if (!r.hostile) r.trust += 0.05 * (1 - p.caution);
        break;
      case "threat":
        r.grudge += 0.5 * p.pride;
        r.trust -= 0.1;
        break;
      case "grievance":
      case "brokenOath":
        // A complaint we know to be just costs us nothing to hear; one from a king we never wronged sours us a little.
        if (r.lastWeAttacked < turn - 4) r.trust -= 0.05;
        break;
      case "envoyLied":
        suspectEnvoy(brain, sender);
        break;
      case "habiru":
        if (c.power !== null && c.power !== me && brain.rel.has(c.power)) brain.rel.get(c.power).trust -= 0.1 * (1 - p.caution);
        break;
      default:
        if (isNews(c)) hearNews(c, b, brain, turn);
    }
  }
}

/**
 * What our envoy reports of the host's answer (item 8): refusals and acceptances of what we asked move our trust in him a
 * little, and his complaint that our gold weighed light tells us our envoy kept some.
 */
export function readReport(item: InboxItem, brain: Brain, b: Board, turn: number): void {
  if (!clausePlays(b.me)) return;
  // The court the envoy reporting was sent to, as we sent him; a report in someone else's words is not searched for it.
  const host = (item.subject !== null ? brain.sentTo.tryGet(item.subject) : undefined) ?? null;
  if (host === null || !brain.rel.has(host)) return;
  const r = brain.rel.get(host);
  for (const c of item.clauses) {
    if (c.kind === "refuse" && c.answers !== null && ["askHelp", "askGold", "askSupport", "askOath"].includes(c.answers)) r.trust -= 0.05;
    else if ((c.kind === "accept" || c.kind === "counter") && c.answers !== null && ["askHelp", "askSupport"].includes(c.answers)) r.trust += 0.05;
    else if (c.kind === "lightGift" && item.subject !== null) brain.thieves.add(item.subject);
    else if (c.kind === "threat") r.grudge += 0.5 * brain.p.pride;
    else if (isNews(c)) hearNews(c, b, brain, turn);
  }
}

/** A king who says our messenger lied to him: the last envoy we sent him is let go when next at court. */
function suspectEnvoy(brain: Brain, accuser: Power): void {
  const sent = brain.lastEnvoyTo.tryGet(accuser);
  if (sent !== undefined) brain.thieves.add(sent);
}

/** News passed on in a letter or a report: troops seen are remembered where we cannot see, and conquests raise a king's menace. */
function hearNews(c: Clause, b: Board, brain: Brain, turn: number): void {
  if (c.power === null || c.power === b.me) return;
  if (c.kind === "newsTroops" && c.province !== null && !b.v.visible.includes(c.province) && Board.Map.exists(c.province))
    brain.sightings.set(c.province, [c.power, Board.Map.get(c.province).isSea ? "Fleet" : "Army", turn]);
  else if (c.kind === "newsTaken" || c.kind === "newsSiege") brain.belligerence.set(c.power, brain.belligerence.getOrDefault(c.power, 0) + (c.kind === "newsTaken" ? 0.5 : 0.3));
}
