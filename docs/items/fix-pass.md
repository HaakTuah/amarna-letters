# Brief: the fix pass after the conversion (item 5+, step 3 of 3)

**Spec:** the "Found during the port" list in `docs/BUILD-PROGRESS.md`, and what the first live game found, which
item 5+ names (`docs/intent/main/20-build-order/02-item-5plus.md`): schemas cut down to compile and checked at startup
("One source for model schemas" and "Built to outlive its models", both in `docs/intent/main/17-tech-stack.md`), fallbacks that are never silent, and the
viewer's labels for who wrote each message, with the message trail in four parts ("Who wrote it" and "The message trail"
in `docs/intent/main/16-spectator-mode-and-analysis.md`). Find each by its title with grep. **Effort:** high.

- The first live game's error was "Anthropic API 400: The compiled grammar is too large": all but one model call was
  refused, and script kings stood in without anyone seeing it. The check at startup calls the provider, which takes a
  key and costs money: build it and test it against a stand-in, and leave the first real call to Haakon (keys and
  spending are a safety check in the builder rules).
- Flaws that are about balance numbers go to item 18 instead, as the plan says.

**Done when:** every entry on the list is fixed or moved with a reason, and the PR says how to see each fix. Then go on
with item 6a.
