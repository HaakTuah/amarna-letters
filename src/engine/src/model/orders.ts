/**
 * Every state change a seat can ask for. Units are named by the province they stand in, as in Diplomacy
 * ("A memphis -> sinai"). Text never changes state: only these orders do, and only after the OrderValidator accepts them.
 * Each order is a plain object whose `type` names its kind. Their makers are in `order-makers.ts`, what they say in
 * `order-reading.ts`, their JSON in `order-schema.ts`, and a season's submission of them in `submission.ts`.
 */
import type { UnitKind } from "./map.ts";
import type { WorkKind } from "./works.ts";
import type { Power } from "./power.ts";
import type { Clause } from "./clauses.ts";
import type { GreetingOptions, TabletProposal } from "./records.ts";
import type { Authority, GrantKind } from "./authority.ts";
import type { JobWhat } from "./people.ts";
import type { Mandate } from "./command.ts";
import type { LetterFate } from "./held-letters.ts";

export interface HoldOrder {
  type: "hold";
  unit: string;
}
export interface MoveOrder {
  type: "move";
  unit: string;
  to: string;
  /** A forced march (item 13): a third quicker, and some of the men drop along the way. */
  forced?: boolean;
}
/** Support a unit standing in `supported`: to hold if `to` is null, else its move to `to`. */
export interface SupportOrder {
  type: "support";
  unit: string;
  supported: string;
  to?: string | null;
}
export interface ConvoyOrder {
  type: "convoy";
  unit: string;
  army: string;
  to: string;
}
/**
 * An army standing in a walled city it does not hold lays siege to it (Build order item 5): it holds there, and the city
 * is worn down a step each season it holds, two with an uncut support, until it surrenders. One order is enough: the
 * siege goes on each season the army holds there, until it leaves or is destroyed.
 */
export interface BesiegeOrder {
  type: "besiege";
  unit: string;
}
/**
 * What a king keeps and builds in a province of his (item 15, "One rule for everything built"): the level of one kind
 * (walls, roads, relay stations, a harbour, policing or water works) to keep there, paid in gold or by corvée
 * (`labour`). Above the level standing it starts a project that raises it a level at a time over the seasons; below it,
 * the levels above go unkept and decay. It stands until changed. In a besieged city an order for its walls repairs them,
 * with the men and food inside ("Walls price the storm, not the clock").
 */
export interface BuildOrder {
  type: "build";
  province: string;
  kind: WorkKind;
  level: number;
  labour: boolean;
  /** Item 17++: by corvée, a share in a hundred of the men of fighting age at home rather than the men the work needs. */
  share?: number | null;
}
/**
 * An army of the seat's standing in land another holds razes a level of what stands there: its roads, relay stations,
 * harbour or water works (item 15: "an occupying army can raze what stands"; roads and stations "can be captured or cut").
 */
export interface RazeOrder {
  type: "raze";
  unit: string;
  kind: WorkKind;
}
/**
 * The walls of a city of the seat's, with foreign troops within them, sally: they support one attack on those troops, the
 * move from `from` into the city, whoever makes it, for +1, a support that cannot be cut (Build order item 5; question 5,
 * plan step 8). Only walls of GameConfig.sallyMinWalls or more can sally.
 */
export interface SallyOrder {
  type: "sally";
  city: string;
  from: string;
}
/**
 * Sell grain from a province's stores at its own market (build order item 9+a, "Markets"): the market pays from its
 * people's purse, a little under its price, the lot priced along the curve, and buys no more than its purse can pay for.
 */
export interface SellOrder {
  type: "sell";
  province: string;
  amount: number;
}
/** Buy grain at a province's market into its stores, paid from the treasury a little over the market's price (item 9+a). */
export interface PurchaseOrder {
  type: "purchase";
  province: string;
  amount: number;
}
/** Hand grain from a province's stores to its town for nothing, into its market (item 9+a, "Kings can feed their towns"). */
export interface FeedOrder {
  type: "feed";
  province: string;
  amount: number;
  /**
   * Item 17++ ("Credit goes to the hand they see"): handed out in the king's own name, proclaimed by the courier who brings
   * the order, so its people credit him and not his governor there.
   */
  own?: boolean;
}
/**
 * Send gold with the realm's couriers to the coffer of a far province of the king's ("One treasury, many stores", #587):
 * it leaves the treasury now and pays for what is done there once it arrives, so its works, levies and troops need no
 * credit.
 */
