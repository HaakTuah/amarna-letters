# The threat model: what every project shares

The part every project shares; its own threat model adds its users, their ways in and its lower stakes, and a security
review reads both. Rules cited: the floor's.

- **Everything is public:** every file, its history, every PR, issue, comment and workflow run. An attacker reads the
  code, the workflows and these rules first: no defence may rest on not being known.
- **Who:** anyone on the internet: they write issues and comments, open PRs from forks, publish a package or action a
  repository uses, or plant text on a page an agent reads; and whoever the project's own model adds.
- **What is protected:** the owner's accounts and their tokens (rules 1 to 4), his own computer (rule 8), any machine of
  his where agents hold sign-ins (rule 18), `main`, the workflows that deploy and the live site (rules 2, 3 and 12), and
  the project's users, as its own model says.
- **Lower stakes:** a slowdown or crash confined to one user's own tab, from input only that user chose, is Low; from
  input someone else shaped, it is not.
- **The ways in:** the workflows (rule 2); dependencies and actions (rules 2, 7, 10, 15 and 17); outsiders' text
  reaching an agent (rule 4), above all one holding sign-ins (rule 18); the project's own inputs (rule 5).
