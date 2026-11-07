# The slop audit, part 8: the README's player text

Branch `slop/readme-text`, on the README's split (#781). This lane is "The slop audit" under "Follow-ups" in
`docs/BUILD-PROGRESS.md` (archive item 178), its next kind of text: the README a player reads first. Parts 1-7 are
#558, #585, #605, #730, #749, #764 and #772.

## How it was read

The README was past 50 KB, so its developers' part moved to `docs/for-developers.md` first, in a PR of its own (#781,
Step 0). The fresh reader (Opus, high effort) read the rest whole with the audit's brief. Its worst finds: one bullet
twenty lines long, a principle restated eight times, the scoring explained three times, builders' notes in a player's
page, and two names for one place.

## What changed

The README goes from 46 KB to 36 KB. No rule changes: every sentence that stays says what the game does.

- **Said once.**
  - "A city can win as well as an empire" was explained three times; it is now explained under Winning only.
  - Troops' pay and food appeared in a season's step and again under Armies; they are now under Armies only.
  - The omens are now under Winning only.
  - "Your map is what your court knows" is one paragraph, where it was eight scattered sentences.
  - The courts' "no rules of their own" is said once.
  - The Levant's doubled clause is cut.
- **Walls broken up.**
  - "No province is owned by a flag" is five short points (fear, love, who holds it, nothing thrust on you, armies'
    loyalties), not one twenty-line bullet.
  - The two ways to tax are a list.
  - The map, the season's play, the keys, the export and the music are each a short paragraph.
  - The keys are one line, with the Keys page for the rest.
- **A contradiction settled.** "Storming … takes it at once" against "marching in or storming the walls takes nothing
  by itself": the storm takes the city, and the province follows as the next season begins.
- **Builders' notes moved or cut.** The removed parts sit in the documents that already hold them:
  - the design document's title;
  - the estimate method and the "of"/"born in" rule (`docs/history/`, `docs/design/`);
  - the naming policy and its thirty-five examples;
  - token counts and caching;
  - the local bridge's commands (`sim/README.md`);
  - `--sleep off`;
  - the export's redaction rules;
  - the census display formats;
  - the `play?watch=7` URL.
- **Plain words.**
  - "the lottery winner" and "the boiling pot" are gone.
  - The Tjaty is named the vizier.
  - Envoys are "he", not "it" and "they" in turn.
  - The checklist's "leaders", "script characters" and "budget" now use the game's own names: kings, scripts,
    spending cap, the Trail tab.
  - The Counsel preset says what Sonnet decides.

## Ten lines, before and after

| Before | After |
| --- | --- |
| `This is the prototype described in the design document *Amarna Letters — Prototype Design Document*. Its job is to test one hypothesis:` | `The game is a prototype, built to test one hypothesis:` |
| `… on one scoreboard: each power is judged by its size and by its growth against what powers that started where it did have achieved, so a city that holds its own can win as well as an empire.` | `… all on one scoreboard (see Winning).` |
| `Troops are paid from your treasury and fed from your stores by your standing order (every king starts with one, and may hold back pay or food …; nothing is paid or fed without it), works are kept as you ordered, and troops left unpaid or hungry for long mutiny.` | `Your troops are paid and fed, and your works kept, as your standing orders say (see Armies).` |
| `Then come cessions and gifts, purchases, walls, levies, envoys setting out, hiring, intelligence and seeded catastrophes.` | `Then the rest of the season's orders are carried out, and any disaster strikes.` |
| `Ask a share of the harvest (a third by default), which never squeezes them but lets them hide more …, or an amount of one province, which you get but can judge only by your count` | Two ways to tax, one line each. |
| `**No province is owned by a flag …** Fear is troops standing in it, … (order fold), or disband it.` (twenty lines) | Five short points: fear, love, who holds it, nothing thrust on you, armies' loyalties. |
| `Long games become affordable when model calls scale with events, not with time.` | `A model king sleeps between its orders, which is what makes long games affordable.` |
| `Alashiya, the lottery winner.` / `The Levant, the boiling pot.` | `Alashiya, the copper island.` / `The Levant.` |
| `On a computer every action has a key, after Crusader Kings III's own: Space pauses …` (eleven lines) | `On a computer every action has a key (…); each button's tooltip names its key, and the Keys page lists them all.` |
| `Start with a mixed table: Sonnet 5.5 leaders, script characters, template narrator. Set the budget to $3.` | `Start small: under Customize, make the kings Sonnet 5.5 and leave the envoys and the narrator to scripts. Set the spending cap to $3.` |

## Left for later

- Place names in two forms (Gubla and Byblos) follow the name settings' question, #768: the README now says the period
  names are used and that the menu shows the modern ones.

## Readings taken

- A rule the README summarised in detail (the export's redaction, the sleep triggers) keeps its detail where builders
  read it; the README says what a player meets. Principle: split by meaning, each reader reads only what they need.

Questions for the owner: none.
