import { Dict } from "../core/collections.ts";
import { B, I, type ObjSchema, S, computed, dict, list, obj, opt } from "../core/json.ts";
import type { Power } from "./power.ts";

export const SecrecyValues = ["Public", "Hidden", "Deep"] as const;
export type Secrecy = (typeof SecrecyValues)[number];

export interface Traits {
  loyalty: number;
  greed: number;
  competence: number;
  ambition: number;
  courage: number;
  sympathy: Power | null;
  sympathyStrength: number;
}

export function newTraits(init: Partial<Traits> = {}): Traits {
  return {
    loyalty: 0,
    greed: 0,
    competence: 0,
    ambition: 0,
    courage: 0,
    sympathy: null,
    sympathyStrength: 0,
    ...init,
  };
}

export const TraitsSchema: ObjSchema<Traits> = obj("Traits", newTraits, {
  loyalty: I,
  greed: I,
  competence: I,
  ambition: I,
  courage: I,
  sympathy: opt(S),
  sympathyStrength: I,
});

/**
 * What the engine rolls on (item 10, "What skills cover"): gathering information, avoiding detection and capture, and making
 * forgeries. Kings never see them ("Kings never see skills"), and the character sees them only through its belief.
 */
export interface Skills {
  gather: number;
  stealth: number;
  forge: number;
}

export const SkillValues = ["gather", "stealth", "forge"] as const;
export type Skill = (typeof SkillValues)[number];

export function newSkills(init: Partial<Skills> = {}): Skills {
  return { gather: 0, stealth: 0, forge: 0, ...init };
}

export const SkillsSchema: ObjSchema<Skills> = obj("Skills", newSkills, { gather: I, stealth: I, forge: I });

/**
 * A tie from the life before the game (item 10, "A past before the game"): a debt owed to a court's people, which presses
 * on the purse and gives that court leverage; or a lover or family at a court, which draws the character there and gives
 * that court a hold over it.
 */
export const TieKindValues = ["Debt", "Lover", "Family"] as const;
export type TieKind = (typeof TieKindValues)[number];

export interface Tie {
  kind: TieKind;
  court: Power;
  /** For a debt: the shekels still owed. */
  amount: number;
}

export function newTie(init: Partial<Tie> = {}): Tie {
  return { kind: "Debt", court: "Egypt", amount: 0, ...init };
}

export const TieSchema: ObjSchema<Tie> = obj("Tie", newTie, { kind: S, court: S, amount: I });

/**
 * The name a character gave a court when it first met it (item 10, "Declaring a name"): its own, another character's
 * (`as`), or an invented one; and for a false envoy (item 10, "Swapped tablets and false envoys"), the king it claims to
 * serve. The court's records attach to the name given. `exposed`: the season the court saw through it.
 */
export interface Declared {
  court: Power;
  name: string;
  as: string | null;
  employer: Power | null;
  turn: number;
  exposed: number | null;
  /** The name's standing at that court when it was given: the borrowed person's, or nothing for an invented one. */
  rep: number;
}

export function newDeclared(init: Partial<Declared> = {}): Declared {
  return { court: "Egypt", name: "", as: null, employer: null, turn: 0, exposed: null, rep: 0, ...init };
}

export const DeclaredSchema: ObjSchema<Declared> = obj("Declared", newDeclared, {
  court: S,
  name: S,
  as: opt(S),
  employer: opt(S),
  turn: I,
  exposed: opt(I),
  rep: I,
});

export interface Fact {
  id: string;
  text: string;
  secrecy: Secrecy;
  tag: string;
  knownBy: Power[];
  /** Item 10: the false name it went by at the court that saw this, which that court's record attaches it to; null: its own. */
  alias: string | null;
}

export function newFact(init: Partial<Fact> = {}): Fact {
  return {
    id: "",
    text: "",
    secrecy: "Public",
    tag: "",
    knownBy: [],
    alias: null,
    ...init,
  };
}

export const FactSchema: ObjSchema<Fact> = obj("Fact", newFact, {
  id: S,
  text: S,
  secrecy: S,
  tag: S,
  knownBy: list(S),
  alias: opt(S),
});

export interface MemoryEntry {
  turn: number;
  text: string;
}

export function newMemoryEntry(init: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    turn: 0,
    text: "",
    ...init,
  };
}

export const MemoryEntrySchema: ObjSchema<MemoryEntry> = obj("MemoryEntry", newMemoryEntry, {
  turn: I,
  text: S,
});

