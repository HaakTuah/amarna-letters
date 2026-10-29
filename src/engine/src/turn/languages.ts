/**
 * Languages at work (build order item 12, "Languages"): skill buys time, never noise. Each season begins with learning by
 * living somewhere, by the share of the season spent there ("Learning by living there"); then the dice fall, before any
 * model is called ("Speaking"): who understands whom among the people in the same place, whether each envoy at a court is
 * understood there (by its king, a servant who bridges, or a go-between he pays), and whether the tablets waiting at a
 * court find a reader ("Reading a tablet"). An envoy nobody understands is no audience: his king's host is told so plainly,
 * his gifts are the only language, and he chooses each season to stay, go home, or say his message was delivered.
 * Composing works the same way: a king's words must be grasped by his envoy, and a tablet in a language the receiver reads
 * needs a scribe who writes it ("Composing").
 */
import { Dict } from "../core/collections.ts";
import { clamp, idiv, roundEven, toInt } from "../core/num.ts";
import { cmpNum, desc, sortBy } from "../core/seq.ts";
import { cmpStr } from "../core/text.ts";
import {
  AtOnce,
  bestShared,
  courtReads,
  courtSpeaks,
  crossChance,
  spokenIn,
  tongueWords,
} from "../model/languages.ts";
import { newMindRequest } from "../model/exchanges.ts";
import { PointsPerDay } from "../model/travel.ts";
import {
  gain,
  newBridgeView,
  newFact,
  newUnheardView,
  remember,
  type BridgeView,
  type Character,
  type UnheardChoice,
} from "../model/people.ts";
import type { Clause } from "../model/clauses.ts";
import { land, type Power } from "../model/power.ts";
import {
  newHomeCargo,
  type PendingAudience,
  type Tablet,
} from "../model/records.ts";
import {
  alive,
  char,
  findCharacter,
  isAlive,
  logEvent,
  newGoldLot,
  newId,
  notify,
} from "../model/state.ts";
import { formatMoney } from "../rules/calendar.ts";
import { idNumber, TurnEngine } from "./core.ts";
import { basePrice } from "./court.ts";

/** The title of the notice that nobody at a court understands an envoy standing there. */
export const UnheardTitle = "An envoy nobody understands";
/** What an envoy's trail records when he left a court where nobody understood him. */
export const UnheardOutcome = "nobody at the court understood him";

/**
 * First guesses (item 18 tunes them): a season's learning at full share, wide spread and no skill yet is `base` points
 * plus a fifth of the aptitude, slowing as the skill nears 100; a king's aptitude; at most `composeSeasons` seasons of
 * waiting are rolled for a mandate or a tablet; a go-between asks `bridgeShare` in a hundred of a season's asking price for
 * each message, at least `bridgeMin`; a servant or go-between is in someone else's pay for `paySeasons` after gold is
 * handed to him; an envoy nobody understands waits a season, and one more for every `patienceStep` of loyalty.
 */
export const LanguageData = {
  base: 8,
  kingAptitude: 40,
  composeSeasons: 6,
  bridgeShare: 20,
  bridgeMin: 2,
  paySeasons: 4,
  patienceStep: 25,
  lieLoyalty: 40,
  lieGreed: 55,
} as const;

