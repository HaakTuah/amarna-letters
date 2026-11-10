/**
 * The script kings' voices (the slop audit, archive item 178): the words of their letters and of their answers in audience,
 * each in a few forms, so that no king writes the same sentence every season and no two kings close alike.
 *
 * A form is chosen by a hash of the season, the two kings and the kind of words, never by the game's random numbers, so
 * the choice draws nothing and seeds replay exactly. Script kings read these words back (an envoy's report is weighed for
 * warmth, a threat aimed at the host is softened by a timid envoy, a plea is found by its siege), so every form of a line
 * keeps the words its first form was read by: the same warm and cold words, the same threat or none, the siege, the
 * besieger and the city in one sentence.
 *
 * Only presentation and voice name a power ("Different data, same rules"): a king's closing line is his own.
 */
import { pick, tier, type Power } from "@amarna/engine";

/** The engine's `pick`: one of a few forms by "season|the rest", so a king goes through every form in turn. */
export { pick };

/** What a letter names, filled into its words. */
export interface LetterParts {
  /** "season|sender|recipient", which chooses the form (see pick). */
  key: string;
  foe?: Power;
  city?: string;
  place?: string;
  from?: string;
  target?: string;
  amount?: number;
  /** A gift goes with a letter of peace. */
  gift?: boolean;
  /** A threat is added where the king means it and can make it good. */
  threat?: boolean;
  /** The walls of a besieged city can sally. */
  sally?: boolean;
  /** The recipient is not yet sworn against the besieger. */
  unsworn?: boolean;
  /** Kings named on a forged tablet, or the one who broke his oath. */
  names?: string;
  /** The sender rules a city, not a kingdom, and writes as a servant. */
  servant?: boolean;
}

const L = (p: LetterParts, kind: string, forms: ((p: LetterParts) => string)[]): string => pick(forms, `${p.key}|${kind}`)(p);

/** A city's ruler begs as the vassals of the archive did ("Like a bird in a trap, so am I in Byblos": 09-ea-74). */
const ServantPlea: ((p: LetterParts) => string)[] = [
  (x) =>
    `${x.city} is like a bird in a trap, for ${x.foe} besieges it. Send soldiers to your servant${x.sally ? "; the men on my walls will come out to meet them" : ""}.` +
    (x.unsworn ? ` Stand with me against ${x.foe} before he turns to you.` : "") +
    " If no one comes, my brothers in the city will die.",
  (x) =>
    `${x.foe} besieges ${x.city}, and the land goes over to the Habiru. Let archers come to your servant${x.sally ? ", and my walls will open to meet them" : ""}.` +
    (x.unsworn ? ` Swear with me against ${x.foe}.` : "") +
    " My brothers in the city have no bread.",
];

/** The kings' own words for the letters they send most, one form more in each rotation: a gift and a grievance. */
const OwnGift: Partial<Record<Power, string>> = {
  Egypt: "A gift goes to my brother with my messenger; in my house gold is not counted. Your news gladdened my heart; I rejoice.",
  Babylonia: "I rejoice that my brother is well. I send a gift; let yours be as heavy.",
  Mitanni: "My brother, I rejoice at your news. Here is a gift; let ours be greater than our fathers' gifts were.",
  Assyria: "Here is a gift from Assyria, sent as a Great King sends. Ashur has kept my brother well, and I rejoice.",
  Hatti: "Take this gift, my brother, and let my messenger come home quickly. I rejoice at the word he brought me.",
  Arzawa: "I rejoice that you are well, my brother. Here is a gift; answer me by tablet, and not by word of mouth.",
  Alashiya: "With this gift goes copper, my brother; send me silver for it. I rejoice that the gods keep you.",
};
const OwnGrievance: Partial<Record<Power, string>> = {
  Egypt: "My brother, your soldiers are in my land. Egypt does not plead: withdraw them, and a gift will answer for the rest.",
  Babylonia: "Your soldiers stand in my land as if Babylon had no king. Withdraw them, brother, and send a gift worthy of my house.",
  Mitanni: "My brother, let it not be said that our houses quarrelled. A gift will set it right, once your soldiers withdraw.",
  Assyria: "Your soldiers are in my land, brother, and the king of Assyria is not asleep. No gift will mend this while they stay; withdraw them.",
  Hatti: "Your soldiers stand in my land. I write this once, brother: withdraw them, and send a gift before my next tablet.",
  Arzawa: "Your soldiers are in my land, while your tablets spoke of brotherhood. Withdraw them, send a gift, and set your excuse on a tablet.",
  Alashiya: "My brother, your soldiers are on my island. Withdraw them, and send a gift for the harm.",
};

