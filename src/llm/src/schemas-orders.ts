/**
 * The orders reply's schema: a king's unit and other orders, conditions and standing answers, orders of command, and the
 * clauses, letters and ledger that an audience reply writes the same way.
 */
import { z } from "zod";
import { AllPowers, ClauseKindValues, EngageValues, MandateTaskValues, WithdrawValues, MaxAnswerSay, MaxAnswers, MaxConditions, MaxScheduledPerSeason, MaxScheduledSeasons, MaxStanding, fmtN, type GameConfig } from "@amarna/engine";
import { LeaderJournal } from "./journal.ts";
import { array, bool, enumOf, int, object, str, type ReplySchema } from "./schema-tools.ts";

// "2,000" whatever the machine's culture: every king reads the same schema.
const thousands = (n: number): string => fmtN(n, 0);

const powerNames = AllPowers as unknown as readonly [string, ...string[]];

export const OtherActions = [
  "raise_army",
  "raise_fleet",
  "raise_army_share",
  "raise_fleet_share",
  "cede_province",
  "give_unit",
  "build",
  "build_corvee",
  "sell_grain",
  "buy_grain",
  "feed_town",
  "feed_town_in_own_name",
  "send_gold",
  "pay_troops",
  "stop_paying_troops",
  "feed_troops",
  "stop_feeding_troops",
  "caravan",
  "trade",
  "smuggle",
  "ship_trade",
  "ship_deliver",
  "set_toll",
  "ask_share",
  "ask_amount",
  "census",
  "build_corvee_share",
  "take_up_province",
  "refuse_province",
  "letter_send",
  "letter_sell",
  "buy_letter",
  "welcome_loose",
  "deport",
  "return_runaways",
  "expel_mouths",
  "seek_candidates",
  "hire",
  "renew",
  "pay_fee",
  "withhold_fee",
  "borrow",
  "repay",
  "buy_news",
  "dismiss",
  "background_check",
  "place_spy",
  "recall_spy",
  "counter_intelligence",
  "close_roads",
  "open_roads",
  "claim_name",
  "revoke_passage",
  "grant_passage",
  "grant_basing",
  "repudiate",
  "assay",
  "authenticate",
  "forge",
  "captive_execute",
  "captive_ransom",
  "captive_turn",
  "captive_release",
  "captive_question",
  "captive_hand_over",
  "steal_tablet",
  "give_gift",
  "release_detained",
  "pay_ransom",
  "seize_hoard",
  "sell_tablet",
  "pay_carriers",
  "stop_paying_carriers",
  "captive_take_purse",
  "hunt_bands",
  "hunt_bands_always",
  "stop_hunting_bands",
  "grant_governorship",
  "grant_kingship",
  "take_back_governorship",
  "move_court",
  "enlist_band",
  "pay_off_band",
] as const;

// The shapes of a unit order and of any other order. Repeated in the schedule and in standing orders; the copy in standing
// orders leaves out the field descriptions, which are the same as above it, to keep the schema short.
const unitOrder = (described = true): ReplySchema =>
  object(
    ["unit", str(described ? "Province id where your unit stands (sally: your walled city whose walls sally)." : null)],
    ["order", enumOf(["hold", "move", "force_march", "support", "convoy", "disband", "settle", "fold", "besiege", "sally", "raze"])],
    [
      "target",
      str(
        described
          ? "move, force_march: destination. support: the province of the unit supported. convoy: province of the army. sally: the province the attack on the troops within your walls comes from. raze: what your army razes where it stands, in land another holds: roads, stations, harbour or water. fold: the province of your own troops of the same kind next to it that it joins. Otherwise empty (besiege: an army standing within walls you do not hold besieges that city)."
          : null,
      ),
    ],
    ["to", str(described ? "support of a move, or convoy: the destination. Support to hold: empty." : null)],
  );

