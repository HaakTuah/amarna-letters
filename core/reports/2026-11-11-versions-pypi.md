# The versions check reads PyPI too

`modules/updates.md` has the core's versions workflow check monthly what Dependabot cannot see, but its script asked
only npm. Amarna Letters pins four Python tools that make its music (`docs/audio/SOURCES.md`), which nothing watched.

What changes in every project: an entry of a versions config may say `"registry": "pypi"`; the check then reads the
package's release times from PyPI's JSON API (each release dated by its first upload, a withdrawn or empty release left
out) and compares them as it compares npm's. Entries without it are npm's, as before. No rule changes.

New way in, for the security review: the workflow's step without a token now fetches `https://pypi.org/pypi/<name>/json`
for a "pypi" entry. What it takes from the answer: version strings, kept only when they are plain numbers (`STABLE`), and
dates, only compared; an issue's title and link carry only such a version and the configured name, checked against
PyPI's name form. The step that holds the token is unchanged.

Readings taken:

- Taking a PyPI release still needs floor rule 7's source check, whose methods are npm's; each entry's "how" says what
  stands for it there (PyPI's provenance and attestations), and where none can run, the release is held back with the
  reason, as `modules/updates.md` says.

Questions for the owner: none.
