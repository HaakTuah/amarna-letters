- `scripts/reading-size.mjs`, `scripts/file-size.mjs`, `.github/sizes.json` (the core's own split mark and `"past"`
  list, #469): fails a file every session reads that passes its mark, and a file past the split mark changed with no why. *Runs:*
  any session and the runners. *Else:* size-limit and bundlesize, dropped on fact: they weigh a built bundle, not a file
  read whole. *Bugs:* 2. **Keep:** nothing fits; what a session reads is the core's own list.
