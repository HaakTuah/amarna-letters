/**
 * The rulebook's LANGUAGES part (build order item 12, "Languages"): skill buys time, never noise; who is understood where,
 * go-betweens, reading and writing tablets, and learning by living there. The numbers are read from the engine's data, so
 * the text stays true if they change.
 */
import { AllPowers, AtOnce, LanguageData, WorldMap, courtReads, courtSpeaks, land, type GameConfig } from "@amarna/engine";

/** What each court speaks and what its scribes read, from the map data. */
function courts(): string {
  return AllPowers.map((p) => {
    const capital = WorldMap.default.capital(p).id;
    const reads = courtReads(p, capital);
    return `${land(p)} speaks ${courtSpeaks(p, capital)} and reads ${reads.length > 0 ? reads.join(" and ") : "nothing"}`;
  }).join("; ");
}

export function tongueRules(_c: GameConfig): string {
  return [
    `LANGUAGES`,
    `- Words cross a language or wait; they are never garbled. Each court speaks its king's language, and its scribes read and write what the map gives it, most of them Akkadian, the written language of diplomacy: ${courts()}. Everyone, kings too, speaks the languages of where he comes from, and learns those spoken where he lives, quickly at first and slowly near the top, by how long he stays and by a knack nobody can see; standing next to a foreigner teaches nothing. You never see anyone's skill: people say what they speak ("Akkadian (good)") when they stand at your court, serve you or pitch to you, and only results show whether it was true.`,
    `- Being understood. An envoy is heard at a court when he and someone there, the king or a servant of his at court, share a language; the poorer speaker sets the odds each season, at once from fluent (${AtOnce} and up), else about as often in a hundred as his skill, never with nothing shared. A servant who bridges passes the words on faithfully, unless he is in someone else's pay. When nobody understands an envoy at your court you are told so plainly; if he is still not understood the next season, he presents the gifts he carries (they are all you can understand), and what sticks to his fingers is his own choice, with nobody able to argue with him over it. An envoy nobody understands uses a go-between standing there at his posted price, from his own purse. He chooses each season whether to wait (and learn), go home, or go home and say his message was delivered; his king may not learn the truth for a year. The same holds between any two people in one place, and for hiring: terms are agreed only between people who understand each other, so an offer at your court to someone nobody there understands fails, and so does one an envoy carries to someone he cannot talk to.`,
    `- Go-betweens. A free person who speaks two or more languages well posts a price for each message he carries across where he stands (about ${LanguageData.bridgeShare} in a hundred of what he asks for a season's service, at least ${LanguageData.bridgeMin} shekels); an envoy nobody understands uses one at that price from his own purse, and so may anyone dealing with someone he cannot talk to. Or take one into your service (hire, the errand stay) and he bridges for your court as your servants do. A go-between or servant in someone else's pay (a job, or gold handed to him in the last ${LanguageData.paySeasons} seasons, from anyone but whoever pays him for this) may bend what he passes on: soften a threat, inflate an offer, drop a condition. Anyone present who understands both may notice and tell you; otherwise you learn when the consequences come back. He hears every word either way, and can sell it.`,
    `- Composing. You speak your own language, so the envoy you send must take in your words: a servant fluent in it goes at once; a halting one needs seasons longer, unless a servant at your court speaks with both; one who shares no language with you or any servant at court cannot be sent. A tablet goes in a language its receiver's scribes read if yours write it; if not, one of your people who writes such a language (the poorer of that language and yours counting) writes it, more slowly the weaker he is; with nobody, it goes in your own written language.`,
    `- Reading a tablet. A tablet in a language your scribes read is read at once. Any other waits in your archive until someone at your court reads it, you or a servant who knows its language and yours, by the same odds each season; until then you see only its seals. A tablet brought to be sealed that nobody at court can read is sealed, if at all, on the envoy's word.`,
    `- What one hears. An envoy at a foreign court overhears its talk (its treasury, its troubles, its captives) by how well he speaks that court's own language; what he sees for himself he sees in any tongue. People serve and carry letters only where they can be understood: a traveller takes a letter only to a court where someone speaks a language of his. So a court with a rare tongue finds fewer servants and carriers, and years at a court make a man worth more there. Sending a servant to live at a court, as an envoy, a resident or a stay, is also how he learns its language; a detained envoy comes home speaking his hosts' tongue.`,
  ].join("\n");
}
