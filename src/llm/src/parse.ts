/** Turns structured model output into ordinary engine orders, which then face the same validator as everyone's. */
import {
  ClauseKindValues,
  clause,
  type Clause,
  type ClauseKind,
  WorldMap,
  besiege,
  buy,
  captive,
  question,
  handOver,
  steal,
  giftTo,
  cede,
  check,
  clamp,
  convoy,
  counterIntel,
  roads,
  revoke,
  grant,
  repudiate,
  newAuthority,
  disband,
  tax,
  welcome,
  expel,
  deport,
  returnRunaways,
  dismiss,
  dispatch,
  forge,
  fortify,
  sell,
  purchase,
  feed,
  caravan,
  trade,
  ship,
  toll,
  giftUnit,
  hire,
  payFee,
  borrow,
  repay,
  buyNews,
  hold,
  move,
  newCondition,
  newStandingAnswerRequest,
  newEnvoyReaction,
  newGreetingOptions,
  newHostReply,
  newMindReply,
  newScheduledOrders,
  newStandingRequest,
  newTabletProposal,
  newTurnSubmission,
  parsePower,
  payRansom,
  payCarriers,
  hunt,
  huntBands,
  seize,
  sellDebt,
  placeSpy,
  raise,
  recall,
  release,
  renew,
  sally,
  seekCandidates,
  support,
  assay,
  authenticate,
  trim,
  unreadable,
  type AnswerBrings,
  type Condition,
  type StandingAnswerRequest,
  type ConditionKind,
  type EnvoyReaction,
  type HostReply,
  type LedgerLine,
  type MindReply,
  type Order,
  type Power,
  type TurnSubmission,
  type Skills,
  newSkills,
  SkillValues,
  SkillBands,
  BandValues,
} from "@amarna/engine";
import { newPresentResult, type PresentResult } from "@amarna/game";
import type { JsonObject } from "./schemas.ts";

type Node = unknown;

const field = (n: Node, key: string): unknown => (n !== null && typeof n === "object" && !Array.isArray(n) ? (n as JsonObject)[key] : undefined);

/** A string field, trimmed; "" when absent. A field of another kind is an error, as GetValue<string> throws. */
function S(n: Node, key: string): string {
  const v = field(n, key);
  if (v === undefined || v === null) return "";
  if (typeof v !== "string") throw new Error(`${key}: not a string`);
  return trim(v);
}

/** An integer field; 0 when absent or not an integer. */
function I(n: Node, key: string): number {
  const v = field(n, key);
  return typeof v === "number" && Number.isInteger(v) && v >= -2147483648 && v <= 2147483647 ? v : 0;
}

/** A boolean field; false when absent or not a boolean. */
function B(n: Node, key: string): boolean {
  return field(n, key) === true;
}

/** The non-empty strings of an array field. */
function L(n: Node, key: string): string[] {
  const a = field(n, key);
  if (!Array.isArray(a)) return [];
  return a
    .map((x) => {
      if (x === null || x === undefined) return "";
      if (typeof x !== "string") throw new Error(`${key}: not a string`);
      return trim(x);
    })
    .filter((x) => x.length > 0);
}

const items = (n: Node, key: string): Node[] => {
  const a = field(n, key);
  return Array.isArray(a) ? a : [];
};

const empty = (s: string): string | null => (s.length === 0 ? null : s);

const P = (s: string): Power | null => parsePower(s);

function prov(s: string): string {
  return WorldMap.default.find(s)?.id ?? s.toLowerCase();
}