export interface SendOrder {
  type: "send";
  province: string;
  gold: number;
}
/**
 * Send a caravan with grain from a province's stores to another province through the king's own land (item 9+a,
 * "Caravans carry a kingdom's goods"): it fills the baggage of his troops standing there and puts the rest in its stores.
 */
export interface CaravanOrder {
  type: "caravan";
  from: string;
  to: string;
  amount: number;
}
/**
 * Send a trading caravan (item 9+b, "Caravans carry a kingdom's goods"): grain from a province's stores and gold from the
 * treasury, through land open to it, to a foreign market, where it sells its grain and buys grain with its gold, and
 * home again with what it got. Smuggling (`sneak`): off the road and round the toll posts, through closed land too,
 * paying no tolls but at the risk of being found and losing its goods ("Tolls and smuggling").
 */
export interface TradeOrder {
  type: "trade";
  from: string;
  to: string;
  grain: number;
  gold: number;
  sneak: boolean;
}
/**
 * Put a fleet into cargo service (item 9+b, "Ships carry goods"): it loads grain from the stores of a harbour of its
 * king's on its waters and gold from the treasury, sails to another harbour, trades at its market (`trade`) or hands its
 * grain to its king's troops and stores there, and sails home, out of the war until it is back.
 */
export interface ShipOrder {
  type: "ship";
  fleet: string;
  from: string;
  to: string;
  grain: number;
  gold: number;
  trade: boolean;
}
/**
 * Set a toll on goods entering one's land (item 9+b, "Tolls and smuggling"): a percent of what crosses, in one province
 * or all one's land (`province` null), for one partner or everyone (`partner` null). It stands until changed.
 */
export interface TollOrder {
  type: "toll";
  province: string | null;
  partner: Power | null;
  percent: number;
}
/**
 * Say how much grain a province of one's own gives, or all one's land (`province` null) (item 17++, "The king says how
 * much he wants", replacing item 10+a's tax rate): as a `share` of its harvest, in percent, which never squeezes it but
 * lets it hide more the older the king's count and the farther it lies; or as an `amount`, in measures a season, which he
 * gets as far as its granaries hold, falling on the people really there. It stands until changed.
 */
export interface DemandOrder {
  type: "demand";
  province: string | null;
  how: "share" | "amount";
  n: number;
}
/**
 * Item 17++ ("taken up, never thrust on anyone"): a king's answer to a province that declared for him, or that was ceded to
 * him by treaty: take it up (`take`), a letter accepting it, or refuse it. The word travels to the province.
 */
export interface AnswerOrder {
  type: "answer";
  province: string;
  take: boolean;
}
/** Send scribes to count a province of one's own (item 17++, "A census"): paid now, their count travels home dated. */
export interface CensusOrder {
  type: "census";
  province: string;
}
/**
 * People across borders and in kings' hands (item 10+b, "Where people go"). `welcome`: settle the loose men standing in a
 * province of one's own, as far as it has room. `deport`: move settled people from a province one has taken (not one's
 * homeland) to one of one's own; they walk there, and carry their share of the purse only if `purse`. `expel`: put out of
 * a besieged city of one's own the mouths that cannot fight. `returnRunaways`: send back to `to` the runaways from its land
 * standing loose in a province of one's own ("Fugitive clauses": deportation in reverse).
 */
export interface WelcomeOrder {
  type: "welcome";
  province: string;
}
export interface DeportOrder {
  type: "deport";
  province: string;
  to: string;
  number: number;
  purse: boolean;
}
export interface ExpelOrder {
  type: "expel";
  province: string;
  /** Item 11a+: the share of the town's mouths put out, in percent (1 to `LandData.expelMost`), the king's choice. */
  percent: number;
}
export interface ReturnRunawaysOrder {
  type: "returnRunaways";
  province: string;
  to: Power;
}
export interface RaiseOrder {
  type: "raise";
  province: string;
  kind: UnitKind;
  /** The owner's answers to item 11a+: how many men the levy takes, up to every man of fighting age there; none: a unit's full size. */
  men?: number | null;
  /**
   * Item 17++ ("The king says how much he wants"): the levy asked as a share of the men of fighting age at home, in
   * percent, instead of a number: it never takes more than are there, but the province hides part of it as its count ages
   * and the farther it lies. None: `men` as asked.
   */
  share?: number | null;
}
export interface DisbandOrder {
  type: "disband";
  unit: string;
  /** Its men settle where it stands, in a province of one's own, as colonists, instead of walking home (item 10+a). */
  settle?: boolean | null;
}
/**
 * Item 17++ ("A handful holds nothing by itself"): the troops in `unit` march to those of the same kind in `into`, next to
 * them, and join them, their men, food and savings with them, the season's march taking the season.
 */
