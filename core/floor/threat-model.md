# The threat model: what every project shares

The part every project shares; its own threat model adds its users, their ways in and its lower stakes, and a security
review reads both. Rules cited: the floor's.

- **Everything is public:** every file, its whole history, every PR, issue, comment and workflow run. An attacker reads
  the code, the workflows and these rules first: no defence may rest on not being known, and every rule must hold
  against someone who has read it.
- **Who:** anyone on the internet. They write issues and comments, open PRs from forks, publish a package or action the
  repository uses, or plant text on a page a builder or Codex reads; and whoever the project's own model adds.
- **What is protected:** **the owner's accounts** (his GitHub account and its tokens, his ChatGPT and Claude logins),
  reached through a workflow, a PR's checks or work handed to Codex (rules 1 to 4), his own computer, where nothing runs
  unless he starts it (rule 8), and any machine of his where agents hold sign-ins (rule 18). **The branches and the
  site:** `main` (the live project), the workflows that deploy, and GitHub Pages (rules 2, 3 and 12). **The project's
  users,** as its own model says.
- **Lower stakes:** a slowdown or crash confined to one user's own tab, from input only that user chose, is Low; the
  same from input someone else shaped is not. The project's own model says what else is.
- **The ways in:** the workflows and what triggers them (rule 2); dependencies and actions (rules 2, 7, 10, 15 and 17);
  outsiders' text reaching an agent (rule 4), above all one holding sign-ins (rule 18); the project's own inputs (rule
  5).
