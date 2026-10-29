import {
  type Clause,
  AllPowers,
  WorldMap,
  newGreetingOptions,
  type GreetingOptions,
  type Order,
  type Power,
  type UnitKind,
} from "@amarna/engine";

export const map = WorldMap.default;
export const clamp = (x: number, lo: number, hi: number): number => Math.min(Math.max(x, lo), hi);
export const num = (s: string): number => (s.trim() === "" || !Number.isFinite(Number(s)) ? 0 : Math.trunc(Number(s)));
export const unitLetter = (k: UnitKind): string => (k === "Army" ? "A" : "F");

export interface Form {
  raiseAt: string;
  raiseKind: string;
  fortifyAt: string;
  grainAt: string;
  grainAction: string;
  grainAmount: string;
  grainTo: string;
  peopleAction: string;
  peopleAt: string;
  peopleTo: string;
  peopleAmount: string;
  grantTo: string;
  grantAt: string;
  grantKind: string;
  grantSeasons: string;
  tradeAction: string;
  tradeFrom: string;
  tradeTo: string;
  tradeGrain: string;
  tradeGold: string;
  tollPercent: string;
  tollPartner: string;
  tollAt: string;
  sallyCity: string;
  sallyFrom: string;
  cedeWhat: string;
  cedeTo: string;
  giftUnit: string;
  giftTo: string;
  envoy: string;
  sendTo: string;
  letter: string;
  /** The letter's clauses, and its tablet's (item 8): beside the words in full press, the whole letter in structured press. */
  clauses: Clause[];
  tabletClauses: Clause[];
  noInventory: boolean;
  /** The envoy's seal and its limits, and whether he shows them (item 9). */
  seal: boolean;
  showCredentials: boolean;
  sealGold: number;
  sealCede: string[];
  sealOpen: string[];
  mandate: string;
  tabletText: string;
  gold: number;
  purity: number;
  watch: number;
  checkSpend: number;
  authSpend: number;
  ransom: number;
  term: number;
  /** Haakon's answers to item 11a: the errand of a job offered (envoy or spy, and where), and the standing order to pay the rest when it is done. */
  errandWhat: "envoy" | "spy";
  errandWhere: string;
  payOnDone: boolean;
  oath: boolean;
  /** The tablet marked as a vassal treaty (item 11+): who it names the vassal, the writer or the reader; "" for none. */
  vassal: "" | "me" | "them";
  g: GreetingOptions;
  copies: string[];
  wages: Record<string, number>;
  checkWho: string;
  spyWho: string;
  spyAt: string;
  poisonText: string;
  /** Item 10: what a questioning costs, a gift to a person at court, and the king a captive is handed over to. */
  questionSpend: number;
  giftGold: number;
  handTo: Power;
  releaseWords: string;
  forgeWho: string;
  forgeText: string;
  forgeSeals: Power[];
  // The standing order being written: what it waits for, and its orders so far.
  stWhen: string;
  stPlace: string;
  stPower: string;
  stUnit: string;
  stKind: string;
  stTarget: string;
  stTo: string;
  stOrders: Order[];
}

export function newForm(me: Power): Form {
  const first = AllPowers.find((p) => p !== me)!;
  const other = (p: Power): Power => (p === me ? first : p);
  return {
    raiseAt: "",
    raiseKind: "Army",
    fortifyAt: "",
    grainAt: "",
    grainAction: "sell",
    grainAmount: "",
    grainTo: "",
    peopleAction: "welcome",
    peopleAt: "",
    peopleTo: "",
    peopleAmount: "",
    grantTo: "",
    grantAt: "",
    grantKind: "passage",
    grantSeasons: "",
    tradeAction: "trade",
    tradeFrom: "",
    tradeTo: "",
    tradeGrain: "",
    tradeGold: "",
    tollPercent: "",
    tollPartner: "",
    tollAt: "",
    sallyCity: "",
    sallyFrom: "",
    cedeWhat: "",
    cedeTo: other("Egypt"),
    giftUnit: "",
    giftTo: other("Egypt"),
    envoy: "",
    sendTo: other("Hatti"),
    letter: "",
    clauses: [],
    tabletClauses: [],
    noInventory: false,
    seal: false,
    showCredentials: false,
    sealGold: 0,
    sealCede: [],
    sealOpen: [],
    mandate: "",
    tabletText: "",
    gold: 0,
    purity: 100,
    watch: 0,
    checkSpend: 30,
    authSpend: 40,
    ransom: 80,
    term: 6,
    errandWhat: "envoy",
    errandWhere: other("Hatti"),
    payOnDone: true,
    oath: false,
    vassal: "",
    g: newGreetingOptions(),
    copies: [],
    wages: {},
    checkWho: "",
    spyWho: "",
    spyAt: other("Hatti"),
    poisonText: "",
    questionSpend: 40,
    giftGold: 20,
    handTo: first,
    releaseWords: "",
    forgeWho: "",
    forgeText: "",
    forgeSeals: [],
    stWhen: "enters",
    stPlace: "",
    stPower: "",
    stUnit: "",
    stKind: "support",
    stTarget: "",
    stTo: "",
    stOrders: [],
  };
}
