/**
 * Names (build order item 10): "A name made of outcomes", "Declaring a name", false envoys ("Swapped tablets and false
 * envoys") and the gifts a host gives a person at its court. What others know of a character is what they saw happen,
 * recorded as facts that spread as rumour; a character declares a name, and the false ones are exposed by someone who has
 * seen the real man, by inquiries, or for a false envoy by asking the king it claims to serve.
 */
import { cmpNum, sortBy } from "../core/seq.ts";
import type { GiftOrder } from "../model/orders.ts";
import { coverOf, falseNameAt, gain, hiddenAt, newDeclared, newFact, remember, reputationAt, type Character, type Declared, type Fact } from "../model/people.ts";
import { AllPowers, land, type Power } from "../model/power.ts";
import { newDispatch, newMessageTrail, newPendingAudience, type Journey } from "../model/records.ts";
import { findCharacter, isAlive, logEvent, newId, notify } from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { Aliases } from "../rules/cast.ts";
import { idNumber, TurnEngine } from "./core.ts";

/** What a name gains at a court for a success it hears of, and loses for a failure (first guesses, item 18 tunes them). */
export const NameGain = 6;
export const NameLoss = 10;
/** A tale of success grows with retelling: the share it grows by for each season the word travelled. */
export const TaleGrowth = 0.15;
/** The chance a season that a false name is seen through by someone at the court who has seen the real man. */
export const SeenThrough = 0.5;
/** The chance a season that a false envoy is seen through by a real envoy of the king it claims to serve, at that court. */
export const EnvoySeenThrough = 0.6;
/** The title of the notice a court reads when it sees through a false name. */
export const ImpostorTitle = "An impostor exposed";

declare module "./core.ts" {
  interface TurnEngine {
    outcome(c: Character, witness: Power, text: string, good: boolean, hiddenFrom?: Power | null): void;
    spreadName(c: Character, witness: Power, f: Fact, hiddenFrom?: Power | null): void;
    nameHeard(j: Journey): void;
    meet(c: Character, court: Power): void;
    declare(c: Character, court: Power, name: string | null, envoyOf: Power | null): void;
    expose(c: Character, d: Declared, how: string): void;
    impostors(): void;
    giftTo(p: Power, o: GiftOrder): void;
    pretendedAudience(c: Character, court: Power, envoyOf: Power): void;
    aliasesFor(c: Character, court: Power): string[];
    envoyOfFor(c: Character, court: Power): Power | null;
  }
}

const P = TurnEngine.prototype;

/**
 * Something a court saw happen to a character, as a fact: it knows it now, under the name it knows the character by, and
 * its name there moves; the rumour of it reaches every other living court as word travels. Never its skill or its luck,
 * only what happened ("A name made of outcomes").
 */
P.outcome = function (c, witness, text, good, hiddenFrom = null) {
  const S = this.s;
  const alias = falseNameAt(c, witness)?.name ?? null;
  const f = newFact({ id: newId(S, "f"), text, secrecy: "Hidden", tag: good ? "outcome" : "outcome-bad", knownBy: [witness], alias });
  c.facts.push(f);
  // A name's standing: under a false name, that name's own (item 10: the court's records attach to the name it was given).
  const d = falseNameAt(c, witness);
  if (d !== null) d.rep += good ? NameGain : -NameLoss;
  else c.reputation.set(witness, c.reputation.getOrDefault(witness, 0) + (good ? NameGain : -NameLoss));
  // Talk under a false name stays with the court that knew it: others never heard that name.
  if (alias !== null) return;
  this.spreadName(c, witness, f, hiddenFrom);
};

/**
 * The talk of what a court saw, carried to every other living court. Not to the character's own master, nor to a court
 * that still believes something of it it cannot see (its cover): news of its people abroad comes to a court only by its
 * own ways, the rumour of a death, a ransom demand, word that it is overdue, or the servant's return ("News of your people
 * abroad comes only by rumour or when they return").
 */
P.spreadName = function (c, witness, f, hiddenFrom = null) {
  const S = this.s;
  for (const q of AllPowers)
    if (q !== witness && q !== hiddenFrom && isAlive(S, q) && q !== c.employer && q !== c.secretMaster && coverOf(c, q) === null) this.rumor(q, witness, f.text, c.id, "Name", f.id);
};