declare module "./core.ts" {
  interface TurnEngine {
    /** The languages of a speaker: a character's, or a king's (`king:` and the court). */
    tonguesOf(who: Character | Power): Dict<string, number>;
    /** Item 12: a traveller's road this season, the points spent in each province, kept for learning. */
    noteRoad(c: Character, spent: Dict<string, number>): void;
    /** As a season begins: everyone learns the languages spoken where he spent the last one. */
    learnTongues(): void;
    /** As a season begins, after the travellers arrive: the dice of who understands whom, before any model is called. */
    settleSpeech(): void;
    /** Whether two characters in the same place understand each other this season (settled once a season, kept while together). */
    understands(a: Character, b: Character): boolean;
    /**
     * How well a speaker can reach a court's king: directly, or through one servant of his at court who speaks with both,
     * as the weakest skill along the way; and that servant (null if directly, or if nobody reaches him).
     */
    reach(
      t: Dict<string, number>,
      p: Power,
      exclude: string | null,
    ): { skill: number; through: string | null };
    /** Whether the court where a character stands understands him this season, and through whom. */
    courtHears(
      c: Character,
      p: Power,
      payGoBetween: boolean,
    ): { heard: boolean; through: string | null };
    /** A go-between at a court (free, posting a price) who could carry a character's words to it, cheapest first. */
    goBetweens(c: Character, p: Power): Character[];
    /** The language a tablet is written in. */
    tabletTongue(t: Tablet): string;
    /** Whether a court reads a language with its own scribes ("Which courts read which languages is map data"). */
    reads(p: Power, tongue: string): boolean;
    /**
     * Composing (item 12): how many seasons an envoy needs to take in his king's words, and his tablet's language and the
     * seasons its scribe needs; null if nobody at the court can make him understand at all.
     */
    composing(
      c: Character,
      from: Power,
      to: Power,
    ): { seasons: number; tongue: string } | null;
    /** Whether a character is in someone else's pay than `payer` ("A go-between for hire"): a job, or gold handed lately. */
    inOthersPay(c: Character, payer: string): boolean;
    /** An unheard envoy's model choice taken (item 12, task "Unheard"). */
    applyUnheard(c: Character, ch: UnheardChoice): void;
  }
}

const P = TurnEngine.prototype;

/** The court whose capital is a province, if any. */
function courtOfCapital(e: TurnEngine, province: string): Power | null {
  for (const p of alive(e.s)) if (e.map.capital(p).id === province) return p;
  return null;
}

/** The servants of a court standing there, free to speak for it. */
function servantsAt(e: TurnEngine, p: Power): Character[] {
  return sortBy(
    e.s.characters.filter(
      (x) =>
        x.status === "Employed" &&
        x.employer === p &&
        x.at === p &&
        x.heldBy === null &&
        x.duty === "None",
    ),
    [(x: Character) => idNumber(x.id), cmpNum],
  );
}

P.tonguesOf = function (who) {
  if (typeof who === "string")
    return (
      this.s.kingTongues.tryGet(who) ??
      new Dict([[courtSpeaks(who, this.map.capital(who).id), 100]])
    );
  return who.tongues;
};

P.noteRoad = function (c, spent) {
  this._roadNow.set(c.id, spent.clone());
};

/** The points one season's learning adds: quick at first, slow near the top, by aptitude, spread and the share of the season. */
function gainOf(
  aptitude: number,
  spread: number,
  share: number,
  skill: number,
): number {
  return (
    ((LanguageData.base + aptitude / 5) * spread * share * (100 - skill)) /
    1_000_000
  );
}

P.learnTongues = function () {
  const S = this.s;
  const full = S.config.travelDays * PointsPerDay;
  const learn = (
    t: Dict<string, number>,
    aptitude: number,
    where: [string, number][],
    key: string,
  ): void => {
    const rng = this.r("tongues", key);
    const add = new Dict<string, number>();
    for (const [prov, share] of where)
      for (const [l, w] of spokenIn(prov, courtOfCapital(this, prov)).entries())
        add.set(
          l,
          add.getOrDefault(l, 0) +
            gainOf(aptitude, w, share, t.getOrDefault(l, 0)),
        );
    for (const [l, g] of add.entries()) {
      // The part of a point is a chance of a point, so a short stay still teaches something now and then.
      const whole =
        Math.floor(g) + (rng.nextDouble() < g - Math.floor(g) ? 1 : 0);
      if (whole > 0) t.set(l, clamp(t.getOrDefault(l, 0) + whole, 0, 100));
    }
  };
  for (const c of sortBy(
    S.characters.filter((x) => x.status !== "Dead"),
    [(x: Character) => idNumber(x.id), cmpNum],
  )) {
    const road = this._roadNow.tryGet(c.id);
    let where: [string, number][];
    if (road !== undefined)
      where = [...road.entries()].map(([prov, pts]) => [
        prov,
        clamp(idiv(pts * 100, full), 0, 100),
      ]);
    else {
      const prov = this.provinceOf(c);
      if (prov === null || this.map.get(prov).isSea) continue;
      where = [[prov, 100]];
    }
    learn(c.tongues, c.aptitude, where, c.id);
  }
  // Kings follow the same rules: a king lives at his capital.
  for (const p of alive(S)) {
    const t = S.kingTongues.tryGet(p);
    if (t !== undefined)
      learn(
        t,
        LanguageData.kingAptitude,
        [[this.map.capital(p).id, 100]],
        `king:${p}`,
      );
  }
  this._roadNow.clear();
};

