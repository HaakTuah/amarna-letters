# The starter kit

Read when a project is set up to take the core. What a project needs before its first task stands in
`setup/template/` as templates: `scripts/init.mjs`, run from a clone of the core in the new project's root, writes
them there, fills in the owner's account, the project's name and the commit of the core, and makes the first copy
under `core/`. Its header gives its options, and it ends by listing what is left for the project and for the owner.
What each file is for: `README.md`, "How a project takes the core".

```bash
git clone <this repository's address> <the clone>             # the core's main; outside the project
cd <the project> && git init                                     # where it is no repository yet
node <the clone>/scripts/init.mjs --owner <the owner's GitHub login>
```

It never overwrites: where the project already has one of its files, it names them and writes nothing. What it wrote
is staged and not committed, so the first PR shows it whole. The templates and the copy are both read from the commit
the clone stands on, never from an edit not yet committed there.

**A project of another owner** follows the core's releases (`README.md`, "How a project takes the core", point 1), so
it starts from one: its clone is made at the newest release (`git clone --branch release-N`), and the script, the
templates and the copy are then all that release's.

Every template ends in `.tmpl`, so that no tool takes one for a rule file, a workflow or a config of this repository
or of a project that holds the copy (floor rule 3), and no check reads one as the real thing. `scripts/init-test.mjs`
writes a project from them and runs the core's own checks on it, so a template that no longer fits the core fails
here, not in a project; `scripts/init-dotnet-test.mjs` does the same for a .NET project, in a clone made the way
Windows makes one, with every line ending converted, and builds it where a .NET SDK is installed. Which template
becomes which file, and when: the list `FILES` in `scripts/init.mjs`.

In a template, `{{owner}}` is the owner's GitHub login, `{{project}}` the project's name, `{{core}}` the core's
address, `{{pin}}` the commit of the core the project starts from, `{{modules}}` the modules it takes, `{{npm}}` the
folder of its npm packages and `{{nuget}}` the folder of its .NET solution. A line that holds `FILL IN:` is the
project's own to write; the script lists them when it is done.