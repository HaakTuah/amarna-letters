/** Assays, authentication and forgery. */
import { clamp, roundEven, toInt } from "../core/num.ts";
import { distinct } from "../core/seq.ts";
import type { AssayOrder, ForgeOrder } from "../model/orders.ts";
import { newFact, remember } from "../model/people.ts";
import { AllPowers, land, powerName, type Power, quoteWords } from "../model/power.ts";
import { newTablet, newTabletCopy, type PendingTask } from "../model/records.ts";
import { alive, char, findCharacter, logEvent, newId, notify } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { listed } from "../rules/wording.ts";
import { cap } from "../rules/greeting.ts";
import { checkClauses, renderClauses } from "../rules/clauses.ts";
import { Views } from "../rules/views.ts";
import { TurnEngine } from "./core.ts";

declare module "./core.ts" {
  interface TurnEngine {
    assay(p: Power, a: AssayOrder): void;
    finishAuthentication(task: PendingTask): void;
    forge(p: Power, f: ForgeOrder): void;
  }
}

/** What an assay says of a lot that is all fine gold (to a hundredth); the script kings read it. */
export const FullWeight = "all fine gold";
const P = TurnEngine.prototype;

P.assay = function (p, a) {
  const S = this.s;
  const t = S.treasuries.get(p);
  const lot = t.lots.find((l) => l.id === a.lot) ?? null;
  if (lot === null) {
    // The validator refuses a lot that is not there, or one assayed twice: the only way it is gone now is an
    // earlier payment this season that fell short, when the treasurers weighed all the unassayed gold.
    this.failed(
      p,
      a,
      "Assay failed",
      `Gold lot ${a.lot} was not assayed: your treasurers had already weighed all your unassayed gold last season, when a payment fell short. No fee was paid.`,
      "your treasurers had already weighed it",
      true,
    );
    return;
  }
  if (!this.pay(p, S.config.assayFee, "an assay", a, `gold lot ${a.lot} was not assayed`)) return;
  t.lots.splice(t.lots.indexOf(lot), 1);
  const pct = lot.face === 0 ? 100 : toInt(roundEven((100.0 * lot.true) / lot.face));
  const weighed = `The lot of ${formatMoney(lot.face)} weighed from ${powerName(lot.from)}`;
  let text =
    pct < 100
      ? `${weighed} holds only ${formatMoney(lot.true)} of fine gold, ${pct}%.`
      : lot.true === lot.face
        ? `${weighed} is ${FullWeight}.`
        : `${weighed} is ${FullWeight} near enough: ${formatMoney(lot.true)} of it.`;
  if (lot.stated > lot.face) text += ` The inventory sent with it promised ${formatMoney(lot.stated)}, so it came ${formatMoney(lot.stated - lot.face)} short.`;
  else if (lot.stated < lot.face) text += ` The inventory sent with it named only ${formatMoney(lot.stated)}.`;
  notify(S, p, "Assay", "Assay of gold", text);
  logEvent(S, "assay", `${p} assayed gold from ${lot.from}: ${pct}% fine.`, [p], pct < 100 ? "debasement-found" : "assay");
};

