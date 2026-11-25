# A project in several repositories

Read when a project's code is to stand in more than one repository, when a part of it is to be shared with another
project or split off into a repository of its own, and when a manifest's `Core:` line names a path other than `core/`:
the kind `repositories`; the path `scripts/core-path.mjs`. A project in one repository, its core under `core/`, has
nothing here to do.

**The manifest says where the core's copy is** (#285). By default a project's copy of the core stands
under `core/`, as its manifest's `Core:` line says (`copied whole under core/`). Where a repository keeps it in another
folder, that line names the folder (`copied whole under <path>/`), and the sync, the core's checks and the work-saved
hook read the path from it (`scripts/core-path.mjs`), never from a name they assume. It does not mean a project in one
repository changes anything: its line names `core/` already. Reason: every script, check and rule assumed `core/` at
the root, so a repository could hold the core in no other place. Held by `tests/core-path-test.mjs`, and by
`core.yml`, which fails a copy that does not stand at the path the line names (`tests/core-yml-test.mjs`).

**A repository may take the core through a dependency that carries it** (#285). By default each
repository holds a copy of its own, pinned and synced there. Where a library the repository already depends on holds
a copy of the core, the repository takes the core with the library instead: its manifest's line reads
`Core: <the core's address>, carried by <library>/ under <path>/`, the library's folder and the core's folder inside
it, as the library's own manifest names it, and the repository pins no copy of its own. The sync runs in the library
alone; the repository's version of the core is the one its pinned library carries, and its calls to the core's
workflows move to that pin with the library, as `core.yml` says where one differs. The sync and the core's moved issue
do nothing there, saying so. It does not mean a library carries a core it does not copy itself, nor that a repository
edits what the library brings. Reason: a project that splits a shared part into a repository of its own would hold the
core twice, sync it twice and could hold two versions; where several projects share the part, once more for each.
Held by `core.yml`, which reads the pin from the library's own manifest, at the commit the repository holds, and holds
the copy there to it, and by the tests of `scripts/sync.mjs` and `scripts/core-moved.mjs`.

**Before a split, one repository** (#285). By default a part of a project meant to be shared with
other projects stays in the project's own repository, as a system its shape check names (`tasks/code-shape.md`, "Each
project names its systems"), under every rule of that module, until a second project uses it: then the session
whose task needs it there splits it off into a repository of its own, which carries the core for both. The trigger is
a second consumer: a task of another project whose code is to import the part. It does not mean a part is split off
before then, nor that a part no one means to share is named a
system for this. Reason: kept so, splitting it off later is a small step, and a split before a second user exists
buys a second repository to keep. Held, in part, by the shape check, whose baseline keeps what crosses into the system
from growing unlisted; the split's timing, by nothing yet.

**The core's files are in the checkout when a session starts** (#285). By default they are, as the
copy committed at the manifest's path. Where a library carries the core, the session that sets the repository up
brings the library in as its folder committed in the repository, or as a submodule the agent tool checks out, at an
`https` address the checks can fetch with no token, never as files an install writes (a package manager's folder, a
build's output). It does not mean a repository commits the library's files where such a submodule serves. Reason: a session that
cannot find its rules would work with no floor at all, and an install runs after the session has started, when it
runs. Held by `core.yml`, which fails a library that is neither a folder nor a submodule of the commit, a submodule
it cannot fetch at that commit, and a path in a folder named node_modules or .git.

**A session that cannot read its floor does nothing else** (#285). By default a session reads the
floor at the path its manifest names. Where `<path>floor/security.md` is not in the checkout at a session's start, the
start hook says `STOP:` with the mend (in a repository whose core stands elsewhere than `core/`, the hooks are those
`node <path>scripts/core-path.mjs --hooks` prints, which check the floor before they read any script of the core's),
and the session does nothing else until it is mended: it brings the files
in (`git submodule update --init`, where a submodule carries them), or, where it cannot, tells the owner so and stops.
It does not mean a session of a tool with no hook at its start goes on: one that cannot read the floor its `AGENTS.md`
names stops alike. Reason: what a session does before it has read the floor, no rule of the floor holds. Held by
`scripts/work-saved.sh` and the start command `scripts/core-path.mjs` writes (their tests), and by the staged case
`no-floor`.

**Proven tool by tool; until then, a copy of the floor** (#285, #235 and #249). A core a library
carries works with an agent tool once a session of it has passed the staged cases `carried`, in which a session finds
and keeps the floor at the library's path, and `no-floor`, in which one whose floor cannot be read does nothing
(`tasks/tools.md`, "Proven by the staged cases, tool by tool"). By default a repository's floor is the one at its
core's path. Until every agent tool the core names (`scripts/staged-tools.json`) has passed both, a tool that never ran
them counting as not passed, the session that sets up a repository whose core a library carries, and the one that
moves its library, keep a copy of the core's `floor/`, whole, in a folder of the repository's own named on the
manifest's line `Floor copy: <folder>/`, and its `AGENTS.md` names that copy's `security.md` among the files read at
every start. It does not mean any other file of the core is copied, nor that the copy is edited: it
is the library's floor, letter for letter. Reason: until a tool has shown that its sessions find their rules through
a library, the floor stands where every session reads it. Held by `core.yml`, which fails a carried core without that
line while a tool has not passed both cases (the record of the staged cases on the core's own main), a copy that
differs from the floor at the library's pin, and an `AGENTS.md` that does not name the copy; and by the work-saved
hook, which names at a session's start a copy that differs from the floor the library carries.

**What stays with each repository** (#285). By default a project's queue (the *progress file*), its
issues, its audits and its state report stand in its one repository. Where the project is in several, the orchestrator
or the session that works each one keeps them in each repository, the library's included, since they are about its own
code; only the core is taken once. It does not mean the library's queue holds the work of the repositories that use
it, nor theirs its own. Reason: what each holds is about one repository's code, and a queue shared across them would
be read where its lines cannot be built. Held by nothing yet: a repository's queue holding another's work leaves no
mark a check reads.
