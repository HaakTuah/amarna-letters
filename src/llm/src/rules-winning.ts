/** How a king wins, in the rulebook's words: the ending, the opening bonds, par's results, and what counts. */
import {
  AllPowers,
  StartVassals,
  parSummary,
  ageBand,
  bandWords,
  type GameConfig,
} from "@amarna/engine";

/**
 * The ending, in words and without numbers (build order item 6a): kings are told the rule, never its chance, median, cap
 * or the drawn season, so no seat can see a last season coming. A table's median moves the words, in bands with no
 * numbers (item 6b, answering 6a's review).
 */
export function ending(c: GameConfig, omensIn = "in your report"): string {
  return c.openAge
    ? `- This is an open age: it has no end. The game goes on season after season until only one kingdom is left or the table stops it, and the winner is whoever has grown most when it stops.`
    : `- ${bandWords(ageBand(c.endMedian))} Each season your court's diviners read the omens of the end (OMENS ${omensIn}): they darken as the end grows likelier, from quiet to troubled to grave and darker still once the age has run past its usual length, but no sign foretells the season. When the age ends, the record opens: every court may read all that was hidden, who lied, who skimmed, which seals were forged and who served another in secret.`;
}

/** The opening vassal bonds, by overlord, as every court knows them (item 11+, "Opening relations as they were"). */
export function openingBondsLine(): string {
  const by = new Map<string, string[]>();
  for (const b of StartVassals) by.set(b.overlord, [...(by.get(b.overlord) ?? []), `${b.vassal} ${b.tribute}`]);
  return [...by.entries()].map(([o, vs]) => `${o}'s vassals ${vs.join(", ")}`).join("; ");
}

/** Par's results for each starting position, as the rulebook gives them (item 11e): how often it fell, and its survivors' quarters. */
export function parLine(): string {
  return AllPowers.map((p) => parSummary(p)).join("; ");
}

/**
 * Who the kings are and how a power wins: the rulebook's opening, read too by the plan's ({@link planRules}), which has no
 * season's steps to point to.
 */
export function howYouWin(c: GameConfig, fullRulebook: boolean): string {
  // A house rule: the kings read it only in games that use it.
  const sharedVictory = c.sharedVictory
    ? `\n- Shared victory: two powers that sealed a tablet marked as a sworn alliance win together if their score together (each partner's, weighed by its starting strength) beats every other living person's, king or character.`
    : ``;
  // Item 18: a table that rolled the kings' temperaments tells every king so, since a model knows the kings of history.
  const rolled = c.rolledTraits
    ? `\n- The kings' temperaments were drawn for this game: no king, nor any heir after him, is the man the histories describe. Know each by what he does, not by what you have read of him.`
    : ``;
  return `You are playing Amarna Letters, a strategy game set in the Late Bronze Age (c. 1360-1330 BCE), among the seven Great Kings, Egypt, Hatti, Babylonia (Karduniash), Mitanni, Assyria, Arzawa and Alashiya (Cyprus), and the city-states and chiefs between them (Byblos, Amurru, Ugarit, Carchemish and the rest; the Kaska, the Lukka men and the Suteans under their chiefs), every one a power with the same rules and the same goal. The rules enforce only movement, combat, production and payment, and the passage and basing a sealed tablet grants. Every treaty, alliance and betrayal is invented by the players. You play one power: a Great King, a city's king or a land's chief. Your goal is to finish as high as you can: there is one winner, the person with the highest score, king or character, but every place counts, so climbing from eighth to fifth is worth the effort.

HOW YOU WIN
- The final score blends two things, each from 0 to 1. Size: your strength against the largest holding of any living person, which is a realm's. Performance: your strength over your strength when you came to the throne (the opening position's, for the king the game began with), ranked among the results of powers that started where you did (PAR, below): 0.5 at the middle of them and 1 above them all, so a one-city power and an empire perform level. Every person is placed on one scoreboard by his score, kings and characters alike (a character by the gold he holds and what he gained since he came into play, against what the best five characters of each trial game gained), and the highest on it wins, king or character. Your score is measured from your accession: an heir's growth is his realm's strength over what he inherited. If you die, your game is over: you rank below every living person, by what your realm held when you died, and your heir's score is his own. How much each weighs is set for the game; no court can measure where any realm, its own included, stands on either beyond what news, spies and letters bring.
- Strength is the wealth of your realm, reckoned in shekels: ${c.provinceWeight} x what your land produces in a season, plus the gold in your treasury, the gold in the people's purses of your provinces, the grain in their stores and markets (a shekel a measure) and what your own men carry (your troops' grain and their savings, your caravans' grain): what you hold, never what you owe or are owed. What your land produces is a season's share of the year's harvest${fullRulebook ? ` (PEOPLE)` : ``} at the reference price of grain, a shekel a measure, and its mines' gold, each province counted as far as it obeys you. Gold that moves within your land changes nothing: pay spent at home goes into your people's purses, and your sales at your markets draw it back. Food eaten, grain spoiled and gold that leaves your land lower it.
- PAR: how powers that started where you did fared in the trial games used to measure the game, their growth in each, a fall counted lowest of all, so that surviving where most fall scores in itself. Your result is placed among them, between two of them in proportion. For each starting position, how often it fell, and its survivors' growth at the lower quarter, the middle and the upper quarter: ${parLine()}.
${ending(c, fullRulebook ? `in your report` : `below`)}${sharedVictory}${rolled}
- You are a person, like every character: you die only by a cause where you are (put to death by a king who holds you, in a battle your side loses where you stand, in the fall of the city where you are, or on the road), never of age (COMMAND AT A DISTANCE says how likely each is). If another king takes you, by taking the city where you are (storming its walls or by a siege), in a battle or on the road, you are his captive and your fate is his to decide; meanwhile your court, if it was taken with you, loses its treasury to whoever took it and flees by road to the nearest city your realm still holds, ruling in your name from the road ${fullRulebook ? `(step 10 of how a season resolves, below)` : `(as your full rulebook tells)`}. A realm that holds nothing has fallen, and what it owes dies with it; its king, if he lives and did not give it away by sealed tablet, or else his heir, who sets out from where it fell for the court nearest it, is a free man with a claim to its throne that any king may take up by granting him land. If you die, your reign is over: your heir reigns from that season, the next name on your realm's record of the kings who followed, or past it a son or brother, with a third of your standing among your people and soldiers, love and hate alike, and your debts and promises his to honour or not. You may cede your capital only by agreement: a sealed tablet between you and the receiver that gives it ("I give you the land of ...", or his "Give me the land of ..." sealed by you both), and then your own order to cede it. Your whole kingdom passes with it whole, by agreement (its people's regard for each of you stays as it was); your troops disband unless you give them away that same season; and you lose your seat and live on as a character at your old city, a man without a throne whom your new master may employ or set over it as its governor. Take a rival's capital by force and you hold it and the land your troops stand on; take it by agreement and his whole kingdom is yours.`;
}
