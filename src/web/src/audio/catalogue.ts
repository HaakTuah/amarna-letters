/**
 * The template and the pieces made from it (item 19+++): Empire Earth's eighteen music files are fourteen pieces, four of
 * them in two versions; each of ours takes one's role, mood and pace and nothing of its own. The sources and the readings
 * are in docs/audio/MUSIC.md. Shown on the listening page beside every piece.
 *
 * PLACEHOLDERS: the pieces now rendered are the sound system's working pieces, written to exercise it (each its role,
 * length, phrase ends and variations); the composing proper is the composer's (Haakon, 31 October 2026), who replaces
 * each in scripts/music/pieces.py and renders it again. Set `Placeholder` false when the first real piece lands.
 */
import type { SoundName } from "./situation.ts";

export const Placeholder = true;
export interface PieceInfo {
  id: string;
  title: string;
  /** Empire Earth's piece this one answers, its length there, and how it is read. */
  template: string;
  role: string;
  /** When the game plays it. */
  when: string;
  /** Its tuning, tempo and voices, and where its melody comes from. */
  made: string;
}

export const Pieces: readonly PieceInfo[] = [
  { id: "hymn", title: "The Hymn to Nikkal", template: "Main Theme (3:41)", role: "The main theme: solemn and broad.",
    when: "The first screen, the start page, and the menus.",
    made: "The Hurrian Hymn whole, in nīd qablim on A, 66 a minute: the reed, the voices or the strings sing it over the lyre, three statements rising to the choir and the horns." },
  { id: "kings", title: "The Brotherhood of Kings", template: "Balance of Power (6:18)", role: "Calm: long, stately, unhurried.",
    when: "Peace: the seat's land quiet, no foreign troops in it, no fighting in three seasons.",
    made: "A new theme in išartum on D, 72 a minute: the pipe, the strings or the reed over the lyre's waves and warm strings." },
  { id: "river", title: "The River", template: "Rivers (5:28)", role: "Calm: flowing, pastoral.",
    when: "Peace, alternating with The Brotherhood of Kings.",
    made: "Lines 2 and 3 of the hymn carried into embūbum on F, 60 a minute: the pipe, the recorder or the voices over a harp, lyre or psaltery flowing in threes." },
  { id: "envoys", title: "Envoys", template: "Pawns (4:09, and an alternative)", role: "Rising tension, measured: pieces moved on a board.",
    when: "Unease: foreign troops in the seat's land, troubled omens, a restless province, rumours.",
    made: "A questioning theme in pītum on G, 88 a minute, over a pizzicato walk and the darbuka's maqsum." },
  { id: "shadows", title: "Shadows", template: "Shadows (6:04, and an alternative)", role: "Rising tension, dark and watchful.",
    when: "Unease, alternating with Envoys and Enmity.",
    made: "A low motif in nīš tuḫrim on E, 54 a minute: the low reed, the reed or the voices over tremolo strings, bells and a distant drum." },
  { id: "enmity", title: "Enmity", template: "Emnity (11:04)", role: "Rising tension, the deepest: a war not yet begun.",
    when: "Unease, alternating with Envoys and Shadows.",
    made: "nīd qablim on A, 60 a minute: a heartbeat on the frame drum, a low motif, the strings swelling, kitmum's tritone at the height." },
  { id: "chariots", title: "Chariots", template: "Honor (1:53, and an alternative)", role: "War: martial and noble.",
    when: "War: the seat's troops fought in the last three seasons (in god view, anyone's in the last two).",
    made: "A march theme in pītum on D, 96 a minute: the horn, the reed or the strings over frame drums and darbuka, pizzicato and horns." },
  { id: "battle", title: "Battle", template: "Battle (2:09)", role: "Battle: driving, hard.",
    when: "A battle: the seat's troops attacked or were attacked this season.",
    made: "nīš tuḫrim on E, 126 a minute: a low ostinato, the big drum's gallop, horn calls, the reed or the choir crying above." },
  { id: "siege", title: "Siege", template: "Siege (1:22)", role: "Siege: relentless, short.",
    when: "A siege: the seat besieges a city or is besieged.",
    made: "nīš tuḫrim on C♯, 80 a minute: the ram's knock, the siege rhythm on the big drum, a semitone in the horns." },
  { id: "triumph", title: "Triumph", template: "Arthurian (1:32)", role: "Triumph: bright and short.",
    when: "Once, when the seat takes land or another's capital, then the mood's music again.",
    made: "The hymn's first two lines as a fanfare in išartum or kitmum on D, 100 a minute, trumpets and horns, a march, the sistrum." },
  { id: "fall", title: "The City Falls", template: "Guillotine (1:49)", role: "Loss: sudden and harsh.",
    when: "Once, after the sting, when the seat learns its own capital has fallen.",
    made: "nīš tuḫrim on D, 84 a minute: gong and drums, a falling line on the horn, the strings or the voices." },
  { id: "fallen", title: "Lament for the Fallen", template: "The Fallen (6:47, and an alternative)", role: "Loss: long and elegiac.",
    when: "Once, when the seat learns it has lost land.",
    made: "The hymn's last line and a lament in nīš tuḫrim on E, 58 a minute: the reed, the strings or the pipe, heavily ornamented." },
  { id: "solemn", title: "Solemn", template: "Solemn (0:53)", role: "Mourning: a short chorale.",
    when: "Once, after the sting, when a king falls (the seat's own; in god view, any).",
    made: "A chorale in nīd qablim on D, 52 a minute, the choir and the strings." },
  { id: "last", title: "The Last Seasons", template: "Time (3:31)", role: "The end: reflective, broad.",
    when: "The age's last seasons (the diviners read the omens of the end as grave), and after the age's end.",
    made: "The hymn again, slow, in nīd qablim on A, 63 a minute, over the lyre's measured strokes like a clock." },
];