P.understands = function (a, b) {
  if (a === b) return true;
  if (a.understood.includes(b.id)) return true;
  const key = [a.id, b.id].sort(cmpStr).join("|");
  let ok = this._heardNow.tryGet(key);
  if (ok === undefined) {
    const [, skill] = bestShared(a.tongues, b.tongues);
    ok = this.r("speak", key).next(100) < crossChance(skill);
    this._heardNow.set(key, ok);
  }
  if (ok) {
    a.understood.push(b.id);
    b.understood.push(a.id);
  }
  return ok;
};

P.reach = function (t, p, exclude) {
  const king = this.tonguesOf(p);
  let skill = bestShared(t, king)[1];
  let through: string | null = null;
  if (skill >= AtOnce) return { skill, through };
  for (const s of servantsAt(this, p)) {
    if (s.id === exclude) continue;
    const via = Math.min(
      bestShared(t, s.tongues)[1],
      bestShared(s.tongues, king)[1],
    );
    if (via > skill) {
      skill = via;
      through = s.id;
    }
  }
  return { skill, through };
};

P.goBetweens = function (c, p) {
  return sortBy(
    this.s.characters.filter(
      (x) =>
        x !== c &&
        x.status === "Free" &&
        x.at === p &&
        x.heldBy === null &&
        x.bridgePrice !== null,
    ),
    [(x: Character) => x.bridgePrice!, cmpNum],
    [(x: Character) => idNumber(x.id), cmpNum],
  );
};

P.courtHears = function (c, p, payGoBetween) {
  const mark = `@${p}`;
  const r = this.reach(c.tongues, p, c.id);
  if (c.understood.includes(mark)) return { heard: true, through: r.through };
  const key = `${c.id}|${mark}`;
  let ok = this._heardNow.tryGet(key);
  if (ok === undefined) {
    ok = this.r("heard", key).next(100) < crossChance(r.skill);
    this._heardNow.set(key, ok);
  }
  if (ok) {
    c.understood.push(mark);
    return { heard: true, through: r.through };
  }
  if (!payGoBetween) return { heard: false, through: null };
  // A go-between at the court, paid for each message he carries across: the cheapest whose price the purse covers.
  for (const g of this.goBetweens(c, p)) {
    if (c.purse < g.bridgePrice!) continue;
    const gk = `${c.id}|${g.id}|${mark}`;
    let via = this._heardNow.tryGet(gk);
    if (via === undefined) {
      const skill = Math.min(
        bestShared(c.tongues, g.tongues)[1],
        this.reach(g.tongues, p, g.id).skill,
      );
      via = this.r("go-between", gk).next(100) < crossChance(skill);
      this._heardNow.set(gk, via);
    }
    if (!via) continue;
    c.purse -= g.bridgePrice!;
    c.earned.spent += g.bridgePrice!;
    gain(g, g.bridgePrice!, "News");
    logEvent(
      this.s,
      "bridge",
      `${g.name} carried ${c.name}'s words to ${p}'s court.`,
      [],
      "court-go-between",
    );
    remember(
      g,
      this.s.turn,
      `I carried ${c.name}'s words to the court of ${land(p)}, for ${formatMoney(g.bridgePrice!)}.`,
    );
    remember(
      c,
      this.s.turn,
      `${g.name} carried my words to the court of ${land(p)}, for ${formatMoney(g.bridgePrice!)}.`,
    );
    return { heard: true, through: g.id };
  }
  return { heard: false, through: null };
};

