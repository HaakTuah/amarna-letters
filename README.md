# Amarna Letters

A strategy game with no diplomacy rules, set among the seven Great Kings of the Late Bronze Age
(c. 1360–1330 BCE). The engine enforces physics: movement, combat, production and payment.
Every treaty, alliance and betrayal is invented by the players. Kings never speak to each other
directly: every word travels with an envoy who has motives of their own.

This is the prototype described in the design document *Amarna Letters — Prototype Design Document*.
Its job is to test one hypothesis: if communication is delayed, mediated by people with their own
motives, and impossible to verify fully, then norms of trust, reputation and enforcement emerge
on their own.

**Play it in your browser:** <https://haaktuah.github.io/amarna-letters/>

## Run it

You need the .NET 10 SDK.

```bash
dotnet run --project src/Amarna.Web --launch-profile http
```

Then open <http://localhost:5183>, pick a preset, choose whether to watch or take a seat, and begin.

| Preset | Kings | Envoys and spies | Narrator | Rough cost per 20-season game |
|---|---|---|---|---|
| **Free** | Script kings | Script | Template | $0, no key needed |
| **Budget** | Haiku 5.5 | Haiku 5.5 | Haiku 5.5 | under $1 |
| **Standard** | Sonnet 5.5 | Haiku 5.5 | Sonnet 5.5 | about $9 |
| **Showcase** | Opus 5.5 | Haiku 5.5 | Opus 5.5 | about $20 |

Envoys stay on Haiku even in Showcase: they make the most calls, and the design wants fallible
messengers. **Customize the table** sets each king separately (script, human, Haiku, Sonnet or
Opus, for model-against-model experiments), Sonnet envoys, the narrator, thinking effort and the
house rules. The estimates are rough; the meter in the game shows the real spend, and the game
pauses at a spending cap set from the estimate (you can change it).

Model seats use your own Anthropic API key: calls go straight from the page to the Anthropic
API, and the key is never stored outside this tab. Use a dedicated key with a spend limit set in
the Anthropic Console. **Simulate the API** (under Customize) tries model seats with canned
replies; nothing leaves the browser.

Tests and batch runs:

```bash
dotnet test
```

```bash
dotnet run --project src/Amarna.Batch -- --games 50 --seed 1 --verify-replay
```

The batch runner plays games unattended and prints wins by power and the success signals.
With `ANTHROPIC_API_KEY` set it can run model games too (`--preset budget`, or per role:
`--leaders sonnet --characters haiku --narrator sonnet`), stopping at `--budget` dollars; every
such game costs real money. `--no-primer` runs the
customs-primer experiment; `--out logs` keeps every game's log. `--versus solo` measures the
script king against the frozen first version (one king at a time, against six of the old), and
`--versus baseline` and `--focus <Power>` mix the two. Script games run on every core.

Changes go in through pull requests: every pull request builds and runs the tests
(`.github/workflows/pages.yml`), and merging into `main` publishes the browser game to GitHub Pages. To publish the static files somewhere else, such as S3:

```bash
dotnet publish src/Amarna.Web -c Release -o publish
```

The site is `publish/wwwroot`. If it is served from a sub-path, set `<base href>` in its
`index.html` to that path.

## What is in the box

| Project | What it is |
|---|---|
| `src/Amarna.Engine` | The deterministic engine: map, state, orders, validator, adjudicator, economy, envoys, tablets, spies, catastrophes, scoring. Pure C#, no I/O. |
| `src/Amarna.Game` | Seats, character minds and the narrator as interfaces; the runner that records every decision; script kings (temperaments, memory, a look-ahead over likely rival orders) and script characters; signal detection; batch runner. |
| `src/Amarna.Llm` | Claude leaders (Sonnet 5.5 / Opus 5.5), characters (Haiku 5.5) and narrator (Sonnet 5.5): prompts, JSON schemas, parsing, cost accounting, the API simulator. |
| `src/Amarna.Web` | Blazor WebAssembly app: setup, SVG map, human orders and audiences, spectator views, timeline, chronicles, IndexedDB saves. |
| `src/Amarna.Batch` | Console runner for unattended games. |
| `tests/` | Engine tests (adjudication, determinism, envoys, intelligence) and game/model-layer tests against a fake HTTP API. |

## How a season works

1. **Income and upkeep.** Provinces pay gold; troops and servants are paid. Unpaid troops desert.
2. **Arrivals.** Envoys, gold, spy reports and rumours that were on the road arrive.
3. **Audiences.** Foreign envoys deliver their message in their own words; the host answers,
   bribes, hires, detains, seals a tablet or sends gold back. The envoy decides how to respond.
4. **Orders.** Every seat submits secret, simultaneous orders.
5. **Resolution.** Diplomacy-style combat (strength is one plus supports, ties bounce, no dice),
   transfers, purchases, levies, dispatches, intelligence, then seeded catastrophes.
6. **Reports.** News of the season reaches each court the next season.

The winner is whoever grew most relative to their own start. No game ends before turn 15; after
that each season ends the age with a 15% chance.

## Script kings

Without a key, every king is a script king, and a script king also stands in for a model king
whenever a call fails. Each power plays a temperament of its own (Hatti the conqueror, Egypt the
gift-giver, Babylon the proud keeper of the old order, Alashiya the copper merchant, and so on),
varied a little in every game. A script king sees only what its seat sees, remembers who wronged
it and who kept faith, and checks its orders against what its rivals are likely to do by playing
the season out with the engine's own adjudicator. When one king runs away with the game, the
others swear coalitions against him and strike at his land together. The god view lists each
king's temperament under **Standings**.

## Spectator mode

In games without a human, the god view shows everything the engine knows: true map, every
treasury, every character's hidden traits and facts and who knows them, and the **message
trail**: for every message, what the king wrote, what the envoy said abroad, and what the envoy
reported home. Switch to any power to see exactly what it saw. The timeline steps back through
the seasons; signals mark sealed tablets, accusations, forgeries, broken promises and more.
After the game, compare two nations' self-serving annals with the true record.

## Your first live game: a checklist

1. Create a dedicated API key with a low spend limit (a few dollars) in the Anthropic Console.
2. Start with a mixed table: Sonnet 5.5 leaders, script characters, template narrator. Set the
   budget to $3.
3. Watch the cost meter in the top bar for the first two seasons; the per-season figure tells you
   what a full game will cost.
4. Open the **Message trail** tab once envoys start arriving: the gap between what was written,
   said and reported is the thing to look at.
5. If calls fail, the top of the map lists them; each failed call falls back to a script decision
   and the game continues. Export the log (top bar) to keep the prompts and outputs.

See [docs/DESIGN-NOTES.md](docs/DESIGN-NOTES.md) for every decision and simplification made while building.