/** The clauses of a field (item 8): those of a kind the templates know, with "" and 0 read as not given. The engine checks the rest. */
export function clausesOf(n: Node, key: string): Clause[] {
  const out: Clause[] = [];
  for (const x of items(n, key)) {
    const kind = S(x, "kind");
    if (!(ClauseKindValues as readonly string[]).includes(kind)) continue;
    const answers = S(x, "answers");
    const place = (k: string): string | null => empty(S(x, k)) === null ? null : prov(S(x, k));
    out.push(
      clause(kind as ClauseKind, {
        power: P(S(x, "king")),
        province: place("province"),
        to: place("into"),
        turn: I(x, "season") > 0 ? I(x, "season") : null,
        amount: kind === "newsStrength" ? I(x, "gold") : I(x, "gold") > 0 ? I(x, "gold") : null,
        answers: (ClauseKindValues as readonly string[]).includes(answers) ? (answers as ClauseKind) : null,
      }),
    );
  }
  return out;
}

const ConditionKinds: Record<string, ConditionKind> = {
  troops_in: "TroopsIn",
  treasury_less_than: "TreasuryBelow",
  treasury_at_least: "TreasuryAtLeast",
  envoy_back: "EnvoyBack",
  tablet_sealed: "TabletSealed",
  stores_at_least: "StoresAtLeast",
};

const Brings: Record<string, AnswerBrings> = { anything: "Anything", words: "Words", gold: "Gold", tablet: "Tablet" };

/** The standing answers of a reply (orders or court). */
export function answersOf(o: Node): StandingAnswerRequest[] {
  return items(o, "standing_answers").map((x) => {
    const from = S(x, "from");
    const brings = Brings[S(x, "brings").toLowerCase()];
    return newStandingAnswerRequest({
      from: from.length > 0 ? P(from) : null,
      brings: brings ?? "Anything",
      minGold: Math.max(0, I(x, "min_gold")),
      seal: B(x, "seal"),
      goldBack: I(x, "gold_back_percent"),
      say: S(x, "say"),
      conditions: conditionsOf(x),
      unreadable: brings === undefined ? "name what the envoy brings: anything, words, gold or tablet" : from.length > 0 && P(from) === null ? `there is no court called '${from}'` : null,
    });
  });
}

/** The conditions of an entry, a standing order or a standing answer; one of a kind nobody knows is left out. */
export function conditionsOf(n: Node): Condition[] {
  const out: Condition[] = [];
  for (const c of items(n, "conditions")) {
    const kind = ConditionKinds[S(c, "kind").toLowerCase()];
    if (kind === undefined) continue;
    const named = empty(S(c, "power"));
    const province = empty(S(c, "province"));
    out.push(
      newCondition({
        kind,
        unless: S(c, "test").toLowerCase() === "unless",
        power: named !== null ? P(named) : null,
        province: province !== null ? prov(province) : "",
        amount: Math.max(0, I(c, "amount")),
        person: S(c, "person").toLowerCase(),
        // A court nobody knows is not read as "any court": its entry is refused with the reason.
        unreadable: named !== null && P(named) === null ? `its condition names a court nobody knows ('${named}')` : "",
      }),
    );
  }
  return out;
}