/** The rumour of an outcome reaches a court: it knows the fact now, and the tale has grown on the road if it was good. */
P.nameHeard = function (j) {
  const S = this.s;
  const c = findCharacter(S, j.characterId);
  const f = c?.facts.find((x) => x.id === j.taskId) ?? null;
  if (c === null || f === null || f.knownBy.includes(j.to)) return;
  f.knownBy.push(j.to);
  if (f.tag === "sold-report") notify(S, j.to, "Notice", "Sold what belonged in a report", `Word has come that ${c.name}, in your service, sold another king what their errand asked of them, which belongs in their report under the job: evidence of a broken job, yours to act on and to tell others.`, c.id);
  if (f.tag === "outlaw") notify(S, j.to, "Notice", "Robbers named", `Word has come: ${j.text ?? ""} ${c.name} rode with the Habiru.`, c.id);
  if (f.tag === "sold-secrets") notify(S, j.to, "Notice", "Secrets sold", `Word has come that ${c.name}, in your service, sold what they know of your court to another king.`, c.id);
  const seasons = Math.max(0, j.arriveTurn - j.departTurn);
  const delta = f.tag === "outcome" ? Math.round(NameGain * (1 + TaleGrowth * seasons)) : f.tag === "outcome-bad" || f.tag === "impostor" ? -NameLoss : 0;
  c.reputation.set(j.to, c.reputation.getOrDefault(j.to, 0) + delta);
};

/** A court has seen this character under its own name. */
P.meet = function (c, court) {
  if (!c.met.includes(court) && falseNameAt(c, court) === null) c.met.push(court);
};

/**
 * A character meets a court by pitching to it, and gives it a name: its own (null, or its own name), another character's,
 * or an invented one; and, at the court where it stands, it may claim to be an envoy of a king it does not serve. The
 * engine knows the truth and records the lie. A court that has already seen it under its own name is told its own.
 */
P.declare = function (c, court, name, envoyOf) {
  const S = this.s;
  // Only an invented name the court was offered, at a court that knows nothing of the person (see aliasesFor).
  const offered = name !== null && Aliases.includes(name.trim()) && strangerAt(c, court) && !S.characters.some((x) => x.name === name.trim());
  const given = !offered ? c.name : name!.trim();
  const falseEnvoy = envoyOf !== null && envoyOf !== court && c.at === court && isAlive(S, envoyOf) && c.employer !== envoyOf;
  if (given === c.name && !falseEnvoy) {
    this.meet(c, court);
    return;
  }
  if (c.declared.some((d) => d.court === court && d.exposed === null)) return;
  const asName = given;
  c.declared.push(
    newDeclared({
      court,
      name: asName,
      as: null,
      employer: falseEnvoy ? envoyOf : null,
      turn: S.turn,
      rep: 0,
    }),
  );
  remember(c, S.turn, `At the court of ${land(court)} I gave my name as ${asName}` + (falseEnvoy ? `, and said I came as an envoy of the king of ${land(envoyOf!)}.` : "."));
  logEvent(S, "false-name", `${c.name} gave the name ${asName} at ${court}` + (falseEnvoy ? `, posing as an envoy of ${envoyOf}` : "") + ".", [], falseEnvoy ? "false-envoy" : "false-name");
  if (falseEnvoy) {
    notify(
      S,
      court,
      "Notice",
      "An envoy without a letter",
      `${asName} has come to your court, saying they are an envoy of the king of ${land(envoyOf!)}, though they bring no letter and no tablet. You receive them in audience as any envoy; you may send to the king of ${land(envoyOf!)} to ask whether they serve him.`,
      c.id,
    );
    this.pretendedAudience(c, court, envoyOf!);
  }
};

/**
 * A false envoy is received in a full audience (item 10+b, Haakon's answer of 28 October 2026, "A false envoy"): the host
 * sees an envoy of the king it names, with no letter, no sealed greeting and no seal; what it gives, gifts or gold for
 * that king, the impostor keeps (applyAudience).
 */
P.pretendedAudience = function (c, court, envoyOf) {
  const S = this.s;
  const trail = newMessageTrail({ id: newId(S, "m"), turn: S.turn, from: envoyOf, to: court, envoyId: c.id, envoyName: c.name, pretended: true, audienceTurn: S.turn });
  S.trails.push(trail);
  const dispatch = newDispatch({ trailId: trail.id, inventory: false, pretended: true });
  S.audiences.push(newPendingAudience({ id: newId(S, "a"), envoyId: c.id, from: envoyOf, host: court, dispatch }));
};

/** A court sees through a false name: it learns who the person is, and the lie becomes a fact that travels. */
P.expose = function (c, d, how) {
  const S = this.s;
  if (d.exposed !== null) return;
  d.exposed = S.turn;
  const where = `at the court of ${land(d.court)}`;
  const posed =
    d.employer === null
      ? `Posed as ${d.name} ${where}.`
      : d.name === c.name
        ? `Posed as an envoy of ${land(d.employer)} ${where}.`
        : `Posed as ${d.name}, an envoy of ${land(d.employer)}, ${where}.`;
  remember(c, S.turn, `At the court of ${land(d.court)} they saw through me: ${how}.`);
  notify(S, d.court, "Notice", ImpostorTitle, `The person who came to you as ${d.name}${d.employer !== null ? `, envoy of ${d.employer}` : ""}, is ${c.name}: ${how}.`, c.id);
  logEvent(S, "impostor", `${d.court} saw through ${c.name}, who had posed as ${d.name}${d.employer !== null ? `, envoy of ${d.employer}` : ""} (${how}).`, [d.court], "impostor-exposed");
  this.meet(c, d.court);
  const f = newFact({ id: newId(S, "f"), text: posed, secrecy: "Hidden", tag: "impostor", knownBy: [d.court] });
  c.facts.push(f);
  c.reputation.set(d.court, c.reputation.getOrDefault(d.court, 0) - 2 * NameLoss);
  this.spreadName(c, d.court, f);
};