/** The sender, from a letter's key ("season|sender|recipient"). */
const senderOf = (p: LetterParts): Power => p.key.split("|")[1] as Power;
const own = (forms: ((p: LetterParts) => string)[], line: string | undefined): ((p: LetterParts) => string)[] => (line === undefined ? forms : [...forms, () => line]);

/** The body of a script king's letter of each kind, before his closing line. */
export const Letter = {
  coalitionLeader: (p: LetterParts): string =>
    L(p, "leader", [
      (x) => `${x.foe} rises like the river in flood, and the cities go under one by one. Join with me against him: where your chariots meet his, mine will be beside them.`,
      (x) => `Every season ${x.foe} is greater, and the cities that stood against him are fewer. Two kings' chariots can stop him; one king's cannot.`,
      (x) => `${x.foe} takes city after city, and no king has yet barred his road. Let us bar it.`,
    ]),
  coalitionInvaded: (p: LetterParts): string =>
    L(p, "invaded", [
      (x) => `${x.foe} has sent his soldiers into my land. When he has eaten my fields, he will look for more. Stand against him with me, and my archers will fight beside yours.`,
      (x) => `The army of ${x.foe} is in my land, taking my towns. A king who takes from one house will not stop at its door. Swear with me against ${x.foe}.`,
    ]),
  alliance: (p: LetterParts): string =>
    L(p, "alliance", [
      () => "There has been peace between us, as there should be between brothers. Let us swear a closer oath: whoever is my enemy is yours, and whoever is yours is mine.",
      () => "Between us there has been peace, my brother. Let Shamash witness a closer oath: that the enemy of one shall be the enemy of both.",
    ]),
  peace: (p: LetterParts): string =>
    L(p, "peace", [
      (x) =>
        "Let there be brotherhood between us, as there was between our fathers. Neither of us shall send his soldiers into the other's land." +
        (x.gift ? " With my messenger goes gold, for love of you." : "") +
        " Set your seal on the tablet I send, before Shamash and the gods of your land.",
      (x) =>
        "My brother, our fathers sent messengers to each other; let us do the same. My soldiers will not cross into your land, nor yours into mine." +
        (x.gift ? " I send gold with my messenger, for I love my brother." : "") +
        " Set your seal on the tablet he carries.",
      (x) =>
        "I desire brotherhood with you, and no quarrel. Let no soldier of mine or of yours cross between our lands." +
        (x.gift ? " The gold I send speaks my love for my brother." : "") +
        " Set your seal on the tablet my messenger brings, before the gods of both our lands.",
    ]),
  lull: (p: LetterParts): string =>
    L(p, "lull", [
      () => "My soldiers are at the harvest, and I have no quarrel with any king. Friendship between us is all I ask, and let gifts travel the road.",
      () => "I have not called up my levies this year; they are in their fields. I desire only friendship with you, and gifts between our houses.",
    ]),
  grievanceOath: (p: LetterParts): string =>
    L(p, "grievanceOath", [
      () => "You swore before the gods, and then your soldiers crossed into my land. The gods heard that oath. Withdraw them, and send a gift fit to mend it.",
      () => "The clay of your oath has not hardened, and your soldiers are already in my land. Withdraw them, and let a fitting gift come with your excuse.",
      () => "Shamash saw you swear, and Shamash sees your chariots in my land. Withdraw them, and send a gift to answer for it.",
    ]) + threat(p),
  grievance: (p: LetterParts): string =>
    L(
      p,
      "grievance",
      own(
        [
          () => "Your soldiers have come into my land. Is this brotherhood? Withdraw them, and send me a fitting gift.",
          () => "My brother, your soldiers stand in my fields. Withdraw them; then send a gift, and I will hear your excuse.",
        ],
        OwnGrievance[senderOf(p)],
      ),
    ) + threat(p),
  plea: (p: LetterParts): string =>
    L(
      p,
      "plea",
      p.servant
        ? ServantPlea
        : [
            (x) =>
              `My brother, ${x.foe} besieges my city of ${x.city}. Send your soldiers to drive his men off${x.sally ? ", and mine will come out from the walls to meet them" : ""}.` +
              (x.unsworn ? ` Join me against ${x.foe} now, before he turns to you.` : " Whoever comes to me now, I will repay."),
            (x) =>
              `My brother, the army of ${x.foe} is camped around ${x.city} and besieges it. Come quickly and drive it away${x.sally ? "; my walls will send out men to meet you" : ""}.` +
              (x.unsworn ? ` If ${x.city} falls, ${x.foe} stands at your border.` : " Do not let my city fall."),
            (x) =>
              `My brother, ${x.city} is besieged: ${x.foe} sits before its gates. Send me chariots${x.sally ? ", and my archers will come out to join them" : ""}.` +
              (x.unsworn ? ` Swear with me against ${x.foe}.` : " Its walls hold; its granaries will not."),
          ],
    ),
  basing: (p: LetterParts): string =>
    L(p, "basing", [
      (x) => `My brother, my war with ${x.foe} runs past your land. Let my soldiers camp in ${x.place} as your guests: they will take nothing of yours, and from there they will go against ${x.foe}.`,
      (x) => `My brother, I am at war with ${x.foe}, and the road to him runs through your land. Give my army leave to camp in ${x.place}; it will eat its own bread and touch nothing of yours.`,
    ]),
  accuse: (p: LetterParts): string =>
    L(p, "accuse", [
      (x) => `The gold your messenger brought me was ${x.amount} shekels light of the inventory you sealed. Did your hand hold it back, or did your messenger lie to you and to me?`,
      (x) => `I had your gold weighed against the inventory you sealed, and ${x.amount} shekels were missing. Your messenger lied to you and to me, or your hand was close.`,
    ]),
  support: (p: LetterParts): string =>
    L(p, "support", [
      (x) => `We are sworn together against ${x.foe}. When your army goes from ${x.from} into ${x.target}, mine will go with it.`,
      (x) => `Against ${x.foe} we are bound by oath. Go from ${x.from} into ${x.target}, and my chariots will be at your side.`,
      (x) => `When your chariots go up from ${x.from} into ${x.target}, my soldiers will go up with them against ${x.foe}.`,
    ]),
  tribute: (p: LetterParts): string =>
    L(p, "tribute", [
      (x) => `Here is this year's tribute, ${x.amount} shekels of gold. Let my lord guard the land of his servant.`,
      (x) => `I send ${x.amount} shekels of gold, the tribute of the year. Let the eyes of my lord be on the land of his servant.`,
      (x) => `Your servant sends the tribute of the year, ${x.amount} shekels of gold, and asks only that the king guard his land.`,
    ]),
  demand: (p: LetterParts): string =>
    L(p, "demand", [
      (x) => `You are my servant by the tablet you sealed, and your tribute has not come. Send the ${x.amount} shekels of this year${x.threat ? ", or my troops will come for it" : ", as your oath says"}.`,
      (x) => `The tablet you sealed makes you my servant, and this year's tribute is late. Send me ${x.amount} shekels${x.threat ? ", or my troops will come for it" : ", as you swore to"}.`,
    ]),
  offerBond: (p: LetterParts): string =>
    L(p, "offer", [
      (x) => `Serve me, and pay me ${x.amount} shekels each year, and I will guard your land as my own.`,
      (x) => `Accept me as your lord. For ${x.amount} shekels a year my chariots will guard your towns as they guard mine.`,
    ]),
  submit: (p: LetterParts): string =>
    L(p, "submit", [
      (x) => `Let me be your servant. I will send you ${x.amount} shekels each year and raise no hand against you; guard my land.`,
      (x) => `I would serve you. Take ${x.amount} shekels from me each year, and never lift a hand against you. Only guard my land.`,
    ]),
  gift: (p: LetterParts): string =>
    L(
      p,
      "gift",
      own(
        [
          () => "I have heard that all is well with you, and I rejoice. Here is a gift for my brother; send me your messenger quickly.",
          () => "Your messenger told me you are well, my brother, and I rejoiced. I send a gift with my messenger; do not keep him long.",
          () => "My brother, my messenger brings you a gift. I rejoice that you are well; let me hear the same from your own messenger soon.",
        ],
        OwnGift[senderOf(p)],
      ),
    ),
  forged: (p: LetterParts): string =>
    L(p, "forged", [
      (x) => `My brother, see what ${x.names} have sealed in secret. Here is the tablet itself. Read it, and see what friendship they offer you.`,
      (x) => `My brother, this tablet was sealed in secret by ${x.names}. I send it to you whole. Read it, and judge their friendship yourself.`,
    ]),
  broken: (p: LetterParts): string =>
    L(p, "broken", [
      (x) => `${x.names} sealed this tablet with me before the gods, and broke it. Here is his seal; read it. Stand with me, and he will answer for that oath.`,
      (x) => `Here is the tablet ${x.names} sealed with me before the gods, and then broke. Here is his seal, and here is his oath; stand with me against him.`,
    ]),
};

