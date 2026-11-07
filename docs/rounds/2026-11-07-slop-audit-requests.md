# The slop audit, last part: the requests that make models write

Branch `slop-audit-requests`, from `develop`. This lane is "The slop audit" under "Follow-ups" in
`docs/BUILD-PROGRESS.md` (archive item 178), its last kind of text: the requests that make models write (personas,
letters, envoys' words). The lens is "Requests are rules too" in the builder rules: no stock phrasing a model would
echo back, and no line that implies something untrue.

## How it was read

Three games were played with the stand-in replier (`SimulatedApi`, no model and no cost), six to ten seasons each: all
kings, characters and narrator on models; script kings with model characters; and half the kings on models. Every
request was recorded, about 1,800 of them, and one of each of their 22 kinds was kept as a game prints it. The
rulebook and the kings' seat view, already audited (#730, #749), were left out. A fresh reviewer (Opus, high effort)
got that text and the audit's brief, and nothing else, and listed its 25 worst lines.

## What changed

- **One voice for every character, gone.** Every template persona ended "You speak in the formal manner of a royal
  messenger of the Late Bronze Age", bandit chiefs and the chief of the Medjay included. The shared system text said it
  again. Now each persona's voice line follows its courage and ambition (`Personas.voice`, five lines), and the shared
  text says "in your own manner".
- **Contradictions taken out.**
  - A low-greed character read "indifferent to riches", and two lines later "Your goal is wealth". The low band now
    reads "careless of small sums".
  - The steady strategy said "never risking it all on a gamble", and some steady characters then read "You take the
    bold road". The road now says the risk on its own.
  - An envoy home from a mission whose service had ended was told "He dismissed you while you were away", even when
    his job had simply been done. Now: "You no longer serve him".
- **No internal clause ids shown to a character.** An envoy read its letter's clauses as `1. wellWishes; 2. gift (gold
  20)`, and could repeat them in its speech or report. It now reads the clauses in the words of the letter, quoted and
  numbered, as it recites them. This covers the clauses it recites, the tablet a host offers it to seal and the
  answer it reports. A king still reads clauses by their kinds, since he answers in kinds.
- **No examples for a model to copy.**
  - The narrator's inquiry report quoted one model line ("Former merchant in Ugarit. Left debts behind.").
  - The persona request gave two sample characters and two sample experiences in brackets.
  - The narrator's system text listed five gods for every land.
  - The annals request named the same three excuses for every king and named the Battle of Kadesh, fought two
    generations after the age.

  Each is now described rather than shown: "plain sentences, as a court's record would set it down"; "the gods of the
  lands concerned, never one list of gods for every land"; Kadesh's tone with "never name that battle"; setbacks
  explained "only by what the events below give".
- **Said once.**
  - Every character request gave the goal formula twice, once in the shared text and once in its own block.
  - Every template character listed its secrets twice: in the persona and again among its facts.
  - A king's court request repeated the gold paragraph once for each envoy, seven times in one request.

  Each is now said once. A persona holds no facts; the facts come beside it, the public ones and then the secrets "you
  keep secret and do not volunteer". The narrator's persona request now says so, and says what Hidden and Deep mean.
- **Smaller fixes.**
  - The kings' phrasing call no longer gives every ruler "courteous, formal, brief". He speaks "as this ruler would
    speak by his rank".
  - The persona request no longer asks the narrator to "give them a name" it was already given.
  - "1 seasons away" became "1 season away".
  - A new band's chief no longer reads "Your men cost about 0 shekels' worth a season". Until its first season it is
    given what its men cost by their number.

No rule, number or engine outcome changed. Script games do not read these texts, so no seed moves and no save
version is needed.

## Ten lines, before and after

| Before | After |
| --- | --- |
| You speak in the formal manner of a royal messenger of the Late Bronze Age. | You speak plainly, even to kings, and do not soften hard words. (bold) / You speak softly, with many courtesies, and take care never to give offence. (timid) |
| You are … indifferent to riches; … Your goal is wealth | You are … careless of small sums; … Your goal is wealth |
| Like everyone of the age you play for your own fortune: gold is your security and your own victory, and the richest are counted at the age's end, the dead below every living man. | Like everyone of the age you play for your own fortune. (The goal is said once, in the character's own block.) |
| Keep speeches to a few sentences, in the formal manner of the age. | Keep speeches to a few sentences, in your own manner. |
| The letter's clauses …: 1. wellWishes; 2. gift (gold 20). | The letter's clauses …: 1. "May it be well with you, with your house, …" 2. "As a greeting-gift I send you 20 shekels of gold." |
| He dismissed you while you were away, so he is no longer your lord, but you report to him on the mission he gave you. | You no longer serve him, but you report to him on the mission he gave you. |
| …two to five sentences, like "Former merchant in Ugarit. Left debts behind." | …two to five plain sentences, as a court's record would set it down. |
| …the gods Shamash, Amun, Marduk, Teshub and Nergal | …and the gods of the lands concerned, never one list of gods for every land |
| The model is the Battle of Kadesh, … blame setbacks on treacherous enemies, faithless messengers or the testing of the gods | Take the tone of the accounts of the Battle of Kadesh, … but never name that battle … explain away each setback only by what the events below give. |
| in the voice of the Amarna letters: courteous, formal, brief. | in the manner of the Amarna letters, as this ruler would speak by his rank, and briefly. |

## Readings taken

- **Kadesh stays as the tone** ("Chronicle tone" in the voice of the age says it sets the tone, not the setting): the
  request keeps it and now forbids naming it, so the annals cannot carry an anachronism.
- **A king keeps clause kinds** where a character now gets words: a king answers by clause kind in his reply schema, so
  the kinds are his data, as "the data a model is given" keeps "%" (archive item 232). A character's reading becomes its
  speech, so it gets the letter's words.
- **A template persona saved before this change** keeps its old voice and secrets lines (personas are written once and
  kept), so an old save can show a template character its secrets twice. New games do not. Rewriting stored personas
  would need a save version for text only. That cost is not worth it.

## Left for others

These findings are outside this lane, or already filed:

- **The script kings' letters.** Small rulers complain of not being called Great King: that is #777's ground. Some
  powers have one signature line in every letter ("Ashur set me on my father's throne."): that is the letters' guard
  (#558). And every script oath reads "By Shamash, Amun, Marduk and Teshub", as
  `docs/design/07-script-kings/07-coalitions-and-defence-pacts.md` sets it.
- **One place under several names** (Beirut and Biruta, Karduniash). This is the game-wide decision still open under
  the audit's entry and in #768.
- **The cast's facts written in the third person, and "once a lord of Akshapa" beside "Rules Akshapa".** These belong
  to the biographies (#764, #765, #766).
- **A mission's fact says "came home with the answer"** even when the envoy was never received: filed as a bug, #784.

## Checks

`scripts/test.sh` passes. The tests that pinned the old persona lines now pin the new ones, with a new test that no two
template tempers share a voice line and that facts are not repeated.

Questions for the owner: none.