const otherOrder = (described = true): ReplySchema =>
  object(
    ["action", enumOf(OtherActions)],
    [
      "province",
      str(described ? "For raise, raise_army_share, raise_fleet_share, cede_province, give_unit, build, build_corvee, build_corvee_share, census (your province), sell_grain, buy_grain, feed_town, feed_town_in_own_name, send_gold (the province of yours: its stores, market or coffer), caravan, trade, smuggle (where it sets out from), ship_trade, ship_deliver (your harbour where your fleet, in it or in its waters, loads), set_toll, ask_share, ask_amount (the province it applies in; ask_share: empty for all your land), take_up_province, refuse_province (a province that looks to you), letter_send, letter_sell, buy_letter (whose offer), welcome_loose, return_runaways, expel_mouths (your province), deport (the land you took that they leave), a province to spy on, or revoke_passage (one province; empty for all you granted that king), grant_passage (one province of yours; empty for all your land), grant_basing (one province of yours), hunt_bands (your province whose bands your armies fall on next season), hunt_bands_always (a province your standing hunt covers; empty for all your land), the governorships and enlist_band, pay_off_band (the province), move_court (where your court goes)." : null),
    ],
    ["to", str(described ? "For caravan: the province it carries the grain to. For trade, smuggle, ship_trade: the foreign market. For ship_deliver: the harbour it unloads at. For deport: your province they go to. Otherwise empty." : null)],
    ["power", str(described ? "For letter_send, letter_sell (its claimant or the land's king), cede_province, give_unit, close_roads, open_roads, revoke_passage (the king you granted it), grant_passage, grant_basing (the king you grant it), set_toll (the partner it applies to; empty for everyone), a court to spy on, captive_hand_over (the king you hand the captive to), or return_runaways (the king whose runaways you send back), or buy_news (the court whose news you buy)." : null)],
    ["person", str(described ? "Person id, for grant_governorship (one at your court), grant_kingship (your governor, or one at your court), hire, renew, pay_fee, withhold_fee, borrow, buy_news, dismiss, checks, spies, steal_tablet, captives, release, ransom, forge, give_gift, seize_hoard, sell_tablet (the buyer)." : null)],
    ["amount", int(described ? "grant_kingship: the price he pays you for it, in shekels (0 for none). letter_sell: the price you ask, in shekels. build, build_corvee, build_corvee_share: the level to keep (police: the men, in tens; 0 to keep none, letting what stands decay). The whole fee for the job (hire, renew), the price (sell_tablet), the men a levy takes (raise_army, raise_fleet; 0 for a full unit) or its share of the men of fighting age at home in percent (raise_army_share, raise_fleet_share), the gold to borrow, repay or send (borrow, repay, send_gold), spend, ransom or gift (captive_question: what the questioning costs; give_gift: the gold) in shekels, measures of grain (sell_grain, buy_grain, feed_town, feed_town_in_own_name, caravan, trade, smuggle, ship_trade, ship_deliver), or the toll's percent (set_toll), or the share of the harvest in percent (ask_share), or the measures of grain a season (ask_amount), or the people to deport (deport), or the share in % of the mouths still inside a besieged city to put out (expel_mouths), or for how many seasons (grant_passage, grant_basing; 0 for until you revoke it), as the action needs; else 0." : null)],
    ["gold", int(described ? "enlist_band, pay_off_band: the fee offered the band's chief, paid now. grant_kingship: the tribute a year he swears to send. trade, smuggle, ship_trade: the shekels it carries to buy grain with at that market; deport: 1 to let them carry their share of the purse; place_spy on a province: the shekels he carries to spend among its people, stirring them against its holder (0 for none); hire, renew: the part of the fee handed over now (0 means nothing now); borrow: the sum to repay, sealed on the debt tablet; else 0." : null)],
    [
      "term",
      int(
        described
          ? "letter_send, letter_sell, buy_letter: the turn its people wrote it, where there are more than one (0: the newest). enlist_band: the seasons its men serve you, 1-12. pay_off_band: the seasons it keeps out of your land, 1-12. grant_governorship: the levies he may raise on his own when foreign troops threaten his province, 0-3. hire, renew: the seasons by which the job's errand is to be done, 1-30 (0 means 6). Hire offers a job to someone not in your service, at your court or, through an envoy you send this season to where they stand (item: the envoy's id), elsewhere; renew offers one of your own at your court a new job; borrow: the seasons to repay in; else 0."
          : null,
      ),
    ],
    ["text", str(described ? "Forgery text, words for a released envoy, or what a turned spy should report." : null)],
    [
      "item",
      str(
        described
          ? "For build, build_corvee and build_corvee_share, what is built: walls, roads, stations (relay stations), harbour, police or water (water works); for repay, the debt (like d3), as your treasury gives it; for assay, your mark for the gold (like g7), as your treasury gives it; for authenticate or repudiate (a tablet your envoy sealed in your name), your mark for your copy of the tablet (like k8), as your archive gives it; for claim_name, the realm's name you claim (your own land's to return to it)."
          : null,
      ),
    ],
    ["seals", array(str(), described ? "Powers whose seals a forgery bears." : null)],
    ["share", int(described ? "build_corvee_share: the share of the men of fighting age at home called up for the work, in percent (the work goes as fast as the men who come). Otherwise 0." : null)],
    ["lands", array(str(), described ? "grant_kingship: the provinces of yours, beside one another, he is made king of (a governor's own, his seat among them). Otherwise empty." : null)],
    [
      "errand",
      enumOf(["", "envoy", "spy", "stay", "ride"], described ? "hire, renew: the job's errand: envoy (to the court named in power), spy (on the court in power, or the province in province), stay (at your own court until the term ends: power is your own), or ride (to the far province of yours in province, bringing its report home this season). Else empty." : null),
    ],
    [
      "standing",
      enumOf(
        ["", "pay_on_done", "offer_again", "both"],
        described ? "hire, renew: your standing orders with the job: pay the rest when it is done, offer the same job again when it is done, or both; empty for neither (the rest is then paid only by pay_fee)." : null,
      ),
    ],
  );