export function orders(o: JsonObject): TurnSubmission {
  // The king's notes and its summary of older seasons are for its own record; the engine ignores them. Its ledger too.
  const sub = newTurnSubmission({ notes: S(o, "notes"), summary: S(o, "summary"), ledger: ledger(o) });
  for (const u of items(o, "units")) {
    const order = unit(u);
    if (order !== null) sub.orders.push(order);
  }
  sub.orders.push(...letters(o));
  for (const x of items(o, "other_orders")) {
    const order = other(x);
    if (order !== null) sub.orders.push(order);
  }

  // Sleeping seats: orders for later seasons.
  for (const plan of items(o, "schedule")) {
    const scheduled = newScheduledOrders({ turn: I(plan, "turn") });
    for (const u of items(plan, "units")) {
      const order = unit(u);
      if (order !== null) scheduled.orders.push(order);
    }
    for (const x of items(plan, "other_orders")) {
      const order = other(x);
      if (order !== null) scheduled.orders.push(order);
    }
    scheduled.conditions = conditionsOf(plan);
    if (scheduled.turn > 0) sub.scheduled.push(scheduled);
  }
  // Standing orders: when this move is seen, give these orders in the same season; and those to cancel.
  for (const s of items(o, "standing_orders")) {
    const when = S(s, "when");
    const named = S(s, "power");
    const sp = empty(S(s, "province"));
    const standing = newStandingRequest({
      when: when === "unit_attacked" ? "UnitAttacked" : "UnitEnters",
      power: P(named),
      province: sp !== null ? prov(sp) : "",
      // The schema lists the events, so only a reply that ignores it lands here: refused with the reason, not dropped.
      unreadable:
        when !== "unit_enters" && when !== "unit_attacked"
          ? "name the event it waits for: unit_enters or unit_attacked"
          : when === "unit_enters" && named.length > 0 && P(named) === null
            ? nowhere(named, "")
            : null,
    });
    for (const u of items(s, "units")) {
      const order = unit(u);
      if (order !== null) standing.orders.push(order);
    }
    for (const x of items(s, "other_orders")) {
      const order = other(x);
      if (order !== null) standing.orders.push(order);
    }
    standing.conditions = conditionsOf(s);
    sub.standing.push(standing);
  }
  sub.cancelStanding = L(o, "cancel_standing");
  sub.answers = answersOf(o);
  sub.cancelAnswers = L(o, "cancel_answers");
  return sub;
}

/** The letters of a reply: each a dispatch order, or, for a court that cannot be read, an order the validator refuses. */
export function letters(o: JsonObject): Order[] {
  const list: Order[] = [];
  for (const l of items(o, "letters")) {
    const to = P(S(l, "to"));
    if (to === null) {
      list.push(unreadable(`send ${S(l, "envoy")} to '${S(l, "to")}'`, nowhere(S(l, "to"), "the court to send the envoy to")));
      continue;
    }
    const tablet = S(l, "tablet_to_seal");
    const tabletClauses = clausesOf(l, "tablet_clauses");
    const copies = L(l, "show_tablet_copies");
    const purity = I(l, "purity");
    list.push(
      dispatch(S(l, "envoy"), to, S(l, "message"), {
        mandate: S(l, "mandate"),
        greeting: newGreetingOptions({
          callBrother: B(l, "call_brother"),
          grantGreatKing: B(l, "call_them_great_king"),
          claimGreatKing: B(l, "claim_great_king"),
          senderFirst: B(l, "your_name_first"),
          omit: B(l, "omit_greeting"),
        }),
        gold: Math.max(0, I(l, "gold")),
        purityPercent: clamp(purity === 0 ? 100 : purity, 10, 100),
        proposal: tablet.length > 0 || tabletClauses.length > 0 ? newTabletProposal({ text: tablet, allianceOath: B(l, "sworn_alliance"), clauses: tabletClauses }) : null,
        copies: copies.length > 0 ? copies : null,
        clauses: clausesOf(l, "clauses"),
        noInventory: B(l, "no_inventory"),
        checkClaim: S(l, "check_claim") || null,
        collect: S(l, "collect") || null,
        authority:
          B(l, "carry_seal") || B(l, "show_credentials")
            ? newAuthority({
                seal: B(l, "carry_seal"),
                show: B(l, "show_credentials"),
                maxGold: Math.max(0, I(l, "seal_max_gold")),
                cede: L(l, "seal_may_cede").map(prov),
                open: L(l, "seal_may_open").map(prov),
              })
            : null,
      }),
    );
  }
  return list;
}

/** Why a power named in an order cannot be read: none was named, or no power goes by that name. */
function nowhere(named: string, what: string): string {
  return named.length === 0 ? `name ${what}` : `there is no power called '${named}'`;
}