export interface Contract {
  wage: number;
  startTurn: number;
  /** The last season of the term. */
  untilTurn: number;
  /**
   * Set when the term has ended and the servant, wanting more than its wage, has given notice: the wage it asks
   * to serve on. Its master may renew it at that price or more; otherwise it leaves at {@link LeavesTurn}.
   */
  noticePrice: number | null;
  /**
   * With a notice: the season at whose start it leaves unless renewed (if it is away then, when it is next at court with no task).
   */
  leavesTurn: number | null;
}

export function newContract(init: Partial<Contract> = {}): Contract {
  return {
    wage: 0,
    startTurn: 0,
    untilTurn: 0,
    noticePrice: null,
    leavesTurn: null,
    ...init,
  };
}

export const ContractSchema: ObjSchema<Contract> = obj("Contract", newContract, {
  wage: I,
  startTurn: I,
  untilTurn: I,
  noticePrice: opt(I),
  leavesTurn: opt(I),
});

export const CharacterStatusValues = ["Free", "Employed", "Captured", "Dead"] as const;
export type CharacterStatus = (typeof CharacterStatusValues)[number];

export const DutyValues = ["None", "EnvoyOutbound", "EnvoyAtCourt", "EnvoyHomebound", "Detained", "SpyOutbound", "SpyPosted"] as const;
export type Duty = (typeof DutyValues)[number];

export interface Character {
  id: string;
  name: string;
  origin: string;
  calling: string;
  traits: Traits;
  facts: Fact[];
  /** Written once by the narrator at creation, then frozen. */
  persona: string;
  memory: MemoryEntry[];
  memorySummary: string;
  status: CharacterStatus;
  employer: Power | null;
  contract: Contract | null;
  duty: Duty;
  /** The court the character is physically at, or null while travelling. */
  at: Power | null;
  /** A province the character watches as a spy, when not at a court. */
  watchProvince: string | null;
  missionTarget: Power | null;
  currentTrail: string | null;
  heldBy: Power | null;
  /**
   * A captive caught leaving, or coming home to, its king's besieged capital (Build order item 5): its captor may execute,
   * ransom or release it, not turn it (it was no spy at a post). Cleared when it is set free.
   */
  intercepted: boolean;
  /** A double agent's real master. */
  secretMaster: Power | null;
  poisonText: string | null;
  turnsAbroad: number;
  /** The gold on its person. Characters start with none; what it holds came in by {@link Gain}. */
  purse: number;
  /** Where the gold in its purse came from. Nothing is spent yet, so the parts add up to the purse. */
  earned: Earnings;
  unpaidTurns: number;
  reputation: Dict<Power, number>;
  askingPrice: Dict<Power, number>;
  /** Courts this character has pitched to, with the pitch text. */
  pitches: Dict<Power, string>;
  /**
   * What courts it serves or served still believe of it, after something happened abroad that they cannot see:
   * at most one per court (an envoy that went over to a host may be covered for its old master and its new one).
   */
  covers: Cover[];
  /** The court it last served, once that service ended by dismissal or by the court's fall. */
  formerEmployer: Power | null;
  /**
   * Wages owed by each court, built up while the character was away in its service (on a mission, posted as a spy,
   * detained or captive). Paid when it stands at that court and is not held there, whether or not it still serves it;
   * forfeited when it goes over to another court, cleared at its death, lost when the court's kingdom falls.
   */
  backPay: Dict<Power, number>;
  /** Item 10: the true skills the engine rolls on. */
  skills: Skills;
  /**
   * Item 10, "Seeing oneself": a hidden inclination to over- (above 0) or underestimate oneself, in skill points; and what
   * the character believes its skills are, which moves with what happens to it.
   */
  inclination: number;
  belief: Skills;
  /** What it last said it can do, when it pitched (item 10, "Kings never see skills"); null if it never has. */
  claimed: Skills | null;
  /** Ties from the life before the game. */
  ties: Tie[];
  /** Item 10, "What servants know": the tablets that passed through its hands (sealed before it, carried, read, copied). */
  seen: string[];
  /** The courts that have seen it under its own name. */
  met: Power[];
  /** The names it declared at courts other than its own. */
  declared: Declared[];
  /** A real person of the period (item 10, "Attested characters"); else generated in its region's style. */
  attested: boolean;
  // computed in C#: Status == CharacterStatus.Free
}