/**
 * The conditions of a scheduled entry, a standing order or a standing answer, in the engine's own vocabulary ("Scheduled,
 * conditional orders"): read when they would run, from what the king knows then.
 */
const conditions = (what: string): z.ZodType =>
  array(
    object(
      ["test", enumOf(["if", "unless"])],
      ["kind", enumOf(["troops_in", "treasury_less_than", "treasury_at_least", "envoy_back", "tablet_sealed", "stores_at_least"])],
      ["power", str("troops_in: whose troops, or empty for any foreign power's. tablet_sealed: the court that sealed it with you, or empty for any. Otherwise empty.")],
      ["province", str("troops_in, stores_at_least: the province. Otherwise empty.")],
      ["amount", int("treasury_less_than, treasury_at_least: shekels. stores_at_least: measures of grain. Otherwise 0.")],
      ["person", str("envoy_back: the id of one of your people (like c3), back at your court and ready. Otherwise empty.")],
    ),
    `${what} only if every "if" holds and no "unless" does, as you know things then (see CONDITIONS). At most ${MaxConditions}; empty for none.`,
  );

/**
 * A king's standing answers ("Standing answers" under "Minds follow what is at stake"): its own answers given in advance
 * for the envoys that arrive at its court, in the engine's vocabulary; and the ids of those it cancels.
 */
export const standingAnswers = (): [string, z.ZodType][] => [
  [
    "standing_answers",
    array(
      object(
        ["from", str("Whose envoys it answers: a court, or empty for any court's.")],
        ["brings", enumOf(["anything", "words", "gold", "tablet"])],
        ["min_gold", int("gold: the least his inventory must state, in shekels. Otherwise 0.")],
        ["seal", bool("tablet or anything: set your seal on the tablet he brings. Otherwise false.")],
        ["gold_back_percent", int("The share of the gold he brings to send back with him for his lord, 0-100 (100: a gift of like value). 0 for none.")],
        ["say", str(`The gist of what you say to him, in your own words, at most ${MaxAnswerSay} characters; your scribes word it.`)],
        ["conditions", conditions("It answers")],
      ),
      `New standing answers (at most ${MaxAnswers} in all), kept until you cancel them: the engine answers for you, in one exchange and for nothing, an envoy one covers, and he wakes nobody (see STANDING ANSWERS). Empty for none.`,
    ),
  ],
  ["cancel_answers", array(str(), 'Ids of your standing answers to cancel (like a2), or "all".')],
];

/**
 * A king's orders. Every king may give and cancel standing orders. With sleeping seats on, it sleeps after them until
 * something concerns it: it never chooses when it wakes, so it also schedules orders for later seasons.
 */
