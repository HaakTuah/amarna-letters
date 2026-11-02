# The export's stand-in names and its gate

Side lane, 2 November 2026. PR #436, answering #427 and #424. Design: Engine and models, "Logging and replay"
(revision 64); the note is `docs/design/50-the-export.md`; the export's first lane is
`docs/rounds/2026-11-02-export-audit.md`.

## The owner's words

> Yes to everything, expertly!

(2 November 2026, in the design chat, to the design session's takes on #427 and #424, among others; archived as item
153 in `docs/archive/instructions.md`.)

## What was built

- **Stand-in names** (`src/game/src/export.ts`, `NameFields`, `StandIns`). Under the human-words filter, in a game with
  a human seat, a name made up in an order becomes Name-1, Name-2, in the order they first appear, the same name
  (trimmed) always the same stand-in, wherever it appears. A real name stays: an alias the engine offers (`Aliases`), a
  realm's name (`nameKnown`), or one of the game's people's, which the web app's worker passes from the game's state.
  The fields are those of every decision schema that hold a name the engine reads (found by walking the schemas the
  runner records): a pitch's `name` (`MindReply`), a traveller's `goAs` (`LifeChoice`) and a claimed realm
  (`claimName`'s `name`). A model's `goAs` is already held to the alias it was offered by its parser
  (`src/llm/src/character-life.ts`), but a file seat or local agent writes the field directly, and a pitch's `name`
  is free text (`src/llm/src/parse.ts`), so all three are covered at the export.
- **The gate** (`src/web/src/pages/Play.tsx`, `src/web/src/session/client.ts`). "Export log" is in the menu only when
  `canSeeAll` is true (no human seat, "Reveal all" ticked, the game over, or his realm fallen), and `Session.export`
  asks the worker for nothing otherwise, so no other path in the page reaches it.
- **Tests.** `src/game/test/export.test.ts`: made-up names in all three fields become stand-ins, the same across fields;
  an offered alias, a realm's name in any case, and a person's name passed in are kept; a normal export keeps all.
  The canary (`src/web/test/canary.test.ts`): the human seat also claims a realm it made up ("Qirbashtu", now in the
  list of the human's words no filtered export may hold); the filtered export holds `{"type":"claimName","name":"Name-1"}`
  and still replays; and the god-view test now also checks that no export is asked for while the seat has no god view,
  and that one is in each of the three ways it opens.
- README and the design note updated.

## Readings taken

- **A king's claimed realm is one of the fields.** The design names "a false name it declares, the name it goes by at a
  court"; `claimName` holds a name in the same way (the engine reads only one it knows) and a human may type any text
  there, which the filter must leave out ("his letters, notes and the names he typed"). Principle: the filter keeps a
  human's words out wherever they are, and the export still replays.
- **"Replays exactly" as the blanks already have it.** The engine ignores a name it does not know, so every outcome is
  the same; where it echoes the made-up name in a text (a rejected claim's notice, a traveller's journey `asName`), the
  replay holds the stand-in, as it already holds a blank where it echoes blanked words. The canary's replay comparison
  accepts a stand-in where it accepted a blank.
- **Two checks changed because the design forces it, none loosened beyond that.** The canary's `shape` (each text as
  long as it was) now compares a name field as a name, since a stand-in has a length of its own; every other string is
  compared as before. Its `differ` accepts `Name-N` where it accepted a blank. Every other assertion is kept.
- **The gate is in the page.** The worker cannot know "Reveal all" (the page holds it), and the god view is gated in
  the same place; the page is the human's own, so this is the same boundary as the god view's.

## Use against ignore

No script player decides anything new: the export is a tool for the table, not a rule. Nothing to measure.

## Helpers

None: one-pass work in a few files.

## Questions for the owner

None.
