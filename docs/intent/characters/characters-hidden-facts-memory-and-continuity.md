<!-- Generated from the design document, Characters tab, revision 21 (2026-10-29). Do not edit: see docs/intent/INDEX.md. -->
## Characters: hidden facts, memory and continuity

Every character is data first and personality second: the engine owns its traits and facts, and the narrator writes a persona from them at creation, and again only if his strategy changes. The prototype has 18 characters, serving as envoys and spies. As characters take on more roles (generals, governors, later advisors), the pool grows to about 60 ("How many characters"), affordable because characters sleep until something concerns them ("Characters sleep like kings"), while envoys and spies remain a small cast of known figures people talk about rather than consumables.

**Hidden traits** (0–100, seeded, never shown to players): loyalty, greed, competence, ambition, courage, and an optional sympathy for one foreign court. Skills come on top ("Character attributes for many roles").

**Facts with secrecy levels.** A backstory is a list of discrete facts, each with a level and a record of which courts have uncovered it.

| Secrecy level | Example fact | How it is learned |
| --- | --- | --- |
| Public | Born in Ugarit; served as a merchant | Stated in the character's own pitch |
| Hidden | Owes money to a Babylonian trader | A paid background check, or a spy |
| Deep | Secretly sympathizes with Mitanni | Expensive checks, betrayal, or long observation |

**Memory.** Each character keeps an episodic log of employers, missions, audiences, bribes offered and what it saw. Older entries are summarized so the context stays small. Memory travels with the character, which is why former employees carry secrets.

**Persona prompt.** At creation, the narrator turns traits and facts into a system prompt: name, voice, temperament, motivations. It is stored, and written again only when his strategy changes ("How the strategy is made"), so a character stays the same person unless his circumstances change him.

**A sketch of the record** (TypeScript):

```typescript
type Character = Readonly<{
  id: CharacterId;
  name: string;
  hiddenTraits: Traits;              // loyalty, greed, competence, ambition, courage, sympathy
  facts: readonly Fact[];            // each: text, secrecy, knownBy (set of PowerId)
  personaPrompt: string;             // written by the narrator; rewritten only when the strategy changes
  memory: MemoryLog;                 // episodic, summarized over time
  employer: PowerId | null;
  job: Job | null;                   // errand, fee now and on completion, term
  location: Location;
  reputation: ReadonlyMap<PowerId, number>;
}>;
```

The character's model receives only its persona, its memory and the facts it knows about itself. The engine keeps the authoritative copy.

**Character attributes for many roles.** One shared pool serves as envoys, spies, generals and governors, so a single competence is not enough; a brilliant negotiator can be a poor general. Which skills a character has, and what each governs, is in "What skills cover"; all stay hidden, seeded and engine-owned, revealed only through checks, spies and observed behavior.