export function leaderOrders(c: GameConfig | null = null): ReplySchema {
  const props = leaderOrdersBase(c);
  const sleeps = c !== null && c.sleepingSeats;
  if (sleeps) {
    props.push([
      "schedule",
      array(
        object(
          ["turn", int("The season (turn number) these orders run in: any later season, or this one (an entry for this season counts as orders given now).")],
          [
            "units",
            array(
              unitOrder(),
              "Name each of your units by the province it stands in now: the order follows that unit, and is given from wherever it then stands. A unit a levy is to raise (one you order now or schedule for an earlier season): the province of the levy.",
            ),
          ],
          ["other_orders", array(otherOrder())],
          ["conditions", conditions("They run")],
        ),
        `Orders for later seasons (or this one). Secret, and checked when they run, after the orders you give that season. The entries you give for a season together replace everything you scheduled for it, each with its own conditions; an entry with no orders cancels it. At most ${MaxScheduledPerSeason} orders a season, for at most ${MaxScheduledSeasons} seasons. A scheduled order wakes you only if others foil it, never if it is refused or fails by your own orders; a scheduled move that is stopped is tried once more (see the rulebook).`,
      ),
    ]);
  }
  props.push([
    "standing_orders",
    array(
      object(
        ["when", enumOf(["unit_enters", "unit_attacked"])],
        ["province", str("unit_enters: the province the troops move into. unit_attacked: where your unit stands now.")],
        ["power", str("unit_enters: whose troops, or empty for any foreign power's. Otherwise empty.")],
        [
          "units",
          array(
            unitOrder(false),
            "As in units, each of your units named by the province it stands in now: the order follows that unit, and is given from wherever it then stands.",
          ),
        ],
        ["other_orders", array(otherOrder(false), "As in other_orders.")],
        ["conditions", conditions("When its move comes, it fires")],
      ),
      `New standing orders, kept until they fire or you cancel them (at most ${MaxStanding} in all, each with at most ${MaxScheduledPerSeason} orders). When you see the move it waits for, its orders run in that same season, once, so they meet the move: they replace your other orders for the same units or people that season, those you give then among them${sleeps ? " and your scheduled ones" : ""} (cancel it to stop it). It first fires in the season after you give it.` +
        (sleeps ? " Firing does not wake you; an order of it that others foil does." : "") +
        " Giving one costs nothing; its orders cost what they cost when they run.",
    ),
  ]);
  props.push(["cancel_standing", array(str(), 'Ids of your standing orders to cancel (like s3), or "all". Cancelled now, one does not fire this season.')]);
  props.push(...standingAnswers());
  return object(...props);
}

const leaderOrdersBase = (c: GameConfig | null): [string, z.ZodType][] => [
  [
    "notes",
    str(
      `Private notes to yourself, at most ${thousands(LeaderJournal.NotesMax)} characters (longer notes are cut): plans, promises made, suspicions. They are shown in full the next time you give orders, by their opening words the ${LeaderJournal.SeasonsShown - 1} times after, then leave your record: put what matters most first.`,
    ),
  ],
  [
    "summary",
    str(
      `Your own summary of the seasons before those shown in full: plans, promises, what you have learned. At most ${thousands(LeaderJournal.SummaryMax)} characters. It replaces your previous summary; leave it empty to keep it.`,
    ),
  ],
  ["ledger", ledger()],
  ["units", array(unitOrder())],
  ["command", array(commandOrder(), "Command of your troops (see COMMAND AT A DISTANCE): grant a person at your court the command of a unit, take it back, or give a unit a mandate or clear it. Empty for none.")],
  ["letters", array(letter(c))],
  ["other_orders", array(otherOrder())],
];