P.reads = function (p, tongue) {
  return courtReads(p, this.map.capital(p).id).includes(tongue);
};

/** The language a court writes to another in: one the receiver reads, if its own scribes write it; else its own first. */
function written(e: TurnEngine, from: Power, to: Power | null): string {
  const mine = courtReads(from, e.map.capital(from).id);
  if (to !== null)
    for (const l of courtReads(to, e.map.capital(to).id))
      if (mine.includes(l)) return l;
  return mine.includes("Akkadian")
    ? "Akkadian"
    : (mine[0] ?? courtSpeaks(from, e.map.capital(from).id));
}

P.tabletTongue = function (t) {
  return t.tongue !== "" ? t.tongue : written(this, t.proposedBy, t.partner);
};

/** The seasons a roll of `chance` in a hundred takes to succeed, rolled now for each season to come (at most `most`). */
function seasonsFor(
  e: TurnEngine,
  chance: number,
  key: string,
  most: number,
): number {
  if (chance >= 100) return 0;
  const rng = e.r("compose", key);
  let n = 0;
  while (n < most && rng.next(100) >= chance) n++;
  return n;
}

P.composing = function (c, from, to) {
  // The envoy must grasp his king's words: at once if he speaks the king's language fluently, else by the chance of the
  // weakest skill along the way, through a servant who speaks with both if one does better.
  const r = this.reach(c.tongues, from, c.id);
  if (r.skill <= 0) return null;
  let seasons = seasonsFor(
    this,
    crossChance(r.skill),
    `${c.id}|mandate`,
    LanguageData.composeSeasons,
  );
  let tongue = written(this, from, to);
  if (!this.reads(to, tongue)) {
    // A tablet in a language the receiver reads needs a scribe at court who writes it, the weaker of that language and
    // the king's counting; with none, it goes in the court's own, and waits for a reader there.
    let best = 0;
    let pick: string | null = null;
    const writers: Dict<string, number>[] = [
      this.tonguesOf(from),
      ...servantsAt(this, from)
        .filter((x) => x.id !== c.id)
        .map((x) => x.tongues),
    ];
    for (const l of courtReads(to, this.map.capital(to).id))
      for (const w of writers) {
        const skill = Math.min(
          w.getOrDefault(l, 0),
          bestShared(w, this.tonguesOf(from))[1],
        );
        if (skill > best) {
          best = skill;
          pick = l;
        }
      }
    if (pick !== null) {
      tongue = pick;
      seasons = Math.max(
        seasons,
        seasonsFor(
          this,
          crossChance(best),
          `${c.id}|scribe`,
          LanguageData.composeSeasons,
        ),
      );
    }
  }
  return { seasons, tongue };
};

P.inOthersPay = function (c, payer) {
  const S = this.s;
  if (c.secretMaster !== null && c.secretMaster !== payer) return true;
  if (c.status === "Employed" && c.employer !== null && c.employer !== payer)
    return true;
  return c.handed.some(
    (h) => h.by !== payer && S.turn - h.turn <= LanguageData.paySeasons,
  );
};

P.applyUnheard = function (c, ch) {
  c.unheardPlan = { ...ch };
};

/** A model's choice of last season for an unheard envoy, if it made one; null leaves his traits to decide. */
function planOf(c: Character, turn: number): UnheardChoice | null {
  return c.unheardPlan !== null && c.unheardPlan.turn === turn - 1
    ? c.unheardPlan
    : null;
}

