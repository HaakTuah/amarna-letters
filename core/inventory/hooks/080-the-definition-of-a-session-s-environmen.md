- **The definition of a session's environment,** weighed by the challenge: what each tool's cloud session is set up
  with. *Else:* the Dev Container standard (`devcontainer.json`), dropped on fact: Codex's cloud, Copilot's coding agent
  and Claude Code's cloud each define a session's environment their own way (settings and a set-up script; a workflow,
  `copilot-setup-steps.yml`; an environment's set-up script), none names it in its documentation of 17 November, and
  this session had no container daemon to start one. **Keep:** each tool's own set-up, with `scripts/node.sh`, and the
  fetcher of the line above.