// A unit order that leaves out where to go, whom to support or what to carry still reaches the validator, which refuses it
// with the reason (the unit then holds): an order is never dropped without its king being told.
function unit(u: Node): Order | null {
  const at = prov(S(u, "unit"));
  const t = empty(S(u, "target"));
  const target = t !== null ? prov(t) : "";
  const d = empty(S(u, "to"));
  const to = d !== null ? prov(d) : null;
  switch (S(u, "order")) {
    case "move":
      return move(at, target);
    case "support":
      return support(at, target, to);
    case "convoy":
      return convoy(at, target, to ?? "");
    case "disband":
      return disband(at);
    case "settle":
      return disband(at, true);
    case "hold":
      return hold(at);
    case "besiege":
      return besiege(at);
    case "sally":
      return sally(at, target);
    default:
      return null;
  }
}

function other(x: Node): Order | null {
  const person = S(x, "person");
  const amount = I(x, "amount");
  const pr = empty(S(x, "province"));
  const province = pr !== null ? prov(pr) : "";
  const named = S(x, "power");
  const power = P(named);
  // Seasons of service for hire and renew: 0 (or none given) means the usual 6; the engine keeps it to 1-30.
  const t = I(x, "term");
  const term = t > 0 ? t : 6;
  const seals = L(x, "seals");
  switch (S(x, "action")) {
    case "raise_army":
      return raise(province, "Army", amount > 0 ? amount : null);
    case "raise_fleet":
      return raise(province, "Fleet", amount > 0 ? amount : null);
    case "buy_city":
      return buy(province);
    case "fortify":
      return fortify(province);
    case "sell_grain":
      return sell(province, amount);
    case "buy_grain":
      return purchase(province, amount);
    case "feed_town":
      return feed(province, amount);
    case "caravan": {
      const to = empty(S(x, "to"));
      return caravan(province, to !== null ? prov(to) : "", amount);
    }
    case "trade":
    case "smuggle": {
      const to = empty(S(x, "to"));
      return trade(province, to !== null ? prov(to) : "", amount, Math.max(0, I(x, "gold")), S(x, "action") === "smuggle");
    }
    case "ship_trade":
    case "ship_deliver": {
      const to = empty(S(x, "to"));
      return ship(province, province, to !== null ? prov(to) : "", amount, Math.max(0, I(x, "gold")), S(x, "action") === "ship_trade");
    }
    case "set_tax":
      return tax(amount, pr !== null ? province : null);
    case "welcome_loose":
      return welcome(province);
    case "expel_mouths":
      return expel(province, amount > 0 ? amount : 50);
    case "deport": {
      const to = empty(S(x, "to"));
      return deport(province, to !== null ? prov(to) : "", amount, I(x, "gold") > 0);
    }
    case "return_runaways":
      return power !== null ? returnRunaways(province, power) : unreadable(`send runaways in ${province} back to '${named}'`, nowhere(named, "the king whose runaways they are"));
    case "set_toll":
      return named.trim() !== "" && power === null ? unreadable(`set a toll on '${named}'`, nowhere(named, "the partner")) : toll(amount, power, pr !== null ? province : null);
    case "cede_province":
      return power !== null ? cede(province, power) : unreadable(`cede ${province} to '${named}'`, nowhere(named, "the power to cede it to"));
    case "give_unit":
      return power !== null ? giftUnit(province, power) : unreadable(`give ${province} to '${named}'`, nowhere(named, "the power to give it to"));
    case "seek_candidates":
      return seekCandidates();
    case "hire":
    case "renew": {
      // Haakon's answers to item 11a: the advance is what the king names, nothing assumed; the errand, the standing orders,
      // and the envoy carrying an offer abroad (item) as he gives them.
      const advance = Math.max(0, Math.min(I(x, "gold"), amount));
      const what = S(x, "errand");
      const standing = S(x, "standing");
      const via = S(x, "action") === "hire" ? empty(S(x, "item")) : null;
      const job = {
        what: what === "envoy" || what === "spy" ? what : null,
        where: power ?? (pr !== null ? province : named || null),
        payOnDone: standing === "pay_on_done" || standing === "both",
        offerAgain: standing === "offer_again" || standing === "both",
        via,
      } as const;
      return S(x, "action") === "hire" ? hire(person, amount, term, advance, job) : renew(person, amount, term, advance, job);
    }
    case "seize_hoard":
      return seize(person);
    case "sell_tablet":
      return sellDebt(S(x, "item"), person, amount);
    case "pay_carriers":
      return payCarriers(true);
    case "stop_paying_carriers":
      return payCarriers(false);
    case "captive_take_purse":
      return captive(person, "TakePurse");
    case "hunt_bands":
      return hunt(province);
    case "hunt_bands_always":
      return huntBands(true);
    case "stop_hunting_bands":
      return huntBands(false);
    case "pay_fee":
      return payFee(person, true);
    case "withhold_fee":
      return payFee(person, false);
    case "borrow":
      return borrow(person, amount, Math.max(amount, I(x, "gold")), term);
    case "repay":
      return repay(S(x, "item"), amount);
    case "buy_news":
      return power !== null ? buyNews(person, power) : unreadable(`buy news of '${named}'`, nowhere(named, "the court"));
    case "dismiss":
      return dismiss(person);
    case "background_check":
      return check(person, amount);
    case "place_spy":
      if (power !== null) return placeSpy(person, power);
      if (province.length > 0) return placeSpy(person, null, province);
      if (named.length > 0) return unreadable(`send ${person} to spy on '${named}'`, nowhere(named, "the court to watch"));
      // Neither a court nor a province: the validator refuses it with the reason, rather than the order vanishing.
      return placeSpy(person);
    case "recall_spy":
      return recall(person);
    case "counter_intelligence":
      return counterIntel(amount);
    case "close_roads":
    case "open_roads": {
      const close = S(x, "action") === "close_roads";
      return power !== null ? roads(power, close) : unreadable(`${close ? "close" : "open"} your roads to '${named}'`, nowhere(named, "the court"));
    }
    case "grant_passage":
    case "grant_basing":
      return power !== null
        ? grant(power, S(x, "action") === "grant_basing" ? "basing" : "passage", province.length > 0 ? province : null, amount > 0 ? amount : null)
        : unreadable(`grant leave to '${named}'`, nowhere(named, "the king you grant it"));
    case "revoke_passage":
      return power !== null ? revoke(power, province.length > 0 ? province : null) : unreadable(`revoke the passage you granted '${named}'`, nowhere(named, "the king you granted it"));
    case "repudiate":
      return repudiate(S(x, "item"));
    case "assay":
      return assay(S(x, "item"));
    case "authenticate":
      return authenticate(S(x, "item"), amount);
    case "forge": {
      // Every seal must name a power: a forgery is never made with fewer seals than the king asked for.
      const bad = seals.find((n) => P(n) === null);
      if (bad !== undefined) return unreadable(`have ${person} forge a tablet sealed by ${seals.join(", ")}`, nowhere(bad, ""));
      return forge(person, S(x, "text"), seals.map((n) => P(n)!));
    }
    case "captive_execute":
      return captive(person, "Execute");
    case "captive_ransom":
      return captive(person, "Ransom", amount);
    case "captive_turn":
      return captive(person, "Turn", 0, S(x, "text"));
    case "captive_release":
      return captive(person, "Release");
    case "captive_question":
      return question(person, amount);
    case "captive_hand_over": {
      const to = P(S(x, "power"));
      return to === null ? unreadable(`hand the captive ${person} over`, "name the king to hand them over to") : handOver(person, to);
    }
    case "steal_tablet":
      return steal(person);
    case "give_gift":
      return giftTo(person, amount);
    case "release_detained":
      return release(person, S(x, "text"));
    case "pay_ransom":
      return payRansom(person);
    default:
      return null;
  }
}