export function newCharacter(init: Partial<Character> = {}): Character {
  return {
    id: "",
    name: "",
    origin: "",
    calling: "",
    traits: newTraits(),
    facts: [],
    persona: "",
    memory: [],
    memorySummary: "",
    status: "Free",
    employer: null,
    contract: null,
    duty: "None",
    at: null,
    watchProvince: null,
    missionTarget: null,
    currentTrail: null,
    heldBy: null,
    intercepted: false,
    secretMaster: null,
    poisonText: null,
    turnsAbroad: 0,
    purse: 0,
    earned: newEarnings(),
    unpaidTurns: 0,
    reputation: new Dict(),
    askingPrice: new Dict(),
    pitches: new Dict(),
    covers: [],
    formerEmployer: null,
    backPay: new Dict(),
    skills: newSkills(),
    inclination: 0,
    belief: newSkills(),
    claimed: null,
    ties: [],
    seen: [],
    met: [],
    declared: [],
    attested: false,
    ...init,
  };
}

export const CharacterSchema: ObjSchema<Character> = obj("Character", newCharacter, {
  id: S,
  name: S,
  origin: S,
  calling: S,
  traits: () => TraitsSchema,
  facts: list(() => FactSchema),
  persona: S,
  memory: list(() => MemoryEntrySchema),
  memorySummary: S,
  status: S,
  employer: opt(S),
  contract: () => ContractSchema,
  duty: S,
  at: opt(S),
  watchProvince: S,
  missionTarget: opt(S),
  currentTrail: S,
  heldBy: opt(S),
  intercepted: B,
  secretMaster: opt(S),
  poisonText: S,
  turnsAbroad: I,
  purse: I,
  earned: () => EarningsSchema,
  unpaidTurns: I,
  reputation: dict(I),
  askingPrice: dict(I),
  pitches: dict(S),
  covers: list(() => CoverSchema),
  formerEmployer: opt(S),
  backPay: dict(I),
  skills: () => SkillsSchema,
  inclination: I,
  belief: () => SkillsSchema,
  claimed: () => SkillsSchema,
  ties: list(() => TieSchema),
  seen: list(S),
  met: list(S),
  declared: list(() => DeclaredSchema),
  attested: B,
  isAvailableForHire: computed(B, (o: Character) => o.status === "Free"),
});

/** Where gold in a character's purse came from. */
export const GoldSourceValues = ["Wages", "Skimmed", "Gifts", "Carried"] as const;
export type GoldSource =
  /** Its wage paid at court, and back pay paid when it came back. */
  | "Wages"
  /** Kept from gold it carried, out to a court or home. */
  | "Skimmed"
  /** A king's personal gift at an audience. */
  | "Gifts"
  /** Gold it was carrying when it was dismissed on the way out, which became its own. */
  | "Carried";

/**
 * What a character has gained, by source. Characters spend nothing yet (no escort, storage fee or loan exists).
 */
export interface Earnings {
  wages: number;
  skimmed: number;
  gifts: number;
  carried: number;
  // computed in C#: Wages + Skimmed + Gifts + Carried
}

export function newEarnings(init: Partial<Earnings> = {}): Earnings {
  return {
    wages: 0,
    skimmed: 0,
    gifts: 0,
    carried: 0,
    ...init,
  };
}

export const EarningsSchema: ObjSchema<Earnings> = obj("Earnings", newEarnings, {
  wages: I,
  skimmed: I,
  gifts: I,
  carried: I,
});

/**
 * A servant abroad whose master cannot see what happened to it (caught as a spy, detained, gone over to
 * the host, put to death, let go) keeps appearing to that master as it was, until word of it comes: a
 * rumour, a report from it, the servant standing at the master's court, or the master dismissing it. In its
 * master's books its back pay builds up by the wage it believes it owes, as for any servant away.
 */
export interface Cover {
  /** The master who still believes it. */
  for: Power;
  since: number;
  /**
   * The duty the master believes the servant is on (a posted spy, an envoy on the road home, one who has not returned).
   */
  believed: Duty;
  /**
   * Set when the master believes the servant is held captive at that court: its view then reads as a captive's.
   */
  heldAt: Power | null;
  /**
   * The master recalled a spy it believed at its post: it believes it on the road home, and so it comes home if it is turned.
   */
  recalled: boolean;
  dutyText: string;
  whereText: string;
  /**
   * When the master believes the servant set out and is due back, as its view read then (see {@link Views.TimingText}).
   */
  timingText: string;
  wage: number;
  /**
   * The back pay the master believes it owes: the real back pay when the cover was made, grown by {@link Wage}
   * each season since, exactly as for a servant still on its mission. No gold moves either way.
   */
  backPay: number;
  contractUntil: number | null;
  /**
   * The notice the master believes the servant has given (the price it asks to serve on, and when it leaves), if any.
   */
  noticePrice: number | null;
  leavesTurn: number | null;
  /**
   * The facts the master knew of the servant then, and public ones its inquiries have found since. A public fact
   * added meanwhile, such as a defection, stays unseen until an inquiry finds it; hidden facts the master learns
   * show as for any servant.
   */
  factIds: string[];
}