function threat(p: LetterParts): string {
  return p.threat ? pick([" If you do not withdraw, my troops will march into your land.", " If you do not withdraw them, my chariots will march into your land."], `${p.key}|threat`) : "";
}

/**
 * Each king's own closing lines, one of them on every letter and audience. A ruler who is no Great King writes plainly.
 * Every line of a king's keeps the warm words his first line was read by (see the top of this file).
 */
const Closings: Partial<Record<Power, readonly string[]>> = {
  Egypt: [
    "In Egypt gold is as dust, and my friends know it.",
    "Gold goes out from my house to my friends, and to no one else.",
    "No friend of mine has sent to me in vain.",
    "The house of Egypt's friend never lacks for gold.",
  ],
  Babylonia: [
    "A Great King's gift is judged by Great Kings.",
    "A small gift shames the king who sends it.",
    "My father's gifts were never counted out by the handful.",
    "Let the gifts between us be such as kings send.",
  ],
  Mitanni: [
    "Let my brother protect me as his father protected mine, and I will be his faithful friend.",
    "As your father was a friend to my father, let my brother be ten times more to me.",
    "Let the friendship between my brother and me be greater than our fathers had.",
    "Ask your elders, my brother: no friend of your house was ever nearer than mine.",
    "Between my brother's house and mine let the friendship never grow cold.",
    "May the gods keep my brother and me friends of one heart.",
  ],
  Assyria: [
    "I am a Great King, as you are; my house stands level with yours.",
    "My fathers did not write to yours as servants, and neither do I.",
    "Ashur set me on my father's throne.",
    "Send your messengers to Assyria: they will find a king there.",
  ],
  Hatti: [
    "My chariots are many, and they ride for my friends.",
    "I do not leave my friends to stand alone.",
    "Ask the kings who stood with Hatti what my friendship was worth.",
    "No friend of Hatti has ever stood alone.",
    "The Storm God of Hatti watches over my friends and their roads.",
  ],
  Arzawa: [
    "Write to me in my own tongue; my friends do.",
    "Send me tablets, not a messenger's talk; tablets are what my friends send.",
    "The road to my land is long, but my friends travel it.",
    "Arzawa keeps its friendships as it keeps its oaths.",
  ],
  Alashiya: [
    "I send you copper from my mountains; send me silver and gold.",
    "Your messenger will bring copper home; let him bring me gold.",
    "Copper is what my island has, and I do not hold it back; send me silver.",
    "Your ships know the way to my harbour; let them bring me gold for my copper.",
  ],
};