export interface FoldOrder {
  type: "fold";
  unit: string;
  into: string;
}
export interface CedeProvinceOrder {
  type: "cede";
  province: string;
  to: Power;
}
export interface GiftUnitOrder {
  type: "giftUnit";
  unit: string;
  to: Power;
}
/** Send an envoy abroad with a spoken message, a mandate, gold and tablets. */
export interface DispatchOrder {
  type: "dispatch";
  envoy: string;
  to: Power;
  letter: string;
  mandate: string;
  greeting?: GreetingOptions | null;
  gold: number;
  purityPercent: number;
  proposal?: TabletProposal | null;
  copies?: string[] | null;
  /** The letter's clauses (item 8): beside the words in full press, the whole letter in structured press. */
  clauses?: Clause[] | null;
  /** Gold sent without an inventory tablet (item 8): saves the scribe's fee, and nobody can check what arrived. */
  noInventory?: boolean | null;
  /** The envoy's authority (item 9): the seal, the limits the engine checks, and whether it shows them. None: no seal. */
  authority?: Authority | null;
  /**
   * Item 10, "check a claim": a person at your court who says they serve the king the envoy goes to. The envoy asks there,
   * and brings home whether they do.
   */
  checkClaim?: string | null;
  /**
   * The owner's answers to item 11a: a debt tablet in your archive the envoy carries to the court it goes to, to present to
   * the borrower there; what is repaid to it, and the tablet if not repaid in full, it brings home.
   */
  collect?: string | null;
}
/** Let a detained envoy (or captive) go home, optionally with a spoken reply. */
export interface ReleaseOrder {
  type: "release";
  character: string;
  reply: string;
}
export interface SeekCandidatesOrder {
  type: "seekCandidates";
}
/**
 * Item 11a, "Jobs, not wages", as the owner's answers rework it: offer a person a job, which is one errand: `what` ("envoy" to
 * the court `where`, or "spy" on the court or province `where`), done by `term` seasons from now, for a whole `fee`, of
 * which `advance` is handed over now and the rest falls due when the job is done. `payOnDone`: your standing order to pay
 * the rest then; otherwise you pay it by order pay_fee, or not. `offerAgain`: when it is done, the same job is offered again,
 * which the man may take or not. A person at your court is offered it there; one elsewhere only through `via`, one of
 * your envoys you send this season to the court where the person stands, carrying the offer and the advance.
 */
export interface HireOrder {
  type: "hire";
  character: string;
  fee: number;
  advance: number;
  term: number;
  what?: JobWhat | null;
  where?: string | null;
  payOnDone?: boolean | null;
  offerAgain?: boolean | null;
  via?: string | null;
  /** #806: with a spy's job at a court that holds a king captive, that king (his id), whom the job is to free. */
  frees?: string | null;
}
/**
 * A new job offered to one of your own people at your court (a new errand, fee and term), the advance handed over now, if
 * the man takes it. Not a task: the servant may be renewed and sent on the new job's errand in the same season.
 */
export interface RenewOrder {
  type: "renew";
  character: string;
  fee: number;
  advance: number;
  term: number;
  what?: JobWhat | null;
  where?: string | null;
  payOnDone?: boolean | null;
  offerAgain?: boolean | null;
  /** #806: as for a hire, the king held at that court whom the job is to free. */
  frees?: string | null;
}
/** The owner's answers to item 11a: seize the hoard a living person keeps in your capital, with the tablets kept in it. */
export interface SeizeHoardOrder {
  type: "seize";
  character: string;
}
/** The owner's answers to item 11a: sell a debt tablet in your archive to a person at your court, for `price` from its purse. */
export interface SellDebtOrder {
  type: "sellDebt";
  debt: string;
  character: string;
  price: number;
}
/**
 * The owner's answers to item 11a: your standing order, until changed, to pay on delivery the fee of whoever carries your
 * people's letters home (or not).
 */