/**
 * Each season, every false name still standing may be seen through: by someone at the court who has seen the real man (the
 * man whose name was borrowed, or the impostor himself under his own name), by a real envoy of the king a false envoy
 * claims to serve standing at that court; never by chance alone (a letter or an inquiry finds it too).
 */
P.impostors = function () {
  const S = this.s;
  for (const c of sortBy(
    S.characters.filter((c) => c.status !== "Dead" && c.declared.some((d) => d.exposed === null)),
    [(c: Character) => idNumber(c.id), cmpNum],
  ))
    for (const d of c.declared.filter((d) => d.exposed === null && isAlive(S, d.court))) {
      const rng = this.r("impostor", `${c.id}:${d.court}`);
      const real = d.as !== null ? findCharacter(S, d.as) : null;
      const seen = (real !== null && (real.met.includes(d.court) || real.at === d.court)) || c.met.includes(d.court);
      const envoys = d.employer !== null && S.characters.some((x) => x.employer === d.employer && x.at === d.court && (x.duty === "EnvoyAtCourt" || x.duty === "Detained"));
      if (envoys && rng.chance(EnvoySeenThrough)) this.expose(c, d, `the envoys of ${d.employer} at your court do not know them`);
      else if (seen && rng.chance(SeenThrough)) this.expose(c, d, real !== null ? `someone at your court has seen the real ${d.name}` : "someone at your court knew their face");
      // Nothing exposes it by chance with nobody looking (decided 28 October 2026, "Deceit is information").
    }
};

/** A gift of gold from the treasury to a person at the court: a host's return gift, or a bribe. */
P.giftTo = function (p, o) {
  const S = this.s;
  const c = findCharacter(S, o.character);
  if (c === null || c.status === "Dead" || c.at !== p || hiddenAt(c, p)) {
    this.failed(p, o, "Gift not given", `${c?.name ?? o.character} was not at your court to receive it.`, "not at your court", true, c?.id ?? null);
    return;
  }
  if (!this.pay(p, o.gold, `a gift to ${c.name}`, o, "none was given")) return;
  gain(c, o.gold, "Gifts");
  // Item 12: gold handed to him, a motive with a name on it ("A go-between for hire").
  c.handed.push({ by: p, turn: S.turn });
  const d = falseNameAt(c, p);
  remember(c, S.turn, `The king of ${land(p)} gave me ${formatMoney(o.gold)}` + (d?.employer != null ? ` as a gift for the envoy of ${land(d.employer)} I said I was.` : "."));
  logEvent(S, "gift", `${p} gave ${c.name} ${formatMoney(o.gold)}${d?.employer != null ? `, taking them for an envoy of ${d.employer}` : ""}.`, [p], d?.employer != null ? "false-envoy-paid" : "gift-to-person");
};

/**
 * The name a character could give a court instead of its own: one invented in its region's style, never used by anyone in
 * the game; only at a court that knows nothing of it (it never stood there, pitched there, or was heard of there), since a
 * court that lists the person already would see the same person under a new name. Borrowing another living person's name
 * waits for a court's own handle for each name it is given (a design question of item 10).
 */
P.aliasesFor = function (c, court) {
  const S = this.s;
  const used = new Set(S.characters.map((x) => x.name));
  const rng = this.r("alias", `${c.id}:${court}`);
  const free = Aliases.filter((n) => !used.has(n));
  return free.length > 0 && strangerAt(c, court) ? [rng.pick(free)] : [];
};

/** A king a character standing at `court` could claim to serve as a false envoy: the farthest living one it never served. */
P.envoyOfFor = function (c, court) {
  const S = this.s;
  if (c.at !== court) return null;
  const options = AllPowers.filter((q) => q !== court && isAlive(S, q) && q !== c.employer && q !== c.formerEmployer);
  if (options.length === 0) return null;
  return sortBy(options, [(q: Power) => -this.travelTurns(court, q), cmpNum], [(q: Power) => AllPowers.indexOf(q), cmpNum])[0];
};

/** A court knows nothing of this person: it never saw it (nor sees it standing there), heard of it, or had it pitch there. */
export function strangerAt(c: Character, court: Power): boolean {
  return c.at !== court && !c.met.includes(court) && !c.reputation.has(court) && !c.pitches.has(court) && !c.facts.some((f) => f.knownBy.includes(court)) && c.covers.every((k) => k.for !== court);
}
