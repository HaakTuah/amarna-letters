## File seats and the agent simulation

A file seat (`--file-seats DIR|map.json` in the batch runner) is a model leader seat whose
"model" is a pair of files. It writes exactly what a model king would get (rulebook, customs
primer, identity, the season's view, journal and JSON schema) to `<folder>/<key>.request.md`, and
waits for `<key>.reply.json`. The engine validates the reply like anyone's. Because no API enforces
the schema here, the file seat checks the reply's types and enum values itself (missing fields are
read as empty, as "none"), and forgives a code fence or a stray line around the JSON. A reply that
is unreadable, breaks the schema, or stays empty gets one retry request saying what was wrong; a
second failure, or `--file-timeout` (120 minutes), falls back to the script king, as for models.
Each exchange is logged as a call with no tokens, and replays are exact. File seats sleep after their orders, as model seats do.
Requests and replies left in a folder by an earlier game are moved aside when a new game starts.
Only a file seat's request ends with a footer for the agent answering it (`Footer`):
its final message must be the single word "done", and earlier reply files cannot be read, so its
record of earlier seasons is in the request. A model king called through the API never sees it.
The request is headed "# Your decision" (`Heading`), not with the call's key, which holds the season as an id
and a person's id ("t2/aud/present/c7"): since the fix pass after item 4 ("Requests are rules too") nothing a king or
character reads offers it an internal id to repeat. The key stays the file's name, which the kit needs, and the log's.
The request prints the schema indented, but with each field (an object that holds no other object:
its type, enum and description) on one line, and without escaping apostrophes
(`readable`): the same schema, 14,681 characters in 219 lines for the orders schema
with sleeping seats on, against 21,361 fully indented, and no line longer than 414 characters, well
under the 2,000 past which an agent's file reader cuts a line (a one-line compact schema would be
cut). The schema itself grew with Part D's schedule and standing orders, which repeat the unit and
other-order shapes (standing orders' copy without field descriptions): 12,134 characters compact
with sleeping seats on (schedule 3,041, standing orders 1,949), 5,560 off. Part E's notes, summary
and ledger fields added 1,000 of those characters (on or off) and Part G's wording of the wake
triggers 68 (on only); before them it was 11,066 on and 4,560 off, and 13,502 printed in 205 lines. Sharing the shapes through
`$defs`/`$ref` would cut that further, but is not done: it is untried against the API's structured
output, and the file seat's own schema check would have to follow references. Since the fix pass after item 4 the
orders schema has no `sleep` field (no season named, no triggers of the seat's own): with sleeping seats on it is 10,933
characters compact (12,134 before) and 13,202 as a file seat reads it (14,681 before); the rulebook grew 309 characters
(30,579 to 30,888, sleep on, with the primer) with the sleep paragraph, the threats that wake a king, standing orders
answering a move as it is made and orders for new levies.

**File characters** (`--file-characters DIR|map.json`, item 4) do the same for envoys, spies and candidates: every
decision a model character makes (its speech abroad, each reply at an audience, its report home, a pitch, a spy's
report and a memory summary) is written as the exact request a model character gets (`LlmCharacterMind`: the shared
character system text, its persona, facts and memory, the situation and the schema), with the same footer, to that
character's own folder, and the reply is checked like a file seat's. A request says "Decide as yourself" where a king's
says "Decide as the king". A missing or unreadable reply (one retry, then `--file-timeout`) falls back to the script
character for that decision and is logged as a failed call. Replies are logged as decisions, so a game replays exactly
without the files. Which characters: every character in the seed's pool, because any of them can be hired, sent as an
envoy or posted as a spy, and the pool is fixed when the game is made (18 characters, `GameConfig.characterPoolSize`;
nothing adds one later). `--list-characters` prints a seed's pool (id, name, origin and how it starts, no traits or
secrets) for the kit. A map names a folder per character id and carries `"seed"`: ids are numbered by the game's own
counter and differ from seed to seed, so a map made for one seed is refused for another. A character left out of the
map is a script character; city-states stay scripts and the narrator stays the template. File characters do not mix
with `--characters haiku|sonnet`.

**The script's shadow.** For each decision a model character makes, through the API or as a file character, the runner
also logs what the script mind with the same traits decides in the same situation (`ShadowDecision`, a `"shadow"` line
in the log). `ScriptMind` draws only from streams keyed by seed, season and character (`Rng.for`), never from the
game's own generator, and changes nothing it reads, so the shadow changes nothing: a test plays the same game with and
without it and gets the same state and the same decisions. The shadow line holds the character's traits, what it faced
(gold carried, a gift or a post offered), what the engine knows happened that a report should not hide, and both
decisions with what `CharacterChecks` found in their words. The situation is the one the model's own earlier choices
made (the host answered the model's words), with one exception since the fix pass after item 4: a report's shadow is
written, and checked, against what the script itself chose at that audience, the gold it would have kept (and the
forged inventory that would have hidden it) and the gift it would have taken or refused, with what the host asked for
it (`LlmCharacterMind.scriptSituation`). Before, it inherited the model's: in the second agent simulation a gift the
script had refused was flagged as hidden in its report. A script envoy's report claims a seal ("He sealed the tablet,
and I bring your copy") only when the engine recorded the sealing (`SealedOutcome`); it used to claim one
whenever any outcome held the word "sealed", which in the shadow included the model's own commitments ("Nothing
sealed"): 11 false seal claims in that simulation. The checks read words, not meaning: a report "hides" a gift
the envoy took if it never speaks of gold or a gift given to the envoy itself, a detention if it never speaks of being
held, gold kept on the way out if it never owns up (saying what it kept, or that it kept something "for myself"; "I saw
for myself" owns up to nothing), a threat to its lord if it carries no threat at all, an offer of service it declined
if it never mentions service; it "contradicts" the engine if it says the king sealed when the engine recorded no
sealing (`SealedOutcome`). Since the fix pass after item 4, a sentence claims a seal
(`CharacterChecks.claimsSeal`) only if it tells of a sealing: each "sealed" or "set his seal" is read in its clause,
and not counted when denied there or right after it ("I sealed nothing", "Nothing is sealed", "Neither king sealed"),
when still to come, wished for or supposed ("it will be sealed", "he asks that it be sealed", "if he had sealed"), when
it names a sealed thing ("a sealed tablet", "our sealed peace", "in sealed bags", "the oath sealed before Shamash"), or
an earlier sealing ("stands as sealed", "the tablet we sealed in turn four", "the friendship we sealed (k27)", "Egypt
keeps the tablet he sealed", "the tablet we sealed stands"); the first reading counted all of these, 8 false alarms on
the models' reports in the second agent simulation. Read again with the new reading, those reports raise one flag, a
real error ("He received me kindly and sealed his answer in friendship", when nothing was sealed). Sentences
end after a closing quote too (`TextKit.sentences`), so a quoted denial no longer hides a claim after it. A speech
abroad "softens" a threat to the host if the letter had one and the speech has none. A spy "passes
on" its secret masters' words if most of their longer words are in its report, and "leaves out" an observation if fewer
than half of its names, numbers and longer words are. An invented promise or a false account of a king's mood passes
the checks, so a reader confirms the flagged reports. The batch runner prints the comparison after the seat report
(`characterReport`: gold kept and its size, inventories swapped, gifts and posts taken or refused,
commitments, each flag, spies, pitches, and the same per character), and the size of every kind of request
(`callSizes`: file requests in characters, and tokens at 3.6 characters a token; API calls by their input
tokens). A file request's length is logged with its call (`ModelCall.requestChars`).

`sim/` holds a kit that plays a game with one Claude Code agent per king and, since item 4, one per
character, with isolation enforced by construction, not by instruction: see `sim/README.md` and
`docs/SIMULATION-PROMPT.md`. Starting values for the first experiment, all settings rather than rules:
seed 7; `--max-turns 10` (the game stops after season 10, whatever the random end; the kings are not
told, and their rulebook still says no game ends before turn 15); `--sleep-cap 6`; script characters
and the template narrator; kings on Sonnet 5.5, the design's default leader model. For the second
(item 4): seeds 7 and 15, ten seasons each, sleep on with the default hidden cap (12); kings on
Sonnet and characters on Haiku, the design's defaults ("Every model is the table's choice"); every
character of each seed's pool is a file character with an agent of its own (`setup.js --seeds 7,15`
makes 36, named `char-` and 8 random hex digits, with the same guard as the kings); city-states and
the narrator as before. `check-isolation.js --dry` checks the walls without starting an agent, by
running each agent's own hook on the isolation test's steps; the live test still runs first in the
playing session. `stub-replier.js` answers requests with the plainest valid reply, to prove the
plumbing without model calls (with `--sieges`, since the script players' audit of the siege package, its kings also
besiege, march armies into free walled cities, sally and fortify, read from their view, to prove that file seats can give
the siege package's orders). `audit.js` allows an agent in play to read only the request file its
prompt named, since a character could otherwise open an older or newer request of its own and learn
what has happened since the season it writes of (a debrief, which names earlier requests to reread,
may read any of its own); until item 4's review any request file in its own folder passed. The
simulation's live isolation test, like local play's, counts only what was logged from the time noted
before it (`--since`). Since the fix pass (20 October 2026), each agent's own definition asks it to take
the isolation test and make every step: in the second simulation every agent declined the steps outside
its folder, because its definition said never to try them and the test came only as a request and a
prompt. The live test finds each step's own call in the guard log, so a step reported but never made
fails it (`sim/isolation.js`; `sim/README.md`, "The isolation test"). The walls are unchanged. The real kit was
remade the same day (`setup.js --seeds 7,15 --force`), and `--dry` holds on it. Two builder rules of that day reach
the kit. The start prompts an orchestrator reads (`docs/SIMULATION-PROMPT.md`, `docs/PLAY-PROMPT.md`) repeat the
safety-check rule in the builder rules' own words ("Safety checks are never overridden: …"), and their stop rules
follow it: a failed dry check, isolation test or audit starts no further agent, and the key and the usage limits stop
the starting of agents, while work that starts no agent goes on. And every debrief, for kings and characters alike,
asks "What did you find most and least interesting about playing this role?" (a role an agent finds dull probably has
too few real choices): `sim/write-debriefs.js` writes the debrief requests, with that question as the reply's
`interesting` field and the game requests' footer (a test checks the footer is `Footer` word for word).
No model game is run until the build order is done and Haakon asks.

**Local play on a Claude subscription** (item 4). A fourth way to play, for the developer's own games: the web app,
run on this computer, with a human seat against kings played by the same guarded king agents, answered in a Claude Code
session on the subscription instead of through paid API calls (`sim/README.md`, "Local play"; `docs/PLAY-PROMPT.md`).
A king set to `"LocalAgent"` ("Local agent") is a model leader seat whose asker is a `BridgeExchange`: a file
seat whose files are written by the local bridge, `sim/bridge.js`, since a web page cannot write files. The page builds
the request text itself (`FileExchange.request`, with a one-off mark where the reply's path goes) and posts it with the
king's name and the request's file name; the bridge, which alone knows the folders (`sim/kings/seats.json`), puts the
reply path in and writes `<name>.request.md` into the king's folder, and the page asks it every second for the reply
until it comes. The reply goes through the file seat's checks, one retry and fallback (`converse`, shared
by both); after the table's wait (`SeatChoices.localAgentMinutes`, 60 minutes by default) the script king stands in for
that decision, and a request that times out, or whose game is stopped, is taken back (moved aside by the bridge), so
that no agent is started for it later. Each exchange is logged as a call with no tokens ("local agent"), so a game
saves, continues and replays like any other; a saved game reads its local agent kings back from the header's labels.
Local agent kings sleep like model kings, so usage follows events. They need no key and cost nothing in the game's
meter. The bridge listens on 127.0.0.1 and ::1 only, checks the Host header, answers only pages served from this computer
(an `origin` of localhost, 127.0.0.1 or [::1]; requests that change anything must be JSON, which a page elsewhere
cannot send without asking first), and accepts only the seven kings and request names of the game's own form. The web
app offers the "Local agents" preset (`Presets.Local`, not in `Presets.all`) and the "Local agent" choice only when it
runs on a loopback address, so the published site never shows them; a saved local game continued elsewhere says that it
needs the bridge. The orchestrator waits with `wait.js --play`, which watches the kings only and ends when the bridge
stops (`sim/kings/bridge.json` gone or its process dead); `check-isolation.js --kings --since <time>` checks the
kings' live isolation test of that session alone. Envoys, spies and the narrator are scripts in local play. Settings,
first guesses: the bridge's port 5190, a poll every second, the 60-minute wait, and an empty reply handed back after
5 seconds as the batch runner's file seats do.

