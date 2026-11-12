# Playing with Claude

The presets, what a game costs, how a model king sleeps, and a first live game.

Pick a preset, choose whether to watch or take a seat, and begin. Any seat can be yours: one of the seven Great Kings, the
advised start, or a small state's (Rib-Hadda's Gubla, a chief's land), which is harder: few men and little gold beside the
Great Kings' armies, and Great Kings near, but it can win (see [Winning and the end of the game](03-winning-and-the-end.md)). A model can take any seat as well (Customize the
table).

| Preset | Kings | Envoys and spies | Narrator | Rough cost of a game |
|---|---|---|---|---|
| **Free** | Script kings | Script | Template | $0, no key needed |
| **Budget** | Haiku 5.5 | Haiku 5.5 | Haiku 5.5 | about $9 ($5 in the background) |
| **Counsel** | Haiku 5.5, with Sonnet 5.5 writing each king's plan once a year and deciding what the king refers to it | Haiku 5.5 | Sonnet 5.5 | about $90 ($55 in the background) |
| **Standard** (recommended) | Sonnet 5.5 | Haiku 5.5 | Sonnet 5.5 | about $110 ($65 in the background) |
| **Showcase** | Opus 5.5 | Haiku 5.5 | Opus 5.5 | about $180 ($105 in the background) |
| **Local agents** (this computer only) | Claude Code agents | Script | Template | your Claude subscription, no key |

The costs are the start page's rough estimates for a game of the usual length (about 80 seasons). The meter in the
game shows the real spend, and the game pauses at a spending cap set from the estimate, which you can change.

Envoys stay on Haiku even in Showcase: they make the most calls, and the game wants fallible messengers.
**Customize the table** sets each king separately (script, human, Haiku, Sonnet or Opus, or a local agent when the app
runs on your computer), Sonnet envoys, the narrator, thinking effort and the house rules.

Model seats use your own Anthropic API key: calls go straight from the page to the Anthropic
API, and the key is never stored outside this tab. Use a dedicated key with a spend limit set in
the Anthropic Console. **Simulate the API** (under Customize) tries model seats with canned
replies; nothing leaves the browser. Calls are kept under your account's limit on calls in flight, and one refused
or overloaded is sent again after a wait before a script stands in. **Play in the background** (under the estimate)
sends each phase's Anthropic calls as one batch to Anthropic's batch service, at about half the price; answers take
minutes or more, so seasons pass slowly, and you may close the page and continue the saved game later (with the box
ticked and the same key) to collect them. The setup shows what a season costs both ways. When a model call fails, a script king or character makes
that decision instead, the failure is listed at the top of the side panel, and the game goes on.

**Local agents** is for your own games on your own computer: you take a seat, and the other kings are Claude Code
agents in a session on your Claude subscription. It appears only when the app runs on your computer; the steps are
under "Local play" in `sim/README.md`.

## Sleeping seats

A model king sleeps between its orders, which is what makes long games affordable. While it sleeps the world goes
on: its troops hold, the orders it gave for later seasons are carried out, and its standing orders answer a blow in
the same season. It never chooses when it wakes; it is woken when something concerns it: an envoy at the door, foreign
troops in or next to its land, land or troops lost, an order that failed, a servant giving notice, or a ransom
demanded. Everything else waits for it in a summary, and it is woken anyway after a long sleep. Script and human kings
play every season, and Customize can switch sleep off so every king is asked every season.

## Your first live game: a checklist

1. Create a dedicated API key with a low spend limit (a few dollars) in the Anthropic Console.
2. Start small: under Customize, make the kings Sonnet 5.5 and leave the envoys and the narrator to scripts. Set the
   spending cap to $3.
3. Watch the cost meter in the game's header for the first two seasons; the per-season figure tells you
   what a full game will cost.
4. Open the **Trail** tab once envoys start arriving: the gap between what was written,
   said and reported is the thing to look at.
5. If calls fail, the top of the side panel lists them; each failed call falls back to a script
   decision and the game continues. Export the log (the ⋯ menu) to keep the prompts and outputs.