export const SoundInfo: Readonly<Record<SoundName, string>> = {
  stylus: "The stylus pressed into clay: a letter written.",
  seal: "A cylinder seal rolled: the season's orders sealed.",
  envelope: "A tablet set in its envelope: an answer given to an envoy.",
  gold: "Gold weighed on the scales: a gift, a loan, a fee paid or collected.",
  courier: "A courier's arrival: news or a tablet reached the court.",
  war_horn: "A war horn: the first blow of a war (every seat but Egypt's).",
  war_trumpet: "Egypt's trumpets: the first blow of a war, in Egypt's seat.",
  sistrum: "The sistrum: an omen, a catastrophe, the signs changing.",
  envoy: "A lyre's phrase: an envoy received before the throne.",
  battle: "Drums and bronze: a battle the seat fought.",
  siege: "The ram at the gate: a siege laid.",
  taken: "A rising horn: land taken.",
  lost: "A falling phrase on the strings: land lost.",
  harvest: "Grain poured and a pipe: a harvest.",
  famine: "A low reed's sigh: hunger in the land.",
  revolt: "Quick drums and shouts: a province rises.",
  caravan: "The beasts' bells: a caravan, a sale.",
  death: "One low bell: a death at a court.",
  report: "Clay turned in the hand: a spy's report.",
  season: "One soft stroke and an open string: a season turns.",
  tap: "A fingertip on clay: the interface's touch.",
};

export const StingInfo: Readonly<Record<string, string>> = {
  capital: "A capital falls: gong, drums, a cry of brass and voices (before The City Falls, or Triumph for its taker).",
  king: "A king falls: low gong, dark strings, the choir on one breath (before Solemn).",
  end: "The age ends: the great gong and every voice on the hymn's open fifth (before The Last Seasons).",
};

export const BedInfo: Readonly<Record<string, string>> = {
  nile: "Water: the Nile, the two rivers, the coasts, the sea close in.",
  wind: "Wind: the steppe, the desert, the mountains, the open land.",
  market: "A city's market: the map close in on a town.",
  siege: "A siege camp: a siege in view.",
};
