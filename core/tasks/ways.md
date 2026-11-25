# Ways of running sessions

Read by whoever starts a session through a way, hands it a task or reads its state, sets a way up, or runs the staged
cases through one: the kind `way`; the paths `setup/server.md` and `scripts/ways.mjs`. A way is what lies around an
agent tool's session, such as the cloud, a tool that runs the agents side by side on a machine of the owner's, or a
plain terminal; what the tool inside does stands in its own part (`tasks/tools.md`, "Each tool's part").

**A way of running sessions has a part of its own** (#397). By default each way the core is used with has a part
below, under a heading that ends with its name in backticks, which a script takes for it, and says in this order, an
item each: how a task is handed over (*Task:*), how a session's state is read (*State:*), how a review is asked there
and whether the reviewer takes a brief (*Review:*), what the way installs (*Installs:*), and what of the floor it meets
(*Floor:*). The agents inside read the same `AGENTS.md` and meet the same checks, so a part says only what lies around
a session. Whoever adds or changes what the core says of a way writes it in its part, naming a product only as an
example, and "not yet", with its issue, where the core has not read the way's documentation. The one condition that
changes it: a way with no part, which a project names in its manifest's "Tools" table and reports to the core as its
README says. A way is no agent tool: it gets no column in the table of `tasks/tools.md`, and its part repeats nothing
a tool's part or `tasks/reviews.md` says. Reason: the core had one page to set up a machine and a place in the order
of ways, and no word on how a session is handed work, read or reviewed through each. Held, in part, by the tools'
offer (`scripts/tools-offer.mjs`), which a part fails with a label left out or out of order; that each way has a part,
by nothing yet.

**A session's state is read where the way gives it** (#397). By default, where a way reports whether a session is
working, blocked or waiting, the orchestrator reads that first, and writes it, on each wake, into a JSON file of each
lane's pull request number or branch to its state, which it gives `scripts/stalled.mjs` with `--states`: a lane given
there is printed by its state and never judged by the clock. The one condition that changes it: a lane whose way
reports nothing, which is judged by a quiet branch, as `roles/orchestrator.md`, "A stalled lane", says. It does not mean
a session's own word that it runs is a state: only what the way reports is. Reason: a quiet branch says only that
nothing was pushed, and a session working long, or waiting on a review, read as stalled. Held, in part, by
`scripts/stalled.mjs`; that the orchestrator gives it the states, by nothing yet.

**What a way installs is listed** (#397). By default a hook or a setting a way writes into an agent tool's own folder
is named on its part's line *Installs:*, in backticks as the agent-tools check names it (`hook Stop: <its command>`);
"none" where it writes nothing there. The trigger is a part written, or a way found writing what its line does not
name: whoever writes the part, or finds it, names it there in that pull request. The agent-tools check reads those
lines, from the core's copy in a project, and prints each configured hook or setting a line names as installed by that
way, failing nothing for its being unlisted under "agentTools". Nothing changes it. It does not mean the rest of the
check passes it: a hook whose command is not in the starter kit's form fails as any hook does (floor rule 3); nor that
what a way writes outside the project's files is read. Reason: a hook a way writes would read as the project's own,
unlisted, or pass unseen. Held, in part, by `scripts/agent-tools.mjs`, which fails a line *Installs:* in no form it
reads; that a line names all a way writes, by nothing yet.

**The floor, said for each way** (#397). By default a session started through a way is one started, at any depth,
from a session the owner started (floor rules 3 and 18), each in a folder and a clone of its own, and the way is given
no sign-in of another tool's. The trigger is a part written or changed: whoever writes it says so on its line
*Floor:* in plain words, and what else of the floor the way meets. Nothing changes it.
It does not mean a way loosens or adds to the floor. Reason: a way starts sessions that no agent tool's part covers,
and floor rules 3 and 18 name only the sessions the owner starts and those started from them. Held, in part, by the check of
the parts' form named above, as a line *Floor:* is one of the labels; what the way is given, by nothing yet.

**A staged run through each way** (#397). By default the staged cases are run once through each way, with sessions
started through it, and recorded with its name beside the tool and the model (`node scripts/staged.mjs --read <case>
<folder> --record --way <its name>`); `node scripts/staged.mjs` says of each way whether a run through it is recorded.
The trigger is a way with no run recorded: a session that can start sessions through it runs them, as
`tasks/tools.md`, "Proven by the staged cases, tool by tool", says of a tool. It does not mean a way waits for its run
before it is used, nor that its runs change a tool's standing or what holds a release. Reason: the cases had been run
only in a cloud session, so nothing showed that a session started through another way keeps the rules. Held, in
part, by `scripts/staged.mjs`, which records no run whose way has no part and says of each way whether one is
recorded; that the runs are made, by nothing yet.

## The cloud: `cloud`

- *Task:* a session is started in an agent tool's cloud with its brief as its first message, by the owner or by a session
  through the cloud's own tools (such as one that creates a session and one that sends it a message), in a container
  of its own with the repository cloned.
- *State:* the cloud reports each session's state (such as working, blocked, ready for review, completed or failed),
  which the orchestrator gives `scripts/stalled.mjs` as working, blocked or waiting (above); a session completed or
  failed is given none, so its lane, if its pull request stands open, is judged by its branch.
- *Review:* a fresh session started there as a task is, given the review's brief, takes it; the order and each
  tool's way: `tasks/reviews.md`, point 1, and the tool's part.
- *Installs:* none: read on 19 November 2026 in one agent tool's cloud, in a session's own container, where git showed nothing written into
  `.claude/`, `.codex/` or `.kiro/`, ignored files included.
- *Floor:* each session it starts is started by the owner or from a session the owner started, in a container and a
  clone of its own; its environment holds no other tool's sign-in, and no key in its variables (floor rule 1).

## Side by side: `side-by-side`

- *Task:* the orchestrator starts each session through the tool that runs them, from its command line, with the
  session's brief (`roles/orchestrator.md`, "Where the agents run side by side"); the machine: `setup/server.md`.
- *State:* the tool tells the orchestrator when a session's state changes, which it reads and gives
  `scripts/stalled.mjs`; which states it names, not yet: #847.
- *Review:* a fresh session started through it, given the review's brief, takes it; each tool's command stands in its
  part, under *Side by side:*.
- *Installs:* not yet: #847.
- *Floor:* each session it starts is started from the orchestrator the owner started there, in a pane and a clone of
  its own, under the agents' account; it is given no sign-in of its own, each tool keeping its own, a second tool's
  under an account of its own (`setup/server.md`, point 6).

## A plain terminal: `terminal`

- *Task:* the owner starts a session in a terminal, in the project's own folder, and gives it its task.
- *State:* none given: a lane's state is read from its branch (`scripts/stalled.mjs`).
- *Review:* through a plug-in in the session's tool or the host's app, as `tasks/reviews.md`, point 1, orders them;
  whether each takes a brief, its tool's part says.
- *Installs:* none: a terminal writes nothing into a tool's folder.
- *Floor:* each session is started by the owner there, or from a session the owner started, in a folder and a clone
  of its own, on whatever machine the terminal runs; it is given no sign-in of another tool's, each tool keeping its
  own, and on the owner's computer floor rule 8's limits there hold.