P.settleSpeech = function () {
  const S = this.s;
  this._heardNow.clear();
  // Who is still together: understanding is kept only with those in the same place, and with the court where one stands.
  for (const c of S.characters) {
    if (c.status === "Dead") {
      c.understood = [];
      continue;
    }
    const here = this.provinceOf(c);
    c.understood = c.understood.filter((id) => {
      if (id.startsWith("@")) return c.at === id.slice(1);
      const o = findCharacter(S, id);
      return (
        o !== null &&
        o.status !== "Dead" &&
        here !== null &&
        this.provinceOf(o) === here
      );
    });
    c.handed = c.handed.filter(
      (h) => S.turn - h.turn <= LanguageData.paySeasons,
    );
  }
  this.postPrices();
  // Envoys who waited unheard: each chooses to stay, go home, or say his message was delivered; one who stays is tried again.
  const heardNow: PendingAudience[] = [];
  for (const a of sortBy(
    [...S.unheard],
    [(x: PendingAudience) => idNumber(x.id), cmpNum],
  )) {
    const c = findCharacter(S, a.envoyId);
    if (
      c === null ||
      c.status !== "Employed" ||
      c.duty !== "EnvoyAtCourt" ||
      c.at !== a.host ||
      !isAlive(S, a.host)
    ) {
      S.unheard.splice(S.unheard.indexOf(a), 1);
      continue;
    }
    const trail = this.trail(a.dispatch.trailId);
    const waited = S.turn - (a.unheardSince ?? S.turn);
    const plan = planOf(c, S.turn);
    const choice = plan?.choice ?? scriptChoice(c, waited);
    if (choice !== "stay") {
      S.unheard.splice(S.unheard.indexOf(a), 1);
      trail?.outcomes.push(
        choice === "lie"
          ? `${UnheardOutcome}, and he said at home that his message was delivered`
          : UnheardOutcome,
      );
      remember(
        c,
        S.turn,
        choice === "lie"
          ? `Nobody at the court of ${land(a.host)} understood me. I will tell my lord his words were delivered.`
          : `Nobody at the court of ${land(a.host)} understood me, and I have given up waiting.`,
      );
      logEvent(
        S,
        "unheard",
        `${c.name}, envoy of ${a.from}, left ${a.host} unheard${choice === "lie" ? ", to say at home that he was heard" : ""}.`,
        [],
        choice === "lie" ? "unheard-lie" : "unheard-home",
      );
      this.sendHome(
        c,
        a.host,
        newHomeCargo({
          trailId: a.dispatch.trailId,
          observations: this.observe(c, a.host),
          unheard: choice,
        }),
      );
      continue;
    }
    const h = this.courtHears(c, a.host, true);
    if (h.heard) {
      S.unheard.splice(S.unheard.indexOf(a), 1);
      a.through = h.through;
      heardNow.push(a);
    }
  }
  // The envoys arrived this season: heard, or waiting.
  for (const a of sortBy(
    [...S.audiences],
    [(x: PendingAudience) => idNumber(x.id), cmpNum],
  )) {
    const c = char(S, a.envoyId);
    const h = this.courtHears(c, a.host, true);
    if (h.heard) {
      a.through = h.through;
      if (
        h.through !== null &&
        findCharacter(S, h.through)?.status === "Employed"
      )
        logEvent(
          S,
          "bridge",
          `A servant of ${a.host} carried ${c.name}'s words.`,
          [],
          "bridged-servant",
        );
      continue;
    }
    S.audiences.splice(S.audiences.indexOf(a), 1);
    S.unheard.push(a);
    this.presentUnheard(a, c);
  }
  S.audiences.push(...heardNow);
  // Each envoy still waiting is asked what he does next season (a model's choice; a script's traits decide by themselves).
  for (const a of sortBy(
    [...S.unheard],
    [(x: PendingAudience) => idNumber(x.id), cmpNum],
  )) {
    const c = char(S, a.envoyId);
    const trail = this.trail(a.dispatch.trailId);
    const waited = S.turn - (a.unheardSince ?? S.turn);
    this.mindRequests.push(
      newMindRequest({
        id: newId(S, "r"),
        task: "Unheard",
        characterId: c.id,
        court: a.from,
        trailId: trail?.id ?? null,
        unheard: newUnheardView({
          turn: S.turn,
          host: a.host,
          lord: a.from,
          waited,
          presented: a.presented,
          purse: c.purse,
          goBetweens: this.goBetweens(c, a.host).map((g) => ({
            name: g.name,
            price: g.bridgePrice!,
          })),
          tongues: tongueClaims(c),
          courtTongue: courtSpeaks(a.host, this.map.capital(a.host).id),
        }),
      }),
    );
  }

  // Whether each court can read the tablet its envoy brought to be sealed (the first audience it is shown at).
  for (const a of S.audiences) {
    const tid = a.dispatch.proposalTabletId;
    const t = tid === null ? undefined : S.tablets.find((x) => x.id === tid);
    a.proposalRead =
      t === undefined ||
      this.readable(a.host, this.tabletTongue(t), `${a.id}|proposal`);
  }
  this.readersSeason();
};

