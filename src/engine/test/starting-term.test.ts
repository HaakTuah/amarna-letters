import { describe, test } from "vitest";
import { type GameState, I, Rng, S, TraitsSchema, dict, distinct, hash, list, newGame, obj, opt, range } from "@amarna/engine";
import { Assert } from "./support.ts";

// <summary>Starting envoys' terms end at different seasons, drawn from a stream of their own.</summary>
describe("StartingTermTests", () => {
  // Everything a starting character is apart from its term's end and its ids. The ids are left out since item 4's fix (d)
  // renumbered them (each kind of object now counts on its own), which moved nothing else. Texts are read with the
  // article the follow-up's review of the fix pass after item 4 corrected put back ("Served as a interpreter", "once a
  // interpreter"), which changed no draw.
  function people(s: GameState): string {
    const fact = obj("Fact", () => ({}), { text: S, secrecy: S, tag: S, knownBy: list(S) });
    const person = obj("Person", () => ({}), {
      name: S,
      origin: S,
      calling: S,
      traits: TraitsSchema,
      facts: list(fact),
      status: S,
      employer: opt(S),
      at: opt(S),
      secretMaster: opt(S),
      persona: S,
      reputation: dict(I),
      wage: opt(I),
      start: opt(I),
    });
    return hash(
      list(person),
      s.characters.map((c) => ({
        name: beforeOf(c.name),
        // Kanesh took its Hittite name, Nesa, in item 7a's map review; the fingerprint is of the draws, not the names.
        origin: bornAt(c.name, beforeOf(c.origin)),
        calling: beforeOf(c.calling),
        traits: c.traits,
        facts: c.facts.map((f) => ({ text: bornAt(c.name, beforeOf(f.text)), secrecy: f.secrecy, tag: f.tag, knownBy: f.knownBy })),
        status: c.status,
        employer: c.employer,
        at: c.at,
        secretMaster: c.secretMaster,
        persona: bornAt(c.name, beforeOf(c.persona)),
        reputation: c.reputation,
        // Item 11a: a job's fee for the seasons it runs, at what the old wage paid: the wage is its fee over those seasons.
        wage: c.contract !== null ? c.contract.fee / (c.contract.untilTurn - 1) : null,
        start: c.contract?.startTurn ?? null,
      })),
    );
  }

  /** The callings with an article of their own, or titles, that took another before #468. */
  const OwnArticle = new RegExp(
    `\\b(once|Served as) (${["the ruler's brother", "the ruler's son", "the governor of Alashiya", "a dispossessed lord", "a lord of the coast", "a man of Akka", "God's Father and Master of the Horse", "King's Son of Kush"].join("|")})`,
    "g",
  );

  function beforeOf(text: string): string {
    // The full history check (2 November 2026) corrected the cast's texts against their letters: Tahmashshi is Tahmaya in
    // EA 265, two callings, and the facts below. Put back first, so that #468's articles below see the old callings.
    const was = Corrected.reduce(
      (t, [now, old]) => t.replaceAll(now, old),
      text.replace(/^son of Balumme$/, "a man of Akka").replaceAll("Tahmaya", "Tahmashshi").replaceAll("son of Balumme", "man of Akka").replaceAll("man of Aziru's house", "son of Abdi-Ashirta"),
    );
    return was.replaceAll("as an interpreter", "as a interpreter").replaceAll("once an interpreter", "once a interpreter").replaceAll("Nesa", "Kanesh")
      // A calling with an article of its own, or a title, no longer takes another (#468): put back the one it took then.
      .replace(OwnArticle, (_m, w: string, k: string) => `${w} ${/^[aeiou]/i.test(k) ? "an" : "a"} ${k}`)
      // Every province a proper name (polish lane, 2 November 2026): the descriptions they replaced.
      .replaceAll("Tamassos", "the copper hills of Alashiya")
      .replaceAll("Enkomi", "the harbour of Alashiya")
      .replaceAll("Sutu", "the Sutean steppe")
      // The history spot-check of 2 November 2026 corrected Yapahu's post and two cast texts against their letters (#461, #462).
      .replaceAll("Burna-Buriash's envoy to Egypt (EA 10).", "Burna-Buriash's envoy to Egypt (EA 11).")
      .replaceAll("noble of Gazru", "the ruler's brother")
      .replaceAll("A man of Gazru who rules it after Milkilu, kin or not no letter says, and writes to Pharaoh as its ruler; his own younger brother went over to the Habiru (EA 297-300).", "Milkilu's brother at Gazru, who rules it after him and writes to Pharaoh as its ruler (EA 297-300).");
  }

  /** The cast's facts as the full history check corrected them, and as they were. */
  const Corrected: readonly (readonly [string, string])[] = [
    ["Chief of the bodyguard, probably the king's brother, who commands the guard at the king's person and often an army (the Deeds of Suppiluliuma).", "Chief of the bodyguard, the king's brother, who commands the guard at the king's person and often an army (the Deeds of Suppiluliuma)."],
    ["God's Father and Overseer of All the Horses of His Majesty, a fan-bearer at the king's right hand (his tomb at Amarna).", "God's Father and Master of the Horse at Akhetaten: the chariotry and the king's household are his (his tomb at Amarna)."],
    ["King's Son of Kush, the viceroy who rules Nubia for Pharaoh; most take him for the viceroy of the year-12 campaign on the Buhen stela, whose name is lost there.", "King's Son of Kush, the viceroy who rules Nubia for Pharaoh and led his one campaign there (the Buhen and Amada stelae)."],
    ["Pharaoh's commissioner at Ṣumur, Egypt's base on Amurru's coast, to whom Abdi-Ashirta writes (EA 62); Abdi-Ashirta and Rib-Hadda both name him (EA 60, 68, 131).", "Pharaoh's commissioner at Ṣumur, Egypt's base on Amurru's coast, whom Rib-Hadda of Gubla writes to (EA 60, 62, 68)."],
    ["Pharaoh's commissioner in the north, whom Rib-Hadda warned against Ha'ip (EA 132) and later reports killed (EA 362).", "Pharaoh's commissioner in the north, with archers under him, who comes and goes between Gubla, Ṣumur and Egypt (EA 117, 124, 131-132)."],
    ["An official of Pharaoh's in the north; Rib-Hadda says he handed Ṣumur over (EA 132), and Abi-Milku says he gave it to Aziru (EA 149).", "An official of Pharaoh's in the north; Rib-Hadda says he handed Ṣumur to the sons of Abdi-Ashirta (EA 132)."],
    ["Pharaoh's commissioner in the south: the ruler of Gazru calls him his commissioner (EA 292), and Yidya of Ashqaluna says the king set him over the land (EA 326).", "Pharaoh's commissioner in the south, to whom the rulers of Gazru and the coast answer (EA 292, 315-326)."],
    ["Pharaoh sent Tagi of Ginti-kirmil a gold goblet and linen garments in his care (EA 265).", "Pharaoh's commissioner in Canaan, to whom Tagi writes (EA 265)."],
    ["Pharaoh's man with Aziru, who says Hatip took all the gold and silver the king had given him (EA 161); Aziru and Hatip are to come to Pharaoh together (EA 164-166).", "Came to Amurru with Hani and, Aziru complains, took the gold that was meant for Pharaoh (EA 161)."],
    ["King of the Hurri land against Tushratta, with a treaty with Suppiluliuma (the Shattiwaza treaty).", "Calls himself king of the Hurri lands against Tushratta, with Hittite backing (the Shattiwaza treaty); the lands east of the Habur lean to him."],
    ["One of Ashur-uballit's envoys to Pharaoh, whose king asks why his messengers are kept out in the sun (EA 16).", "Ashur-uballit's envoy, kept standing in the sun at Pharaoh's court until the king complained of it (EA 16)."],
    ["Another of Ashur-uballit's envoys to Pharaoh, whose king asks why his messengers are kept out in the sun (EA 16).", "Ashur-uballit's envoy, kept standing in the sun at Pharaoh's court with his fellow (EA 16)."],
    ["The governor of Alashiya, who writes to Pharaoh's governor as his brother and sends copper and ivory of his own (EA 40).", "The governor of Alashiya, a second voice of the island's state, who writes to Pharaoh's governor and sends gifts of his own (EA 40)."],
    ["Writes to Pharaoh with the town of Gubla after Rib-Hadda's fall (EA 139-140); most take him for the younger brother who turned Gubla against Rib-Hadda (EA 137-138, 162).", "Rib-Hadda's younger brother, who shut him out of Gubla and wrote to Pharaoh as its ruler (EA 137-140, 162)."],
    ["A son of Abdi-Ashirta, so Aziru's brother, who broke into Ullassa (EA 104).", "A son of Abdi-Ashirta and Aziru's brother, one of the sons who share Amurru and took the coast's towns (EA 104, 132)."],
    ["With Bet-ili he wrote to Aziru while Aziru was in Egypt that Hittite troops had taken towns of Amqu (EA 170); perhaps Aziru's brother.", "Aziru's brother, who kept Amurru and wrote to him while he was held in Egypt (EA 170)."],
    ["Holds the land of Ginti-kirmil by the Carmel (EA 289) and writes to Pharaoh as his servant (EA 264-266); Milkilu's father-in-law (EA 249).", "Rules his own town, Ginti-kirmil in the Carmel region, Labaya's ally and Milkilu's father-in-law (EA 249, 264-266)."],
    ["The men of Taanach robbed him and drove him out; he stays with Biridiya at Magidda (EA 248) and rode with him after Labaya (EA 245).", "Driven from his town by Labaya's men, he stands with Biridiya at Magidda and asks Pharaoh for his land back (EA 245, 248)."],
    ["Rules Akshapa and writes to Pharaoh as his servant (EA 223); with Surata of Akka he brought chariots to help Shuwardata (EA 366).", "Rules Akshapa, a town near Akka, and writes to Pharaoh as his servant (EA 223, 366)."],
    ["Son of Balumme, who with Shutatna of Akka sent his men to kill Babylon's merchants at Hinnatuna and take their silver, Burna-Buriash says (EA 8).", "Son of Balumme, a man of Akka who killed Babylon's merchants at Hinnatuna and took their silver, Burna-Buriash says (EA 8)."],
    ["Son of Surata of Akka, who killed Babylon's merchants with Shum-Adda (EA 8); Akka's ruler after his father (EA 233-235).", "Son of Surata of Akka, who killed Babylon's merchants with Shum-Adda (EA 8); Akka's ruler after his father."],
    ["A lord of the coast at feud with Rib-Hadda, who says he sides with Aziru, seized one of Gubla's ships and kept its ships from Yarimuta (EA 105, 113-114, 116).", "A lord of the coast at feud with Rib-Hadda, who says he sides with Aziru and seizes Gubla's ships (EA 83, 85, 98, 113-114, 116)."],
    ["The man of Ruhizzi, who serves Aitakama of Qadesh against Pharaoh's land of Upe, Akizzi says (EA 53-54); with Biridashwa he is causing the loss of Upe, Biryawaza says (EA 197).", "Rules Ruhizzi in Upe and sides with Aitakama of Qadesh against Pharaoh's land, Akizzi says (EA 53-54, 191, 197)."],
    ["The man of Lapana, who serves Aitakama of Qadesh against Pharaoh's land of Upe, Akizzi says (EA 53-54).", "Rules Lapana in Upe and sides with Aitakama of Qadesh, Akizzi says (EA 53-54, 193)."],
    ["Turned Yanuamma against Biryawaza, took chariots at Ashtartu and gave them to the Habiru, and with Arzawiya is causing the loss of Upe, Biryawaza says (EA 196-197).", "Rules Yanuamu beyond the Jordan and took Biryawaza's chariots with Arzawiya, Biryawaza says (EA 197)."],
  ];

  /** The full history check: no one of 1346 was born at Akhetaten, founded about three years before; they were said to be. */
  function bornAt(name: string, text: string): string {
    return ["Tutu", "Mahu", "Ay", "Nakht", "Panehesy", "Huya"].includes(name) ? text.replaceAll("Waset", "Akhetaten") : text;
  }

  //
  // The fingerprint of the starting characters when every term ended with turn 10, ids left out (taken just before fix (d);
  // the version of this test before then, with the ids in, matched the fingerprint from before terms were staggered).
  // Taken again for save version 7, whose new generator draws every trait and fact anew (build order item 5+), and for save
  // version 16 (item 10: attested envoys' traits from the sources, lovers kept at courts, and 42 more characters), and for
  // save version 19 (item 11a: a template persona's "what you want most" follows the character's strategy; no draw moved),
  // and for save version 23 (item 11+: a pool of 100, the city-states' staff and the Levant's name styles), and for item 11d (three city-states more, each with its servant), and for save version 27 (item 11c: six more
  // city-states, each with its envoy, and Egypt's name style without Gezer's king), and for save version 30 (item 11f: eight
  // more powers, each with its envoy, the name styles of Azzi, Libya and the Shasu, and an Akkadian scribe at each court that
  // reads Akkadian), and for save version 32 (item 11f+: the connections follow the drawn land, so the posts and plants
  // that go by neighbours change), and for save version 39 (item 17++: the governors and commissioners of 1346 in their
  // posts, and the courts they were drawn from given another servant).
  //
  test.each([
    [1, "98322bfa2b6daa67"],
    [7, "b44e646d80657f9f"],
    [42, "40ae77d83494bde6"],
  ] as const)("Starting terms end between turns 7 and 13 and every other draw is unchanged %s", (seed: number, before: string) => {
    let s = newGame(seed);
    // Since item 17++ Pharaoh's commissioners stay at their posts for years: residents, not the starting corps.
    let envoys = s.characters.filter((c) => c.contract !== null && !c.openly);
    // Two for each Great King and one for each city-state (item 11+), Terqa, Mira and Seha among them (item 11d), item 11c's six and item 11f's eight, and
    // since item 11f an Akkadian scribe at each of the 23 courts that read Akkadian; since item 17++ the governors of 1346
    // hold grants, not jobs, and Pharaoh's commissioners are residents in his service.
    Assert.equal(89, envoys.length);
    Assert.all(envoys, (c) => {
      Assert.equal(Rng.for(seed, 0, "start-term", c.id).range(7, 13), c.contract!.untilTurn);
      Assert.inRange(c.contract!.untilTurn, 7, 13);
    });
    // Traits, facts, wages, posts and plants are what they were before terms were staggered.
    Assert.equal(before, people(s));
  });

  test("The starting corps comes up for renewal over several seasons", () => {
    let ends = range(1, 20).flatMap((seed) =>
      newGame(seed)
        .characters.filter((c) => c.contract !== null && !c.openly)
        .map((c) => c.contract!.untilTurn),
    );
    Assert.equal(
      range(7, 7),
      distinct(ends).sort((a, b) => a - b),
    );
    // No game has every starting envoy's term end in the same season.
    Assert.all(range(1, 20), (seed) =>
      Assert.true(
        distinct(
          newGame(seed)
            .characters.filter((c) => c.contract !== null && !c.openly)
            .map((c) => c.contract!.untilTurn),
        ).length >= 3,
      ),
    );
  });
});
