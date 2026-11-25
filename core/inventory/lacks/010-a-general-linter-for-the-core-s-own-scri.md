- **A general linter for the core's own scripts,** which have none. *Runs:* any session and the runners. *Else:* oxlint
  1.94.0 (MIT, one program for each system, no package of its own), kept, tried: 140 findings in 0.1 s with its
  defaults, among them 13 names declared or imported and never used, which "Keep it lean" asks gone, and 3 expressions
  whose value is thrown away; Biome 2.6.8 (MIT or Apache-2.0, one program, no package of its own, a formatter beside its
  linter), kept, tried: 283 findings in 0.4 s, more of them on how the code is written; ESLint 10 with its recommended
  rules, kept, untried: 30 packages of its own, the reference the other two follow. **Try** oxlint first, then Biome,
  each on its defaults with a baseline of what stands that may only shrink ("Nothing locks a project"), its findings
  read by kind before a kind is turned on; ESLint where neither reads a rule the trial wants.