const Plain: readonly string[] = ["May the gods keep you.", "Send me your answer by my messenger.", "May the gods of my city guard you.", "", ""];

/** A king's closing line for these words, chosen by `key`; a ruler who is no Great King closes plainly or not at all. */
export function closing(me: Power, key: string): string {
  return pick(Closings[me] ?? (tier(me) === "City" ? Plain : [""]), `${key}|close`);
}

/** A host's words to an envoy in audience, each in a few forms chosen by `key` (the season, the host and the sender) and the line's name. */
export const Audience = {
  noGreeting: ["Your tablet does not even greet me. Is this how one writes to a Great King?", "Your lord's tablet has no greeting. Does he take me for a servant?"],
  noBrother: ["You do not call me brother. Have I not been a brother to you?", "Your lord leaves out the word brother. I will not beg him for it."],
  noGreatKing: ["And you deny me the title of Great King. My scribes have marked it.", "Nor am I called Great King. Let your lord think on that."],
  nameFirst: ["You put your own name before mine.", "Your lord writes his own name before mine."],
  modest: ["Your lord writes modestly to a Great King. It is well.", "Your lord knows how to write to a Great King."],
  lightGold: ["My scales say your lord sends light gold to a Great King.", "Either your lord's hand is close, or his messenger's hands are heavy with my gold."],
  smallGift: ["I have received your gift. It is small, for a Great King.", "Your gift has come. A Great King sends more.", "This gift is light for a Great King to send."],
  thanks: ["I have received your gift, and I thank my brother.", "The gift has come; my brother is generous.", "My brother's gift has come, and I am glad of it."],
  copy: ["I have seen the tablet you show me. Whoever breaks oaths, or forges them, I will know him again.", "I have read the tablet you bring. I will know who made it."],
  sealed: ["I have sealed the tablet before the gods.", "The tablet is sealed; the gods are witness.", "It is sealed, and Shamash has seen it."],
  refuseGives: ["I will not seal a tablet that bargains with my land, my gold or my tribute."],
  refuse: ["I will not seal this tablet now.", "Carry this tablet home; I will not seal it.", "This tablet I will not seal."],
  askOath: ["Swear to me that your lord's troops will stand with mine, as mine will stand with his.", "Swear to me, in your lord's name, that his men will stand beside mine."],
  counter: ["Here is a tablet I would seal. If you carry your lord's seal, set it here.", "Take this tablet instead: I will seal it, if your lord's seal is in your hand."],
  loving: ["Tell my brother that my love for him is great.", "Tell my brother I love him as my own house.", "Greet my brother; tell him my love goes with you."],
  bitter: ["Tell your lord that I have not forgotten what he did.", "What your lord did is not forgotten by my house.", "Your lord's deed is written on my heart; it is not forgotten."],
  pressBribe: ["Take this as well, and think again about what I asked."],
  farewell: ["Go in peace, and carry my words faithfully.", "Go in peace; carry my words as I spoke them.", "Go in peace, and say to your lord what you heard here."],
} as const satisfies Record<string, readonly string[]>;

/** The host's words for one line, chosen by the audience. */
export const say = (line: keyof typeof Audience, key: string): string => pick(Audience[line], `${key}|${line}`);

/** A host's answer to a plea for a besieged city. */
export const pleaHeard = (city: string, besieger: Power, key: string): string =>
  pick(
    [`I have heard of the siege of ${city}. Where my soldiers can reach the troops of ${besieger}, they will drive them out.`, `Let ${besieger} look to his camp before ${city}: my troops are coming.`],
    `${key}|plea`,
  );