/** A script envoy's choice when nobody understands him (first guesses): he waits a season, one more for every 25 of loyalty; then a disloyal greedy one says he was heard, any other goes home. */
function scriptChoice(c: Character, waited: number): "stay" | "home" | "lie" {
  const t = c.traits;
  if (waited < 1 + idiv(t.loyalty, LanguageData.patienceStep)) return "stay";
  return t.loyalty < LanguageData.lieLoyalty && t.greed >= LanguageData.lieGreed
    ? "lie"
    : "home";
}

declare module "./core.ts" {
  interface TurnEngine {
    /** An envoy nobody understands presents his gifts, the only language left, and the host's king is told so plainly. */
    presentUnheard(a: PendingAudience, c: Character): void;
    /** Whether a court can read a tablet in a language this season: its own scribes, or a reader among its people. */
    readable(p: Power, tongue: string, key: string): boolean;
    /** Each season: tablets waiting at a court for a reader find one, or wait on. */
    readersSeason(): void;
    /** Each season: free people who speak two or more languages well post a price for bridging where they stand. */
    postPrices(): void;
    /**
     * Two characters with no shared language: the cheapest go-between where they stand whom both understand, paid by the
     * first for the message (true), or false if none can carry it this season.
     */
    bridgeTo(a: Character, b: Character): boolean;
    /** The go-between, and his price, through whom one character can reach another this season; null if none. */
    bridgeFor(a: Character, b: Character): Character | null;
    /** The one who carries an envoy's words at an audience, if he is in someone else's pay: he may bend them ("Bridge"). */
    benderOf(a: PendingAudience): Character | null;
    /** What such a bridger is asked: the envoy's words as spoken, and who else pays him. */
    bridgeView(
      a: PendingAudience,
      x: Character,
      speech: string,
      clauses: Clause[],
    ): BridgeView;
    /** The words an audience's bridger carried: he heard them all; if he changed them, someone present may notice. */
    bridged(a: PendingAudience, changed: boolean): void;
  }
}

P.presentUnheard = function (a, c) {
  const S = this.s;
  const d = a.dispatch;
  const trail = this.trail(d.trailId);
  a.unheardSince = S.turn;
  let gifts = "he brought no gifts";
  if (d.gold > 0) {
    const fine = toInt(roundEven((d.gold * d.purityPercent) / 100.0));
    const t = S.treasuries.get(a.host);
    t.gold += fine;
    t.lots.push(
      newGoldLot({
        id: newId(S, "g"),
        from: a.from,
        stated: d.gold,
        face: d.gold,
        true: fine,
        arrivedTurn: S.turn,
      }),
    );
    if (d.inventory)
      this.inventory(
        c,
        a.from,
        a.host,
        d.gold,
        trail?.turn ?? S.turn,
        false,
        `the inventory brought by ${c.name}, envoy of ${a.from}`,
      );
    if (trail !== null) {
      trail.goldDelivered = d.gold;
      trail.goldFine = fine;
      trail.outcomes.push(`presented ${d.gold} shekels of gifts, unheard`);
    }
    a.presented = d.gold;
    gifts = `he presented gifts weighing ${d.gold} shekels`;
    d.gold = 0;
    d.inventory = false;
  }
  remember(
    c,
    S.turn,
    `Nobody at the court of ${land(a.host)} understands me. I presented ${a.presented > 0 ? "the gifts" : "myself"}, and wait.`,
  );
  notify(
    S,
    a.host,
    "Notice",
    UnheardTitle,
    `${c.name}, an envoy of ${land(a.from)}, stands at your court, but nobody at your court understands him; ${gifts}. Someone who speaks his tongue, a servant you hire or a go-between he pays, may yet carry his words.`,
    c.id,
  );
  logEvent(
    S,
    "unheard",
    `Nobody at ${a.host}'s court understood ${c.name}, envoy of ${a.from}.`,
    [a.host],
    "unheard",
  );
};

