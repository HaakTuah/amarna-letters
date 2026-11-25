# The reasons behind the core: issue #750.5

The index, and how an item is written: `archive/instructions.md`.

#750.5. **19 November 2026**, #750, point 5. A pull request that only improves on the shape check's baseline passes, the
     check printing what the lowered baseline leaves out, which the next pull request that changes the baseline, or a
     cleaning task, writes; one that changes the baseline writes it whole, as does one whose tree the check on the
     push, told no base, would fail. Under merge-on-green, pull requests that
     made the code better failed until they also rewrote the one shared baseline, and collided; until the lower
     baseline is written, an entry the base's code no longer held covers no breach against the base, in its own place
     or elsewhere, and only a check told no base could let a mended breach come back unseen, the cost the owner
     accepted. The owner agreed to the issue's seven
     points, found by an audit of 39 merged pull requests, and asked that they be a priority. It stands behind "Never
     worse" in `tasks/code-shape.md`.