/** The lines of the king's ledger of dealings, in an orders reply or an audience reply. */
export function ledger(o: JsonObject): LedgerLine[] {
  const lines: LedgerLine[] = [];
  for (const l of items(o, "ledger")) {
    const court = P(S(l, "court"));
    if (court !== null) lines.push({ court, entry: S(l, "entry") });
  }
  return lines;
}

export function host(o: JsonObject): HostReply {
  const purity = I(o, "gold_back_purity");
  return newHostReply({
    speech: S(o, "speech"),
    bribe: Math.max(0, I(o, "gift_to_envoy")),
    bribeAsk: S(o, "gift_request"),
    clauses: clausesOf(o, "clauses"),
    bribeClauses: clausesOf(o, "gift_news"),
    counter:
      S(o, "your_tablet").length > 0 || clausesOf(o, "your_tablet_clauses").length > 0 ? newTabletProposal({ text: S(o, "your_tablet"), clauses: clausesOf(o, "your_tablet_clauses") }) : null,
    jobOffer: Math.max(0, I(o, "offer_service_wage")),
    sealProposal: B(o, "seal_tablet"),
    detain: B(o, "detain_envoy"),
    goldBack: Math.max(0, I(o, "send_gold_back")),
    goldBackPurity: clamp(purity === 0 ? 100 : purity, 10, 100),
    end: B(o, "end_audience"),
    // Only an audience held while the king's orders stand offers these; the engine ignores them anywhere else.
    letters: letters(o),
    reopenOrders: B(o, "reopen_orders"),
  });
}