P.readable = function (p, tongue, key) {
  if (this.reads(p, tongue)) return true;
  // A reader at court: the king himself, or a servant; the weaker of the tablet's language and the king's counts.
  const king = this.tonguesOf(p);
  let best = king.getOrDefault(tongue, 0);
  for (const s of servantsAt(this, p))
    best = Math.max(
      best,
      Math.min(
        s.tongues.getOrDefault(tongue, 0),
        bestShared(s.tongues, king)[1],
      ),
    );
  return this.r("read", `${p}|${key}`).next(100) < crossChance(best);
};

P.readersSeason = function () {
  const S = this.s;
  for (const k of S.copies) {
    if (k.unread === false) continue;
    const t = S.tablets.find((x) => x.id === k.tabletId);
    if (t === undefined || !isAlive(S, k.holder)) continue;
    const tongue = this.tabletTongue(t);
    if (k.unread === null && this.reads(k.holder, tongue)) {
      k.unread = false;
      continue;
    }
    const was = k.unread;
    k.unread = !this.readable(k.holder, tongue, k.id);
    if (k.unread) t.tongue = tongue;
    if (was === true && !k.unread) {
      notify(
        S,
        k.holder,
        "Notice",
        "A tablet read",
        `A tablet in ${tongue} that waited in your archive for a reader has been read to you.`,
      );
      logEvent(
        S,
        "language",
        `A tablet in ${tongue} was read at last at ${k.holder}'s court.`,
        [k.holder],
        "tablet-read-late",
      );
    } else if (was === null && k.unread)
      logEvent(
        S,
        "language",
        `A tablet in ${tongue} waits for a reader at ${k.holder}'s court.`,
        [k.holder],
        "tablet-unread",
      );
  }
};

P.postPrices = function () {
  const S = this.s;
  for (const c of S.characters) {
    const good = [...c.tongues.values()].filter((x) => x >= 40).length;
    c.bridgePrice =
      c.status === "Free" && c.at !== null && c.heldBy === null && good >= 2
        ? Math.max(
            LanguageData.bridgeMin,
            idiv(basePrice(c, c.at) * LanguageData.bridgeShare, 100),
          )
        : null;
  }
};

P.bridgeFor = function (a, b) {
  if (a.at === null || a.at !== b.at) return null;
  for (const g of this.goBetweens(a, a.at))
    if (
      g !== b &&
      a.purse >= g.bridgePrice! &&
      this.understands(a, g) &&
      this.understands(g, b)
    )
      return g;
  return null;
};

P.bridgeTo = function (a, b) {
  const g = this.bridgeFor(a, b);
  if (g === null) return false;
  a.purse -= g.bridgePrice!;
  a.earned.spent += g.bridgePrice!;
  gain(g, g.bridgePrice!, "News");
  remember(
    g,
    this.s.turn,
    `I carried ${a.name}'s words to ${b.name}, for ${formatMoney(g.bridgePrice!)}.`,
  );
  logEvent(
    this.s,
    "bridge",
    `${g.name} bridged for ${a.name} and ${b.name}.`,
    [],
    "go-between",
  );
  return true;
};