P.finishAuthentication = function (task) {
  const S = this.s;
  const copy = S.copies.find((x) => x.id === task.copyId) ?? null;
  const tablet = copy === null ? null : (S.tablets.find((t) => t.id === copy.tabletId) ?? null);
  if (copy === null || tablet === null) return;
  const rng = this.r("authenticate", task.id);
  // A forgery the scribes miss reads exactly as a genuine tablet that reads genuine: the words betray nothing.
  const genuine = "The seals are genuine.";
  let result: string;
  if (!tablet.forged) result = rng.chance(0.95) ? genuine : "The scribes cannot agree; the result is inconclusive.";
  else {
    const detect = clamp(0.2 + task.spend / 200.0 - tablet.forgerSkill / 150.0, 0.05, 0.95);
    if (rng.chance(detect)) {
      result = "The seals are false: this tablet is a forgery.";
      // The event names the tablet as the court does, not by the engine's id, which a narrator reading its events could repeat.
      logEvent(S, "forgery-detected", `${task.requester} found that ${Views.tabletName(tablet, this.archive(task.requester))} is forged.`, [task.requester], "forgery-detected");
      // A swapped inventory is traced, with the same chance, to the envoy who forged it and brought it.
      if (tablet.inventory) {
        const bearer = findCharacter(S, tablet.forgerId);
        if (bearer !== null && rng.chance(clamp(0.3 + task.spend / 400.0, 0.3, 0.8))) result += this.inventoryExposed(task.requester, tablet, bearer);
      } else if (tablet.forgerEmployer !== null && rng.chance(clamp(0.3 + task.spend / 400.0, 0.3, 0.8))) {
        const culprit = tablet.forgerEmployer;
        const forger = findCharacter(S, tablet.forgerId);
        result += ` The scribes trace it to the hand of ${forger?.name ?? "a scribe"} in the service of ${powerName(culprit)}.`;
        if (forger !== null) {
          for (const p of AllPowers) forger.reputation.set(p, forger.reputation.getOrDefault(p, 0) - 30);
          forger.facts.push(newFact({ id: newId(S, "f"), text: `Exposed as a forger of seals in the service of ${land(culprit)}.`, secrecy: "Public", tag: "forger" }));
        }
        for (const p of alive(S).filter((p) => p !== task.requester))
          this.rumor(p, task.requester, `The scribes of ${powerName(task.requester)} declare that a tablet bearing the seal of ${listed(tablet.seals.map((x) => powerName(x)))} was forged by ${forger?.name ?? "a scribe"} of ${powerName(culprit)}.`);
        logEvent(S, "forgery-exposed", `${task.requester} publicly traced a forgery to ${culprit}.`, null, "forgery-exposed");
      }
    } else result = genuine;
  }
  copy.authResult = result;
  copy.authTurn = S.turn;
  // The tablet as every court names it, the court's own mark for its copy, and its text in full.
  notify(
    S,
    task.requester,
    "Authentication",
    "Examination of a tablet",
    `${Views.capitalized(Views.tabletName(tablet, this.archive(task.requester)))}: ${quoteWords(tablet.text)} — ${result}`,
  );
  logEvent(S, "authenticate", `${task.requester} paid to authenticate a tablet.`, [task.requester], "authentication");
};

P.forge = function (p, f) {
  const S = this.s;
  const c = char(S, f.character);
  // The servant tries only if it believes its hand can fake a seal; a king learns that only by asking (item 10).
  if (c.belief.forge < S.config.forgeMinCompetence) {
    // A failed order like any other, though the clay is still paid for.
    this.failed(p, f, "Forgery botched", `${c.name} said they could not fake a seal; the clay is ruined and nothing usable came of it.`, "the forger lacked the skill", false, c.id);
    this.pay(p, S.config.forgeFee, "spoiled clay");
    return;
  }
  const seals = distinct(f.seals);
  // Set out in clauses like any tablet (item 8), as its first sealer would write them to the second; in structured press
  // its words are theirs, and a forgery with no clause that stands is not made (nor paid for).
  const by = seals[0] ?? p;
  const partner = seals.length > 1 ? seals[1] : by;
  const checked = checkClauses(f.clauses, by, partner, S.turn);
  if (checked.dropped.length > 0) notify(S, p, "Notice", "Clauses left out", `In the forgery the scribes left out what could not stand: ${checked.dropped.join("; ")}.`);
  const clauses = checked.kept;
  if (S.config.pressMode === "structured" && clauses.length === 0) {
    this.failed(p, f, "Nothing to forge", "In this game a tablet is set out in clauses, and none of the forgery's could stand: nothing was forged and nothing paid.", "it had no clause that could stand", false, c.id);
    return;
  }
  if (!this.pay(p, S.config.forgeFee, "a forger's materials", f, "nothing was forged")) return;
  const tablet = newTablet({
    id: newId(S, "t"),
    text: S.config.pressMode === "structured" ? renderClauses(clauses, by, partner) : this.scribe(p, cap(f.text, 1200)),
    clauses,
    proposedBy: seals[0],
    partner: seals.length > 1 ? seals[1] : null,
    seals,
    createdTurn: S.turn,
    sealedTurn: Math.max(1, S.turn - this.r("forge-date", c.id).range(1, 4)),
    forged: true,
    forgerId: c.id,
    forgerEmployer: p,
    forgerSkill: c.skills.forge,
  });
  S.tablets.push(tablet);
  S.copies.push(newTabletCopy({ id: newId(S, "k"), tabletId: tablet.id, holder: p, acquiredTurn: S.turn, source: `made by ${c.name}` }));
  c.facts.push(newFact({ id: newId(S, "f"), text: `Forged a tablet bearing the seal of ${seals.join(" and ")}.`, secrecy: "Deep", tag: "forgery", knownBy: [p] }));
  remember(c, S.turn, `I forged a tablet with the seals of ${seals.join(" and ")} for ${land(p)}.`);
  notify(S, p, "Tablet", "A tablet is ready", `${c.name} has produced a tablet bearing the seals of ${seals.join(" and ")}.`, c.id);
  logEvent(S, "forgery", `${p} had ${c.name} forge a tablet sealed by ${seals.join(" and ")}.`, [p], "forgery");
};