export function newCover(init: Partial<Cover> = {}): Cover {
  return {
    for: "Egypt",
    since: 0,
    believed: "None",
    heldAt: null,
    recalled: false,
    dutyText: "",
    whereText: "",
    timingText: "",
    wage: 0,
    backPay: 0,
    contractUntil: null,
    noticePrice: null,
    leavesTurn: null,
    factIds: [],
    ...init,
  };
}

export const CoverSchema: ObjSchema<Cover> = obj("Cover", newCover, {
  for: S,
  since: I,
  believed: S,
  heldAt: opt(S),
  recalled: B,
  dutyText: S,
  whereText: S,
  timingText: S,
  wage: I,
  backPay: I,
  contractUntil: opt(I),
  noticePrice: opt(I),
  leavesTurn: opt(I),
  factIds: list(S),
});

// ---------------------------------------------------------------- Character's methods

export function remember(c: Character, turn: number, text: string): void {
  c.memory.push(newMemoryEntry({ turn, text }));
}

/** Gold into its purse, counted by where it came from. */
export function gain(c: Character, amount: number, source: GoldSource): void {
  if (amount <= 0) return;
  c.purse += amount;
  switch (source) {
    case "Wages":
      c.earned.wages += amount;
      break;
    case "Skimmed":
      c.earned.skimmed += amount;
      break;
    case "Gifts":
      c.earned.gifts += amount;
      break;
    case "Carried":
      c.earned.carried += amount;
      break;
  }
}

/** The false name a character still goes by at a court (item 10, "Declaring a name"), or null if it goes by its own there. */
export function falseNameAt(c: Character, court: Power): Declared | null {
  return c.declared.find((d) => d.court === court && d.exposed === null) ?? null;
}

/** The name a court knows a character by. */
export function nameKnownAt(c: Character, court: Power): string {
  return falseNameAt(c, court)?.name ?? c.name;
}

/** The standing of the name a court knows a character by ("A name made of outcomes"). */
export function reputationAt(c: Character, court: Power): number {
  const d = falseNameAt(c, court);
  return d !== null ? d.rep + c.reputation.getOrDefault(court, 0) : c.reputation.getOrDefault(court, 0);
}

/**
 * What a court knows of a character: its public facts and those it learned. Item 10: a court's records attach to the name it
 * was given, so a court that knows it by a false name sees only what it learned under that name, and one that knows its
 * true name does not see what was learned of it under a name it never heard (until that name is exposed there).
 */
export function factsKnownTo(c: Character, p: Power): Fact[] {
  const d = falseNameAt(c, p);
  return c.facts.filter(
    (f) =>
      (f.secrecy === "Public" || f.knownBy.includes(p)) &&
      (d !== null ? f.alias === d.name : f.alias === null || c.declared.some((x) => x.court === p && x.name === f.alias && x.exposed !== null)),
  );
}

/** What `p` still believes of this character, if it has not heard what happened to it. */
export function coverOf(c: Character, p: Power): Cover | null {
  return c.covers.find((k) => k.for === p) ?? null;
}

/**
 * A foreign spy posted at `court` that the court does not know is there. A spy watches a court in secret: the court does
 * not see it standing there, nor whom it serves, until its watchmen catch it (it is then the court's captive). A spy
 * secretly in that court's own pay (one it turned, or a plant) reports to it, so the court knows it is there.
 */
export function hiddenAt(c: Character, court: Power): boolean {
  return c.at === court && c.status === "Employed" && c.duty === "SpyPosted" && c.employer !== court && c.secretMaster !== court;
}

export function earningsTotal(e: Earnings): number {
  return e.wages + e.skimmed + e.gifts + e.carried;
}

export function addEarnings(e: Earnings, other: Earnings): void {
  e.wages += other.wages;
  e.skimmed += other.skimmed;
  e.gifts += other.gifts;
  e.carried += other.carried;
}
