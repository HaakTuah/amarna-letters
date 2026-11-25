- `scripts/lookup.mjs`, `scripts/week-wait.mjs`, `scripts/lookup-stage.mjs`, `tests/lookup-run-test.mjs`, `tests/lookup-step-test.mjs`, `scripts/held.mjs`: asks its registry of each package a pull request brings in new, and fails a
  name the registry does not know or one first published days ago, printing the rest for the review (#488, point 1,
  merged later the same day). *Runs:* any session and the runners, with the registry reachable. *Else:* npm's own `npm
  view`, dropped on fact: the script asks npm's registry and NuGet's directly, as `npm view` would, with no npm needed;
  deps.dev and Socket, dropped on fact: hosted services (#534, point 6); OpenSSF Scorecard, dropped on fact: it scores a
  repository's practices, not whether a name is new, and wants a token; npm's own `min-release-age` (npm 11.10 and
  later; the pinned Node 26.13.0 carries npm 11.20.0), found by the challenge, which makes an install pass over a
  version younger than the days it is set to, kept beside the lookup and dropped in its place, on fact: npm's alone, and
  it takes an older version without a word where the lookup fails the pull request with its mend. *Bugs:* 0. **Keep:**
  nothing fits; the registries are asked through their own interfaces, and the rule is the core's.