export interface PayCarriersOrder {
  type: "payCarriers";
  pay: boolean;
}
/**
 * Item 17+: your standing order to pay and feed your troops, which every king starts with ("Nothing happens unless someone
 * orders it"). With no province it sets the order for all your troops; with one, it holds back pay or food from the units
 * of yours standing there (or gives it again), the rest unchanged. Unpaid soldiers desert in time, and hungry ones eat what
 * they carry and then take from the land.
 */
export interface UpkeepOrder {
  type: "upkeep";
  /** Pay the troops (true) or hold their pay back (false); null leaves pay as it stands. */
  pay: boolean | null;
  /** Feed them likewise; null leaves their food as it stands. */
  feed: boolean | null;
  province?: string;
}
/**
 * The owner's answers to item 11b: your armies standing in `province` of your land fall on the bands there at the start of
 * next season (a king's army falls on a band only on his order).
 */
/**
 * Item 13 ("Generals lead armies", "Privileges"): grant command of the unit standing in `unit` to `character`, a person at
 * the king's court, his own servant or free. A grant of authority, not a job: no fee; what the commander gains is the
 * spoils, the men and his name. He travels to the army and commands it from the season he reaches it.
 */
export interface CommandOrder {
  type: "command";
  unit: string;
  character: string;
}
/** Item 13: take back the command of the unit in `unit` by sending word; he steps down when it reaches him, or refuses. */
export interface RelieveOrder {
  type: "relieve";
  unit: string;
}
/**
 * Item 13 ("Army mandates"): give the unit in `unit` a mandate, which reaches it with the realm's couriers and holds until
 * changed; a null mandate clears it. Its commander carries it out when no order of the king's reaches the army.
 */
/**
 * Item 17 ("Armies need food as well as pay"): how the unit in `unit` is to get its food where it stands by leave, at home
 * or in a friend's land: `buy` it at the market's price with the gold it carries, or take it from the land. `gold` shekels
 * go with the word for its food, out of the treasury now. The word and the gold travel with the realm's couriers and hold
 * from the season they arrive. Without the gold to buy, the army takes what it must; its commander decides in the end.
 */
export interface SupplyOrder {
  type: "supply";
  unit: string;
  buy: boolean;
  gold: number;
  /** Where the king named the army, as his last report had it, kept when his couriers name it where it truly stands. */
  named?: string | null;
}
export interface MandateOrder {
  type: "mandate";
  unit: string;
  mandate: Mandate | null;
}
/**
 * Item 13 ("Governors"): grant `character`, a person at the king's court, the governorship of `province`, a province of the
 * king's, under a mandate: he may raise up to `levies` levies there on his own when foreign troops stand in or next to it
 * (0: none), collects its yield, and reports what he sees. A privilege, not a job: no fee. He travels there and governs
 * from the season he arrives.
 */
export interface GovernOrder {
  type: "govern";
  province: string;
  character: string;
  levies: number;
}
/**
 * Item 17++ ("Governors"): grant `character`, a governor or a character of the seat's, the kingship of `provinces` of the
 * seat's under oath, as its vassal, for `tribute` shekels a year and a `price` he pays for it: the word reaches him at his
 * seat; he takes it or not by his stakes; if he does, the land is his, bound by a vassal tablet.
 */
export interface CrownOrder {
  type: "crown";
  character: string;
  provinces: string[];
  tribute: number;
  price: number;
}
/** Item 13: take back the governorship of `province` by sending word; he steps down when it reaches him, or refuses. */
export interface UnseatOrder {
  type: "unseat";
  province: string;
}
/**
 * Item 13 (hiring bands as soldiers, "Bands are a character's soldiers", "Anyone can hire anyone"): offer the chief of the
 * band in `province`, where an army of the king's stands with it under its commander or the king himself (who carries the
 * offer), `fee` shekels, paid now, for his band to serve as the king's army for `term` seasons, the chief commanding it.
 * The chief takes it or not; when the term ends his men are his band again.
 */
export interface EnlistOrder {
  type: "enlist";
  province: string;
  fee: number;
  term: number;
}
/**
 * Item 17++++a ("Raiders from beyond the map": paid off): offer the chief of the band in `province`, carried as an
 * enlistment is, `fee` shekels, paid now, to take his band out of the king's land and keep out of it for `term`
 * seasons; a band based beyond the map goes home. The chief takes it or not, and keeps his word or not, by his own lights.
 */
