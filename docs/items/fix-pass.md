# Brief: the fix pass after the conversion (item 5+, step 3 of 3)

**Spec:** the "Found during the port" list in `docs/BUILD-PROGRESS.md`, and what the first live game found, as item 5+
says (`docs/intent/build-order/item-5plus.md`). The sections it names are in `docs/intent/engine-and-models/tech-stack.md`
("One source for model schemas", "Built to outlive its models") and `docs/intent/interface-and-the-council/spectator-mode-and-analysis.md`
("The message trail", "Who wrote it"). **Effort:** high.

- The first live game's error was "Anthropic API 400: The compiled grammar is too large": all but one model call was
  refused, and script kings stood in without anyone seeing it. The check at startup calls the provider, which takes a
  key and costs money: build it and test it against a stand-in, and leave the first real call to Haakon (keys and
  spending are a safety check in the builder rules).

**Done when:** every entry on the list is fixed or moved with a reason, and the PR says how to see each fix. Then go on
with item 6a.
