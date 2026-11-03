# The threat model: Amarna Letters

Who might attack this repository and its site, what they want, and where they could get in. Codex's security review
reads this file as its threat model (its settings point here, so it is not made anew for every review); the rules
that close each way in are in `SECURITY.md`, whose rule numbers this file cites.

- **Everything is public:** every file, its whole history, every PR, issue, comment and workflow run. So an attacker
  reads the code, the workflows and these rules before trying anything: no defence may rest on not being known, and
  every rule must hold against someone who has read it. Anything committed is public for good, even if a later commit
  removes it (rule 1 says what is done when a secret lands).
- **Who:** anyone on the internet. They write issues and comments, open PRs from forks, hand a player a save file or a
  link, publish a package or action this repository uses, or plant text on a page a builder or Codex reads; and a
  model's reply can carry what its inputs planted.
- **What is protected, and what an attacker wants of it:**
  - **The owner's accounts:** his GitHub account and its tokens, his ChatGPT and Claude logins, and his PC, where a
    small poller outside every repository hands work to Codex (`docs/claude-and-codex.md`, "the owner's poller"):
    reached through a workflow, a PR's checks or work handed to Codex (rules 1 to 4).
  - **The branches and the site:** `main` (the live game), `develop`, the workflows that deploy, and GitHub Pages: a
    push to `main` or the site (rules 2 and 3).
  - **Players:** their browsers, their saves and their API keys: code run in a browser, or a key sent anywhere but
    the provider the player chose (rules 5 to 7); a save corrupted or forged (rule 5).
- **The ways in:** model replies, save files, share links, URL parameters and the bridge (rule 5); the workflows and
  what triggers them (rule 2); dependencies and actions (rules 2 and 10); outsiders' text reaching an agent (rule 4).
- **Lower stakes:** a slowdown or crash confined to one player's own tab, from input only that player chose, is Low;
  the same from a save, link or text someone else crafted is not. Deceit between kings is play, not an attack.
