# The slop audit, part 7: the interface, the council and the help

Branch `slop/interface`, from `develop` (#772). This lane is "The slop audit" under "Follow-ups" in
`docs/BUILD-PROGRESS.md` (archive item 178), its next kind of text: the web app's own words, its headings, buttons,
hints, help pages, tooltips and the council's advice. Parts 1-6 are #558, #585, #605, #730, #749 and #764.

## How it was read

A Playwright script played Egypt for four seasons in the dev server. It answered every audience and saved the visible
text of each screen with its tooltips and labels: the home page, About, Listen and Keys, the orders (the council
included), the audiences, and the Season, Inbox, Events, People, Provinces and Standings tabs. That came to 124 KB.
The fresh reader (Opus, high effort) read it with the audit's brief and nothing else. The same script, run again on
this branch, gives the "after" column below.

## What changed

- **The council** (`bots/council.ts`, `CouncilSection.tsx`):
  - Each advisor's bent is a short description ("eager for war", "careful of the treasury", "after cheap gains"),
    not a character sheet ("high aggression: …").
  - It sits beside the title once: "The vizier (tjaty), after cheap gains: …", where the title and the archetype were
    each said twice in two pairs of brackets. The button names the advisor by title.
  - "up to 1 foreign troop could strike it" now reads "within reach of one foreign army".
  - The council's introduction no longer contradicts itself ("confidently wrong", "almost certainly sound").
- **Audiences:**
  - A letter from a king who is not a Great King is no longer said to depart from the custom for leaving out
    "brother" and the title, which is the custom for him (`deviations` in `rules/greeting.ts`, given the sender). The
    script kings read the same list, so they no longer treat a city's king as modest for it.
  - The answer's hint no longer says "structured press".
- **The orders:**
  - Envoy travel is one sentence ("two seasons each way to Babylonia, …; one season each way to every other court"),
    from the seat view's own `travelLine`, given the screen's names.
  - The servants' fees read as fees, not "your people's jobs".
  - Debts lose their ids and give their due date as a date.
  - The roads read "Bar the roads to …" and "Open the roads to …".
  - The fees to pay when errands are done fold into one line with their count.
  - Standing orders lose their ids, and their help reads as three sentences, not one.
  - An army's food line is a sentence.
  - The levy counts read "one levy" and "may raise no levies".
  - The grain menu says what its numbers are ("in its market", "for ten measures", "its people's purse").
  - The levy box's hint is one sentence.
  - Vassal tablets sealed before the age began no longer carry a false date.
- **A servant's term** (`termText` in `rules/views.ts`, which models read too) is short ("a job as envoy to Hatti:
  108 shekels, 54 paid, 54 when it is done; term to turn 10"). It names an errand's place by its name, never its id
  ("spy on byblos").
- **The Inbox and Season tabs** drop a kind's pill where the title already says it ("Battle battle", "News from
  nearby notice"), and call a spy's report "spy", not "agent".
- **Standings** names the opening troops' places ("armies in Men-nefer …"), not their ids ("memphis",
  "kizzuwatnawaters"). The rulebook keeps the ids a king orders by. About's sentence on winning is mended, and the
  column no longer says "not growth" a third time.
- **Biographies:** a calling that opens on the same title as the sources' first line is said once ("A general." beside
  "A general of Akhenaten's"). Pharaoh's residents keep their line where the sources already give their post
  ("Sits in Ashqaluna as Pharaoh's commissioner, …").

## Ten lines, before and after

| Before | After |
| --- | --- |
| `The vizier (tjaty) (the Tjaty: cunning and cheap gains: land left unguarded, …)` | `The vizier (tjaty), after cheap gains: land left unguarded, …` |
| `… so they can be confidently wrong … Where all four agree, the move is almost certainly sound.` | `… so they can be wrong and sure of it … Where all four agree, the move is usually sound.` |
| `stands where up to 1 foreign troop could strike it` | `within reach of one foreign army` |
| `Departs from the custom: no "brother"; the sender does not claim to be a Great King.` (a city's king) | (not shown: that is his custom) |
| `Envoys take, each way: Hatti: 1 season; Babylonia: 2 seasons; …` (46 courts) | `Envoys take two seasons each way to Babylonia, Assyria, Kaska, Isuwa, Hayasa, Arrapha and Elam; one season each way to every other court.` |
| `a job whose first errand you name when you send them, for 156 shekels (78 handed over, 78 paid when it is done, as you ordered), by Akhet, 1342 BCE (turn 13); the job ends once it is done at your court` | `a job, its errand named when you send them: 156 shekels, 78 paid, 78 when it is done; term to Akhet, 1342 BCE (turn 13)` |
| `Debt d1: 3 minas 20 shekels left to repay by turn 4` | `3 minas 20 shekels still owed, due by Akhet, 1345 BCE (turn 4)` |
| `Close to Hatti` | `Bar the roads to Hatti` |
| `Battle battle` | `Battle` |
| `armies in memphis (6000 men), akhetaten …, a fleet of 1000 men in delta` | `armies in Men-nefer (6000 men), Akhetaten …, a fleet of 1000 men in Ta-Mehu` |

## Left for the owner, or for later

- **Season against turn, minas against shekels:** #775, a `question` issue with the reading taken (as built).
- **Realm names beside place names** ("at the court of Byblos · a job as spy on Gubla", "on Carchemish" in the toll
  menu): the name settings' question, #768.
- **Kept:** one key (F1) opens whichever of the seat's tabs is current, as the keys PR (#753) built it. The Listen
  page's instrument lists stay: they are a reference page.

## Readings taken

- A rulebook line a king orders by keeps the ids ("armies in memphis"); a screen a person reads gives names. Principle:
  "Requests are rules too" for the model, plain names for the player.
- A city's king leaving out "brother" and the Great King's title keeps the custom, so it is not listed as a departure.
  The script kings, which read the same list, no longer take it for modesty. Principle: no description left untrue.

## Tests and benchmarks

See the PR.

Questions for the owner: see the PR.