export interface PayOffOrder {
  type: "payOff";
  province: string;
  fee: number;
  term: number;
}
/**
 * Item 13 ("The capital is wherever the king is"): the court sets out for `to`, a province of his own or any he may reach,
 * with the king if he is with it; it costs gold and takes the road's time. Item 17b, part C: `alone`, the king sets out
 * without his court, with his guard, and commands from wherever he is; to where his court is, he goes back to it.
 */
export interface CourtOrder {
  type: "court";
  to: string;
  alone?: boolean;
}
export interface HuntOrder {
  type: "hunt";
  province: string;
}
/**
 * Your standing order, until changed, that any army of yours standing where a band works falls on it: in the provinces
 * named, or, naming none, anywhere in your land (the owner's answers to item 11b+). A new one replaces the old.
 */
export interface HuntBandsOrder {
  type: "huntBands";
  on: boolean;
  provinces?: string[] | null;
}
/**
 * Item 11a: the rest of a servant's fee. `pay` true pays what you let fall due unpaid, if the person stands at your court;
 * false withholds the rest of its present job when it falls due (a promise broken, which others hear of).
 */
export interface PayFeeOrder {
  type: "payFee";
  character: string;
  pay: boolean;
}
/**
 * Item 11a, "Lending to kings": borrow `amount` from a person at your court who offers to lend, sealing a debt tablet for
 * `repay`, to be repaid in `seasons`.
 */
export interface BorrowOrder {
  type: "borrow";
  character: string;
  amount: number;
  repay: number;
  seasons: number;
}
/** Item 11a: repay a debt to whoever holds its tablet, if they stand at your court; repaid in full, the tablet is yours. */
export interface RepayOrder {
  type: "repay";
  debt: string;
  amount: number;
}
/** Item 11b, "Characters as sellers of news": buy the news a person at your court offers of another court, at its price. */
export interface BuyNewsOrder {
  type: "buyNews";
  character: string;
  court: Power;
}
export interface DismissOrder {
  type: "dismiss";
  character: string;
}
export interface BackgroundCheckOrder {
  type: "check";
  character: string;
  spend: number;
}
/** Place a spy at a foreign court, or in a province. */
export interface PlaceSpyOrder {
  type: "spy";
  character: string;
  court?: Power | null;
  province?: string | null;
  /**
   * Item 17 ("outside help"): gold he carries to spend among the province's people, stirring them against its holder, a
   * share each season he watches there. Deniable like any bribe; he may keep some of it.
   */
  stir?: number | null;
}
export interface RecallSpyOrder {
  type: "recall";
  character: string;
}
/** Item 10: have your spy posted at a court steal a tablet from its archive, so that its court loses it. */
export interface StealOrder {
  type: "steal";
  character: string;
}
/** Item 10: a gift of gold from your treasury to a person at your court (a false envoy's motive: the host's return gifts). */
export interface GiftOrder {
  type: "gift";
  character: string;
  gold: number;
}
export interface CounterIntelOrder {
  type: "counterIntel";
  spend: number;
}
/** Close or open one's roads to a court's travellers (build order item 7b, "Passage and access"); it stands until changed. */
export interface RoadsOrder {
  type: "roads";
  court: Power;
  close: boolean;
}
/**
 * Item 17+ ("A power's name is a claim"): the king claims a realm's name or title, any the map knows or a power claims,
 * Pharaoh's included; his own land's name returns him to it. It gives nothing by rule: each court decides whom it gives a
 * contested name to, in the greetings it sends.
 */
export interface ClaimNameOrder {
  type: "claimName";
  name: string;
}
/**
 * End the passage and basing this king granted another on sealed tablets (item 9), in one province or, with none named,
 * all of them. Its troops still standing in the land after it ends take it, as any troop does.
 */
export interface RevokeOrder {
  type: "revoke";
  grantee: Power;
  province: string | null;
}
/**
 * Item 11a+: grant another king passage through land of one's own (one province, or all of it with none named) or basing
 * in one province, by order rather than on a tablet: it stands from this season, for `seasons` seasons or until revoked
 * (null), and the news reaches his court as fast as a messenger rides between the capitals.
 */
export interface GrantOrder {
  type: "grant";
  grantee: Power;
  kind: GrantKind;
  province: string | null;
  seasons: number | null;
}
/**
 * Repudiate a tablet one's envoy sealed in one's name (item 9), as beyond his authority: the rights it granted end, both
 * ways, and its partner is told. Named by the copy in one's archive, as an examination names it.
 */
