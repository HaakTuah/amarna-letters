/**
 * The rulebook's ROADS AND OUTLAWS part (build order item 11b, "Messengers are errands", "Characters as sellers of news",
 * "Bands are a character's soldiers", "Pirates are bands at sea", "A head rises where men lack one"): who carries letters
 * from abroad, news for sale, and the bands on the roads and coasts. The numbers are read from the engine's data, so the
 * text stays true if they change.
 */
import { BandData, LeaderPace, LetterData, type GameConfig } from "@amarna/engine";

export function roadRules(_c: GameConfig): string {
  const b = BandData;
  return [
    `ROADS AND OUTLAWS`,
    `- Nothing comes from abroad by itself. A spy's report written at a foreign court, or at a post in foreign land, waits there until someone carries it: one of your own people setting out for your court takes it for nothing; a traveller going your way takes it for a small fee you pay when it arrives; after a season, your spy hires a free person standing at that court, half the fee from its own purse and the rest from your treasury on delivery (all of it on delivery, if your record of paying is good); and with nobody to carry it for ${LetterData.selfAfter} seasons your spy carries its reports home itself, leaving its post. A carrier takes every report waiting there for you. A report shares its carrier's road: lost if he is robbed or killed, read by whoever catches him. A spy watching a province next to your own land hands its reports to your couriers. A report's fee unpaid counts against your record.`,
    `- News for sale. Free people note what they see at a court they stand at (troops near its land, what its treasury is said to hold, whom it holds captive or put to death, a siege) and offer it at other courts at a price they set, less as it ages. Your court list shows each offer; order buy_news (the person, the court) buys it, and its land's holders as of then come with it. A seller may sell the same news to your rivals, and a greedy one may make more of it than he saw.`,
    `- Bands. Where loose men gather in their thousands, at least ${b.crowd}, with no troops of the land's holder standing among them, one of them may rise as a chief and gather a band, and so may mutineers, a fallen court's refugees, and a free person poor and long without work who takes to the hills. A band robs its province's purse and stores, falls on travellers, caravans and, with a ship bought in a port, on travellers and ships at sea off its coast; it keeps only as many men as its takings pay and feed, so men join a band that pays and leave one that does not, and an unpaid band turns on its chief. Its chief's share is his own gold. A band moves to richer land, weakly guarded. Your army standing in a province of yours where a band works falls on it each season: it kills or scatters some of its men, may take its chief captive (yours to question, execute, ransom or release), and drives it off; your troops standing there also halve what the loose men and bands take. A band that loses its chief may follow one of its own, or melt back into the loose men; a chief whose band dwindles may give up the road and seek service like anyone, carrying the hidden fact that he rode with the Habiru.`,
    `- The road. People travelling on their own way meet outlaws on the road like envoys do, and are robbed of their purses. A traveller's own experience sets his pace: a seasoned one makes up to ${LeaderPace(100)} in a hundred more road a season, a poor one as much less. People die only of the world's dangers, never of age.`,
  ].join("\n");
}