/** One order of command (item 13): a grant, a recall, or a mandate in the fixed vocabulary. */
const commandOrder = (): ReplySchema =>
  object(
    ["unit", str("Province id where your unit is, as YOUR TROOPS shows it (by its last report if far off).")],
    ["action", enumOf(["grant", "take_back", "mandate", "clear_mandate", "buy_food", "take_food", "hold_pay", "give_pay", "hold_food", "give_food"])],
    ["person", str("grant: the id of the person at your court you grant the command (like c3). Otherwise empty.")],
    ["task", enumOf(["", ...MandateTaskValues], "mandate: hold where it stands; guard the target and the land around it; invade, besiege or raid into the target; support or shadow the power's troops. Otherwise empty.")],
    ["target", str("mandate: the province its task names (guard: empty for where it stands). Otherwise empty.")],
    ["power", str("mandate: the power whose troops it supports or shadows. Otherwise empty.")],
    ["engage", enumOf(["", ...EngageValues], "mandate: attack foreign troops within reach, engage only with the advantage, or avoid battle.")],
    ["avoid", str("mandate: a power it must never fight, or empty.")],
    ["withdraw", enumOf(["", ...WithdrawValues], "mandate: fall back to your land if outnumbered, or hold at all costs (never).")],
    ["until", int("mandate: the last season (turn) it holds, or 0 until new orders.")],
    ["gold", int("buy_food: the shekels sent with the word for the army's food, out of your treasury now (0 to send none). Otherwise 0.")],
  );

/** One clause of a letter, a tablet or an answer (item 8): its kind, and the fields its kind uses (see CLAUSES in the rules). */
const clauseObject = (): ReplySchema =>
  object(
    ["kind", enumOf(ClauseKindValues as unknown as [string, ...string[]], "The clause's kind, as CLAUSES in the rules lists them.")],
    ["king", enumOf(["", ...AllPowers] as [string, ...string[]], "The king the clause names (against whom, whose troops, who besieges, who is in league with the Habiru), or empty.")],
    ["province", str("The province it names (given, asked for, attacked, besieged, told of), or the start of a move; empty if none.")],
    ["into", str("The end of a move (support, askSupport), or empty.")],
    ["season", int("The turn a move is to be made, a turn to come (support, askSupport), or 0.")],
    ["gold", int("Shekels of gold (gift, tribute, askGold, askTribute, counter), or for newsStrength 0 (few) or 1 (many); otherwise 0.")],
    ["answers", enumOf(["", ...ClauseKindValues] as [string, ...string[]], "For accept, refuse or counter: the kind of clause it answers; otherwise empty.")],
  );

export const clauses = (description: string): z.ZodType => array(clauseObject(), description);

/** What a host's answer in clauses is, in either press. */
export const AnswerClauses = (structured: boolean): string =>
  structured
    ? "Your answer, set out in clauses (CLAUSES in the rules): accept, refuse or counter what the letter proposes or asks, and anything else you would say. In this game it is all you say."
    : "Your answer's formulas as clauses (CLAUSES in the rules): accept, refuse or counter what the letter proposes or asks. Kings who read only clauses read these.";
export const GiftNews = "Only with a gift: news the envoy is to tell his lord as what he saw for himself (newsTroops, newsStrength, newsTaken, newsSiege), or empty.";