export interface RepudiateOrder {
  type: "repudiate";
  copy: string;
}
export interface AssayOrder {
  type: "assay";
  lot: string;
}
export interface AuthenticateOrder {
  type: "authenticate";
  copy: string;
  spend: number;
}
export interface ForgeOrder {
  type: "forge";
  character: string;
  text: string;
  seals: Power[];
  /** In structured press the forgery is set out in clauses too (item 8), its text their words. */
  clauses?: Clause[] | null;
}

/**
 * #806: "StopLetters" keeps a captive king's letters at the captor's court (read there, sent nowhere), those to the court
 * `to` or, with none, all of them; "PassLetters" lets them go again, which they do until stopped.
 */
export const CaptiveFateValues = ["Execute", "Ransom", "Turn", "Release", "Question", "HandOver", "TakePurse", "StopLetters", "PassLetters"] as const;
export type CaptiveFate = (typeof CaptiveFateValues)[number];

/** Decide the fate of a caught spy held at this court. */
export interface CaptiveOrder {
  type: "captive";
  character: string;
  fate: CaptiveFate;
  ransom: number;
  poison: string;
  /** Item 10: for "Question", the shekels spent on the questioning; for "HandOver", the court the captive is given to. */
  spend?: number | null;
  to?: Power | null;
}
export interface PayRansomOrder {
  type: "payRansom";
  character: string;
}
/**
 * #806: a captive king's letter to a court (his own included): it leaves through his captor's court, which reads it and
 * may stop it, unless a spy of his realm posted there carries it out unread (`turn/held-king.ts`).
 */
export interface WriteOrder {
  type: "write";
  to: Power;
  letter: string;
}
/**
 * #592: what to do with a province's offer the court holds, caught on the road: send it to `to` (its claimant or the
 * land's king), or ask `to` a `price` for it.
 */
export interface LetterOrder {
  type: "letter";
  province: string;
  fate: LetterFate;
  to: Power;
  price: number;
  /** The turn its people wrote it, where the court holds more than one of theirs (`HeldLetterView.written`); null: the newest. */
  written?: number | null;
}
/** #592: buy a province's offer another court holds and asked the price of; `written` as for `LetterOrder`. */
export interface BuyLetterOrder {
  type: "buyLetter";
  province: string;
  written?: number | null;
}
/**
 * An order a reply named but left incomplete or unreadable (a cession to no power anyone knows): the validator refuses it
 * with `reason`, so its king is told next season instead of the order vanishing.
 */
export interface UnreadableOrder {
  type: "unreadable";
  text: string;
  reason: string;
}

export type Order =
  | CommandOrder
  | RelieveOrder
  | MandateOrder
  | SupplyOrder
  | GovernOrder
  | CrownOrder
  | UnseatOrder
  | CourtOrder
  | EnlistOrder
  | PayOffOrder
  | HoldOrder
  | MoveOrder
  | SupportOrder
  | ConvoyOrder
  | BesiegeOrder
  | BuildOrder
  | RazeOrder
  | SallyOrder
  | SellOrder
  | StealOrder
  | GiftOrder
  | PurchaseOrder
  | FeedOrder
  | SendOrder
  | CaravanOrder
  | TradeOrder
  | ShipOrder
  | TollOrder
  | DemandOrder
  | CensusOrder
  | AnswerOrder
  | WelcomeOrder
  | DeportOrder
  | ExpelOrder
  | ReturnRunawaysOrder
  | RaiseOrder
  | DisbandOrder
  | FoldOrder
  | CedeProvinceOrder
  | GiftUnitOrder
  | DispatchOrder
  | ReleaseOrder
  | SeekCandidatesOrder
  | HireOrder
  | RenewOrder
  | PayFeeOrder
  | BorrowOrder
  | RepayOrder
  | BuyNewsOrder
  | DismissOrder
  | BackgroundCheckOrder
  | PlaceSpyOrder
  | RecallSpyOrder
  | CounterIntelOrder
  | RoadsOrder
  | ClaimNameOrder
  | RevokeOrder
  | GrantOrder
  | RepudiateOrder
  | AssayOrder
  | AuthenticateOrder
  | ForgeOrder
  | CaptiveOrder
  | PayRansomOrder
  | WriteOrder
  | LetterOrder
  | BuyLetterOrder
  | SeizeHoardOrder
  | SellDebtOrder
  | PayCarriersOrder
  | UpkeepOrder
  | HuntOrder
  | HuntBandsOrder
  | UnreadableOrder;

export type OrderType = Order["type"];