P.benderOf = function (a) {
  const x = findCharacter(this.s, a.through);
  if (x === null) return null;
  // A servant of the host's is paid by his king; a go-between by the envoy, for this message.
  const payer =
    x.status === "Employed" && x.employer === a.host ? a.host : a.envoyId;
  return this.inOthersPay(x, payer) ? x : null;
};

P.bridgeView = function (a, x, speech, clauses) {
  const S = this.s;
  const payer =
    x.status === "Employed" && x.employer === a.host ? a.host : a.envoyId;
  const paidBy = new Set<string>();
  if (x.secretMaster !== null && x.secretMaster !== payer)
    paidBy.add(land(x.secretMaster));
  if (x.status === "Employed" && x.employer !== null && x.employer !== payer)
    paidBy.add(land(x.employer));
  for (const h of x.handed)
    if (h.by !== payer && S.turn - h.turn <= LanguageData.paySeasons)
      paidBy.add(findCharacter(S, h.by)?.name ?? land(h.by as Power));
  return newBridgeView({
    turn: S.turn,
    envoy: char(S, a.envoyId).name,
    from: a.from,
    host: a.host,
    paidBy: [...paidBy].sort(cmpStr),
    speech,
    clauses: clauses.map((c) => ({ ...c })),
  });
};

P.bridged = function (a, changed) {
  const S = this.s;
  const x = findCharacter(S, a.through);
  if (x === null) return;
  const c = char(S, a.envoyId);
  // He hears every word, as a scribe does: what the envoy carried passed through him.
  if (a.dispatch.proposalTabletId !== null)
    this.saw(x, a.dispatch.proposalTabletId);
  remember(
    x,
    S.turn,
    `I carried the words of ${c.name}, envoy of ${land(a.from)}, to the court of ${land(a.host)}${changed ? ", and changed them as I chose" : ""}.`,
  );
  if (!changed) return;
  this.trail(a.dispatch.trailId)?.outcomes.push(
    `${x.name}, who carried his words, changed them`,
  );
  logEvent(
    S,
    "bridge",
    `${x.name} bent the words of ${c.name}, envoy of ${a.from}, at ${a.host}'s court.`,
    [],
    "bent-words",
  );
  // Anyone present who understands both may notice the difference, by the same chance as speaking.
  const king = this.tonguesOf(a.host);
  for (const w of servantsAt(this, a.host)) {
    if (w === x) continue;
    const skill = Math.min(
      bestShared(w.tongues, c.tongues)[1],
      bestShared(w.tongues, king)[1],
    );
    if (this.r("bent-seen", `${a.id}|${w.id}`).next(100) >= crossChance(skill))
      continue;
    x.facts.push(
      newFact({
        id: newId(S, "f"),
        text: `Changed the words of ${c.name}, envoy of ${land(a.from)}, carrying them to the court of ${land(a.host)}.`,
        secrecy: "Hidden",
        tag: "bent",
        knownBy: [a.host],
      }),
    );
    remember(
      w,
      S.turn,
      `I heard ${x.name} change the words of ${c.name}, envoy of ${land(a.from)}, as he carried them to my lord.`,
    );
    notify(
      S,
      a.host,
      "Notice",
      "Words bent",
      `${w.name}, who understands both, heard ${x.name} change the words of ${c.name}, envoy of ${land(a.from)}, as he carried them to you.`,
      x.id,
    );
    logEvent(
      S,
      "bridge",
      `${w.name} noticed ${x.name} bend an envoy's words at ${a.host}'s court.`,
      [a.host],
      "bent-noticed",
    );
    break;
  }
};

/** A language skill in words, as a character knows its own and claims it ("halting", "good", "fluent"). */
export function tongueClaims(c: Character): string[] {
  return sortBy(
    [...c.tongues.entries()].filter(([, x]) => x > 0),
    [([, x]: [string, number]) => x, desc(cmpNum)],
    [([l]: [string, number]) => l, cmpStr],
  ).map(([l, x]) => `${l} (${tongueWords(x)})`);
}