/** One letter: an envoy sent abroad. The same in an orders reply and in an audience held while the king's orders stand. */
export const letter = (c: GameConfig | null): ReplySchema => {
  const structured = c?.pressMode === "structured";
  const sharedVictory = c?.sharedVictory ?? false;
  return object(
    ["envoy", str("Id of one of your people who is at court and ready.")],
    ["to", enumOf(powerNames)],
    ...(structured ? [] : ([["message", str("What the envoy should say, in your words. Empty: the envoy speaks your clauses alone.")]] as [string, z.ZodType][])),
    [
      "clauses",
      clauses(
        structured
          ? "The letter, set out in clauses from the templates (CLAUSES in the rules): in this game kings write only these, and the envoy recites them."
          : "The letter's formulas as clauses (CLAUSES in the rules), carried with your words: kings who read only clauses read these. Where your words and clauses differ, each reader goes by what he reads.",
      ),
    ],
    ["mandate", str("What the envoy may agree to on your behalf, in your words: it guides his tone.")],
    [
      "carry_seal",
      bool("Give the envoy your seal: he may then seal, in your name, a tablet the king he visits offers him, and the engine marks it within or beyond the limits below. False: nothing he agrees binds you."),
    ],
    ["seal_max_gold", int("With the seal: the most gold he may give or promise in a tablet he seals, or 0.")],
    ["seal_may_cede", array(str(), "With the seal: ids of your provinces he may give away; empty for none.")],
    ["seal_may_open", array(str(), "With the seal: ids of your provinces he may open to the other king's troops, by passage or basing; empty for none.")],
    [
      "show_credentials",
      bool("Let him show his credentials: the king he visits reads this mandate and these limits, which builds trust, but you lose the excuse that he went beyond them. False keeps them hidden."),
    ],
    ["gold", int("Shekels sent with the envoy, or 0.")],
    ["no_inventory", bool("Only with gold: send it without an inventory tablet, saving the scribe's fee. Nobody can then check what arrived. False otherwise.")],
    ["check_claim", str("The id of a person at your court who says they serve the king you write to (like c31): your envoy asks there whether they do. Empty otherwise.")],
    ["collect", str("A debt tablet in your archive (like d3, as DEBT TABLETS YOU HOLD gives it) your envoy carries to present to its borrower where it goes, bringing home what is repaid. Empty otherwise.")],
    ["purity", int("Purity of the gold in percent, 10-100 (100 when you send none). Below 100 is debased.")],
    // The sealed greeting is written from these flags alone: say what each one claims or withholds.
    [
      "call_brother",
      bool("Greet the recipient as your brother, as Great Kings greet their equals, and wish well to his household and country. False withholds it: a slight."),
    ],
    ["call_them_great_king", bool("Give the recipient the title Great King. False denies him that rank.")],
    [
      "claim_great_king",
      bool("Name yourself Great King in the greeting. False names you only as king of your land, which the recipient reads as not claiming the rank."),
    ],
    ["your_name_first", bool("Put your own name before the recipient's: presumptuous, and the recipient will notice. False keeps the custom, his name first.")],
    [
      "by_house",
      bool("Call the recipient by his house (Bit- and his founder's name), not the realm's name he claims, where another king claims it too: you give the name to the other. False gives it to him."),
    ],
    ["omit_greeting", bool("Send no greeting at all, which is a slight. The other greeting flags are then ignored.")],
    ...(structured ? [] : ([["tablet_to_seal", str("Text for both kings to seal, or empty.")]] as [string, z.ZodType][])),
    [
      "tablet_clauses",
      clauses(
        structured
          ? "A tablet for both kings to seal, set out in clauses; empty for none."
          : "The clauses of the tablet to seal, carried with its text (or alone, written out in their words); empty for none.",
      ),
    ],
    [
      "sworn_alliance",
      bool(
        sharedVictory
          ? "Only with a tablet to seal (false without one): mark the tablet as a sworn alliance (counts for a shared victory)."
          : "Only with a tablet to seal (false without one): mark the tablet as a sworn alliance, an oath of alliance before the gods that every reader of the tablet sees. It changes no rule and binds nobody.",
      ),
    ],
    [
      "vassal_treaty",
      str(
        "Only with a tablet to seal: to mark it as a vassal treaty, the power it names the vassal, yours (you serve the recipient) or the recipient's (he serves you); empty for any other tablet. The mark changes no rule and binds nobody: tribute is gold sent, service is what one does (VASSALS).",
      ),
    ],
    ["show_tablet_copies", array(str(), "Your marks for the copies of tablets you hold (like k8), as your archive gives them, to show as evidence.")],
  );
};

/** The king's ledger of dealings, written the same way in an orders reply and in an audience reply. */
export const ledger = () =>
  array(
    object(["court", enumOf(powerNames)], ["entry", str(`At most ${thousands(LeaderJournal.LedgerEntryMax)} characters; empty removes that court's line.`)]),
    "Your ledger of dealings, in your own words, per court: what was promised, sealed, broken and paid. An entry replaces that court's line, an empty entry removes it, and courts you leave out keep their lines. It is shown in full whenever you give orders or hold an audience, and you may write it in either reply.",
  );

/**
 * What a host is asked at one exchange of an audience, by the builder rule "Requests are rules too": whether to seal only
 * while a tablet the envoy brought waits to be sealed, a gift only until the envoy has accepted one, whether to end the
 * audience only before its last exchange, and whether to reopen its orders only while its orders stand and it has not
 * already chosen to.
 */
