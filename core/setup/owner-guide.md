# Owning a project on the core

For a person who owns a project that takes this core, read once, in a few minutes. It says what you are taking on and
what you will be asked; it holds no rule of its own, and where it points, the rule there is the one that stands
(`README.md`, `floor/security.md`).

## What the core does for your project

It is the set of rules and checks your agents work by, so that you write none of them and every project that takes it
works alike. It sits in your repository as a copy under `core/`, beside a few files of your own: a manifest, your rule
files and the workflows that call the core's checks (`README.md`, "How a project takes the core", says how the copy is
kept and pinned). Your agents work in branches and pull requests; `main` changes only by a merged pull request whose
checks have passed, never by a push (floor rule 12). Nothing in the repository, a pull
request or a log holds a secret or anything personal about you (floor rules 1 and 11).

## What it will ask of you

A few yeses, and nothing else; everything else your agents decide on the best reading and say in the pull request, where
you can correct it (floor rule 14, `roles/shared/inbox.md`). A yes is asked for:

- a step that cannot be undone, or that spends money beyond what you set aside;
- a package you want that is under a licence off the allowed list, or one whose licence only a person can read
  (floor rule 10);
- a change to the floor or the review guidelines, which needs your yes in its pull request, and a change to the files
  that run by themselves or hold the rules where your project names no builder to make it (floor rule 3);
- a difference from a module's rule in your project, which only you may give (`README.md`, "How a project takes the core",
  point 7).

A step only you can do, such as a setting on your account, is reported as an issue labelled `needs-owner` and waits for
you alone; the work goes on without it.

Besides the yeses, one issue asks you a word a month, "The blind sample": ten changes merged the month before, drawn at
random and shown by their diffs alone, each for a "yes" or a "no" (`README.md`, "What the core is for"). Nothing waits
on it, and a month you skip is only reported as not answered.

## How to stop the agents

Create a branch named `agents-stop` on your repository, from any device. Every agent reads it at its start and before
each commit, and stops. Delete the branch to let them go on. It stops only that repository's agents
(`roles/shared/work-flow.md`).

## What it costs

- **A sync at each release.** If your project is not the core owner's, it takes the core only from a release the core's
  owner cut. Your agents then open one pull request that moves the copy forward, merged by hand, and, each in a pull
  request of its own, the few steps the release asks, listed in the sync pull request's description with what each
  costs (`README.md`, "How a project takes the core"; `AGENTS.md`, "A release says what it asks, step by step"). You may
  reorder or slow them. A release that changes nothing your project takes asks no sync, one release at a time.
- **The checks on every pull request:** that the copy is exact, that no personal term and no licence off the list gets
  in, that the copies and sizes are held, that the description has its headings, and the security and code reviews
  (`README.md`, point 5 of "How a project takes the core").
- **Billed minutes.** On a private repository on GitHub's free plan each job costs a whole minute, and Actions stop once
  the month's are spent. A release adds no billed job to a project, and the job of the security-review check, which runs
  most often, is skipped there unless you turn it on; the other checks there run once a pull request is ready, not at
  each push to a draft, so a draft shows no check until then, and as one job, with `personal-terms` beside it: two jobs a
  push where there were four or five (`README.md`, "A private repository"). Where your ruleset requires a check by the
  name of one folded into that job (`copies`, `pr-description`, `signatures`, `nuget`), take the name out of it when
  your project takes the one job; `core / core` still reports. Requiring `core / core` does not hold which checks the
  call names: a pull request that takes an input out of `.github/workflows/core.yml` still passes it, and only that
  protected file's reviews hold its inputs.

What a release adds never turns an old breach of your own red: it is listed, and your agents work it down by tasks.
Nothing it brings stops your project or waits on you (`AGENTS.md`, "Nothing locks a project"). The one exception is the
check on your list of personal terms: it fails a listed term wherever it stands, an old one and a name your machine's
git writes into each commit too, and its failure says how a session takes it out in that pull request.

## The settings that are yours

The settings the core cannot make for you: the ruleset on `main`, the Actions setting that pins every action to a
commit, the secret that lists the terms to keep out, the security reviewer's app, secret scanning in a private
repository, where it may be billed (a session switches it on in a public one), how your own profile and git name appear
in commits, and how the machines your agents run on are set up. Each, and why, stands in `README.md`, "Setting up (the
owner's part)"; none of them fails a check or blocks work where you leave it unset. Those of the repository you take in
one sitting, in a session you start yourself: `scripts/owner-settings.mjs` lists them, each with its state, a link to
where it is set and what it protects, and the session applies each you approve and reads it back. A project starting
out gets the list at the end of `scripts/init.mjs` (`setup/starter-kit.md`), and a sync again only where a release adds
a setting.

## Telling the core something

A fault, an idea or a question about the core itself is an issue on this repository, and so is a rule that did not fit
your project, so that the core may learn from it (`README.md`, "Reporting to the core"). A weakness is never an issue,
which anyone can read: it goes to this repository's Security tab, "Report a vulnerability" (`floor/topics/weaknesses.md`,
"Reporting a weakness").
