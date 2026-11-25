# The reasons behind the core: issue #750.7

The index, and how an item is written: `archive/instructions.md`.

#750.7. **19 November 2026**, #750, point 7. A builder hands over to a fresh session once its context passes about
     250,000 tokens, a first guess, at its next passed gate, with its hand-off note in its pull request's description,
     and the orchestrator starts the fresh one from that note; it never stops mid-step. Every step a session takes costs
     more as its context grows, and of two builders that ran long, one was handed over only at 553,000 tokens. The owner
     agreed to the issue's seven points, found by an audit of 39 merged pull requests, and asked that they be a
     priority. It stands behind "A builder hands over by its context" in `roles/shared/work-flow.md` and "Hand over at
     once" in `roles/orchestrator.md`.
