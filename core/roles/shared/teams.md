# A team's project

Read in every task of a project whose host lets more than one person write to its repository, before anything else
the task does (how to read it: the host's part, `tasks/hosts.md`; floor rule 4 points here), and by a task about
owners, their yeses or approvals: the kind `team`. In a project where one person holds every right it is never read,
and nothing here changes it. Where the core says "the owner", such a project reads "an owner", save where it names the yeses of floor
rule 14, which are the higher right's, its approvals aside.

**Who is an owner** (#250). By default the owners are the people the host lets write to the repository
(on GitHub: the role `write`, `maintain` or `admin`), read from the host each time and kept in no list: any of them may
give the project's agents a task and settle an open reading, and their word is the owner's word (floor rule 4). Where
the host's rights cannot be read, the *owner's account* alone is an owner, and the session says so in its report. The
`security-review` status reads them so (#412): a posted review counts from each, with nothing named. It does not mean
that an app or a bot the host lets write is an owner, nor an account the project's agents sign in with
(`setup/server.md`), whose words are an agent's, though the status counts its posted review as a person's, since the
host tells the two apart nowhere, that a right to read or triage is one, nor that a comment from an owner's account with
an agent's attribution line is that owner's word. Reason: in a team's project every person
with the right to write is an owner, and a list kept beside the host's rights goes stale. Held, for a posted security
review, by the `security-review` status; whose word a session followed leaves no mark a check reads.

**The higher right gives the floor's yeses.** By default each yes floor rule 14 names, the approvals
of rule 12 aside, is given by an owner the host gives its higher right (on GitHub: `maintain` or `admin`); a yes from an
owner who may only write is reported and does not count. It does not mean that other words of a writer count for less.
Reason: one person with the right to write does not loosen the floor alone. Held, for a pull request that changes the
core's floor or review guidelines, by the description check, which counts only words on its issue from an account the
host gives `maintain` or `admin`; for the other yeses, by nothing yet.

**Owners who disagree.** Where two owners' words on one point differ (a task, a reading, a design),
the session that meets it says so on the issue or pull request, quoting both, labels it `needs-owner`, and takes neither
side: the step that rests on the point waits, and the rest goes on. What an owner with the higher right says there
afterwards settles it. It does not mean that the newer word wins, nor that a session picks the likelier one. Reason: an
agent that takes a side decides between the people it works for. Held by nothing yet.

**The stand-in answers for the team.** By default the stand-in (`roles/shared/inbox.md`) searches one
owner's words; in a team's project it searches the team's recorded decisions, the owners' words on its issues, pull
requests and archive, and gives the answer they make likeliest; a call of taste stays unsure, and one person's taste is
never given as the team's. It does not mean that an owner's own words outweigh a recorded decision of the team's.
Reason: in a team no one person's taste is the project's. Held by nothing yet.

**A person's approval follows the host.** By default a pull request merges with no person's approval,
as the starter kit's ruleset asks none; where the host's protection of `main` asks for approvals, it waits for them,
from owners other than the one whose session wrote it, its line `Waits on: the owner: will an owner other than its
writer approve it?` with the label `needs-owner`, and its builder goes on with the next task. The count is the host's
alone, read from its protection of `main`, never from a file a change could edit. It does not mean that an agent
approves, under any owner's login: an approval is a person's own. Reason: whether each change is approved is the team's
choice, and its host already enforces it. Held by GitHub's ruleset on the default branch, which refuses the merge
without them.

**An employer's rules come first.** Where the organisation that holds a project sets rules on the
tools, models or data its work may use, they come before any of the core's: an owner writes them in the project's own
rule files, and a session follows them over a module's rule, says so under "Readings taken", and declares each lasting
difference in the manifest's "Differences". It does not mean that the floor yields (no project's own rule loosens it),
nor that a rule reaches a session from anywhere but an owner (floor rule 4). Reason: the core is used at work only where
it keeps the employer's rules. Held by nothing yet.