/** The answers of a court reply, by the id of the envoy each answers (the first answer for an envoy counts). */
export function court(o: JsonObject): Map<string, HostReply> {
  const out = new Map<string, HostReply>();
  for (const x of items(o, "answers")) {
    const id = trim(S(x, "envoy")).toLowerCase();
    if (id.length > 0 && !out.has(id)) {
      // Letters and the choice about its orders are the court's, not one answer's: they are read once, from the reply.
      const reply = host(x as JsonObject);
      reply.letters = [];
      reply.reopenOrders = false;
      out.set(id, reply);
    }
  }
  return out;
}

export const present = (o: JsonObject): PresentResult => newPresentResult({ speech: S(o, "speech"), skim: Math.max(0, I(o, "keep_gold")), swapInventory: B(o, "swap_inventory") });

export const react = (o: JsonObject): EnvoyReaction =>
  newEnvoyReaction({ speech: S(o, "speech"), acceptBribe: B(o, "accept_gift"), acceptJob: B(o, "accept_service"), commitments: S(o, "commitments"), sealCounter: B(o, "seal_tablet") });

export const reportOf = (o: JsonObject): MindReply => newMindReply({ text: S(o, "report"), number: Math.max(0, I(o, "keep_gold")), swapInventory: B(o, "swap_inventory") });

/** A claim given as a band's words (item 10+b), at the middle of the band; null where any is missing or unknown. */
function claimsOf(o: JsonObject): Skills | null {
  const out = newSkills();
  for (const k of SkillValues) {
    const i = SkillBands[k].indexOf(S(o, `say_${k}`));
    if (i < 0) return null;
    out[k] = BandValues[i];
  }
  return out;
}

export const pitchOf = (o: JsonObject, envoyOf: Power | null = null): MindReply =>
  newMindReply({
    text: S(o, "pitch"),
    number: Math.max(1, I(o, "asking_price")),
    name: S(o, "name") || null,
    claimsToServe: envoyOf !== null && B(o, "envoy_of") ? envoyOf : null,
    claims: claimsOf(o),
  });

/** A captive's answer under questioning (item 10+b). */
export const questionedOf = (o: JsonObject): MindReply =>
  newMindReply({ text: S(o, "words"), lies: B(o, "lie"), league: B(o, "lie") ? (parsePower(S(o, "league_with")) ?? null) : null });

export const fieldOf = (o: JsonObject, key: string): string => S(o, key);

export const Parse = { orders, ledger, host, court, letters, answers: answersOf, cancelAnswers: (o: JsonObject): string[] => L(o, "cancel_answers"), present, react, report: reportOf, pitch: pitchOf, questioned: questionedOf, field: fieldOf };
