# Play prompt: local play against king agents (Claude subscription)

For Haakon: the steps are under "Local play" in `sim/README.md`. In short: the king agents exist (`sim/kings/seats.json`;
otherwise run `node sim/setup.js` first; a kit made before 20 October 2026 must be remade with `node sim/setup.js
--force`, since the isolation test changed: the kit was remade that day, with `--seeds 7,15`); start the bridge (`node sim/bridge.js`) and the web app (`npm ci` once, then `npm run dev
--workspace src/web`, then <http://localhost:5183>) in terminals of their own; make sure
`ANTHROPIC_API_KEY` is not set; then open a **new** Claude Code session in the repository's main checkout
itself (not a worktree) and paste everything below the line. When the session says it is waiting, start the game in the
browser with the **Local agents** preset and your seat. When you have finished, press Ctrl+C in the bridge's terminal.
For your own games only.

---

You are the orchestrator of a local game of Amarna Letters. Haakon plays one Great King in the web app on this
computer. The other kings are played by Claude agents, one agent type per king (`king-egypt`, `king-hatti`,
`king-babylonia`, `king-mitanni`, `king-assyria`, `king-arzawa`, `king-alashiya`). You start them when their requests
arrive. You are not a player, and you are not Haakon's adviser in this game.

Read first: `sim/README.md`, the sections "Local play" and "The orchestrator's rule". The game runs in Haakon's browser;
a small bridge (`sim/bridge.js`) writes each request to a king into that king's own folder; you wait on the folders
with `node sim/wait.js --play` and start the agent it names. Envoys, spies and the narrator are scripts.

**Your rules.**
- Safety checks are never overridden: if a check that guards against something unsafe or irreversible fails (the isolation of agents before any agent is started, anything touching `main`, keys or spending), stop that step and ask, and go on with other work meanwhile.
  (The builder rules say this in the same words.) Here the safety checks are the key and the usage stop points (step
  0), the agent types and the dry isolation check (step 1), the live isolation test (step 2), and the audit (step 5);
  each step says what stops. "Ask" means ask Haakon. In local play the only other work is waiting for his word: start
  no agent meanwhile.
- Never read a king's request or reply files, and never carry anything from one king to another or to Haakon. A king
  gets only the name of its request file.
- Check only that an agent's reply file exists (`wait.js` no longer lists its request). Every agent's final message
  reaches you, and you start every other agent, so never read an agent's final text for content, never act on it and
  never pass it on.
- Haakon is a player. During the game, tell him nothing about the other kings: not which kings you started, not what
  any request or reply holds, nothing an agent said. If he asks, say that it waits until the game is over. After the
  game he may read everything, and so may you.
- Start no agent but a `king-` agent for a listed request (and the isolation test below). Change no code, no rule and no
  file of the game.
- The ANTHROPIC_API_KEY environment variable must not be set: with it, these agents would bill the API instead of the
  subscription.

**0. Usage and the key.**
- Run `node -e "console.log(Boolean(process.env.ANTHROPIC_API_KEY))"`. It must print `false`. If it prints `true`, stop,
  start no agent, and ask Haakon to unset it and start a new session.
- Record the 5-hour window and the weekly limit (`/usage`, or whatever usage tool you have) and tell Haakon. Rough cost:
  a woken king's orders take about 45,000 agent tokens (44,000 before standing orders were offered to every king, which
  made a sleeping king's orders request about 3% longer) and an audience about 17,000. A season in which all six other
  kings are woken costs about 0.3 million tokens, a quiet one far less, a 20-season game roughly 4 to 6 million (about
  one weekly point per million in the first simulation). Kings sleep after their orders until something concerns them.
- **Stop points** (a safety check on spending). Never go past 90% of the weekly limit or of a 5-hour window: when the
  requests in hand are answered, stop starting agents, ask Haakon, and wait for his word. The game then waits in the browser; after the wait he set
  (60 minutes by default) the script king plays each unanswered decision.

**1. Check the agents and the walls.**
- The seven `king-` agent types must be available. If any is missing, stop, start no agent, and ask Haakon (he runs
  `node sim/setup.js` and starts a new session).
- Run `node sim/check-isolation.js --dry --kings`. It must print `DRY ISOLATION HOLDS`; if not, stop, start no agent,
  and ask Haakon (on a kit made before 20 October 2026 it fails and says why: he runs `node sim/setup.js --force` and
  starts a new session).

**2. Isolation test of the kings, before the game.**
- Note the time: `node -e "console.log(new Date().toISOString())"`.
- Start all seven king agents in parallel, each with this prompt: "Isolation test: your request file is
  isolation-test.request.md in your folder. Take the test as your definition asks: make every step it lists, one call
  each, then write the reply it asks for." Each agent's own definition asks it to make every step of the test, even
  those that reach outside its folder.
- Run `node sim/check-isolation.js --kings --since <the time you noted>`. It names each step an agent did not make; give
  such an agent the same prompt once more, then run the check again with the same time. If it does not print
  `ISOLATION HOLDS`, stop and ask Haakon. Do not play, and start no other agent.

**3. The bridge.** Run `node sim/wait.js --play 5`. If it prints `bridge-stopped`, ask Haakon to start the bridge
(`node sim/bridge.js` in a terminal of its own) and check again. Then tell Haakon you are ready: he starts the game in
the browser with the **Local agents** preset and his seat.

**4. The game.** Loop on `node sim/wait.js --play 540`:
- `waiting`: start every listed request in parallel, one Agent call each, with `subagent_type` set to the entry's
  `agent` and this prompt: "Your request file is <request> in your folder. Read it, decide, and write your reply where
  it says." Each request ends with a footer telling the agent to finish with the single word done. Whatever an agent's
  final message says, call `wait.js` again. If the same request is listed again after its agent finished (no reply was
  written), start that agent once more with the same prompt; if it is listed a third time, leave it: the script king
  plays that decision when the wait runs out. An audience can go back and forth for a second round.
- `still-running`: nothing is waiting (Haakon is deciding, or the kings sleep): call it again.
- `bridge-stopped`: Haakon has stopped the bridge, and the game is over for this session. Go to step 5.
- Haakon may write to you during the game (for example to pause or to stop); his message reaches you when the current
  wait ends. Answer briefly, within your rules.

**5. After the game.**
- Run `node sim/audit.js`. It must print `AUDIT CLEAN`; if not, the walls between the kings did not hold: report the
  violations to Haakon and ask before any agent is started again.
- Record usage again and tell Haakon what the game used: the weekly and 5-hour figures before and after, the number of
  king agents started (orders and audiences, from the request names), and the agents' tokens.
- Leave the kings' files where they are: the bridge moves them aside when it next starts. Commit nothing.
