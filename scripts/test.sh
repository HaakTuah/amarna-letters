#!/usr/bin/env bash
# Type-check, lint, the core's copies, pointer and reading-size checks, that each entry of scripts/versions.json finds
# exactly one version (offline, by the core's own reading), and every test (Vitest), printing only the summary and the
# failures.
# The full log goes to $TMPDIR/amarna-test-<pid>.log (or /tmp), one per run, so runs at once never share one; its
# path is printed last. Extra arguments go to `vitest run`,
# for example: scripts/test.sh src/engine/test/siege.test.ts   or   scripts/test.sh -t "besieges"
cd "$(dirname "$0")/.." || exit 2
command -v node >/dev/null 2>&1 || { echo "node is missing (the version in core/.node-version)"; exit 2; }
[ -d node_modules ] || npm ci --silent >/dev/null 2>&1 || { echo "npm ci failed"; exit 2; }
LOG="${TMPDIR:-/tmp}/amarna-test-$$.log"
{ npm run --silent typecheck && npm run --silent lint && node core/scripts/copies.mjs scripts/copies.json && node core/scripts/pointers.mjs && node core/scripts/reading-size.mjs scripts/sizes.json && node --input-type=module -e 'import fs from "node:fs"; import { current } from "./core/scripts/versions.mjs"; try { if (!current(JSON.parse(fs.readFileSync("scripts/versions.json", "utf8")).entries, ".").length) throw new Error("it lists no versions"); } catch (e) { console.log(`FAIL: scripts/versions.json: ${e.message}`); process.exit(1); }' && npx --no-install vitest run --reporter=default "$@"; } >"$LOG" 2>&1
rc=$?
# type and lint errors, new copies, then the test summary
grep -E "error TS[0-9]+|^\s+[0-9]+:[0-9]+\s+error|problems? \(|^FAIL: " "$LOG" | head -30
grep -E "Test Files|Tests  |Duration" "$LOG" | sed 's/^ *//'
# each failing test: its name and the first lines of its message, without the stack
awk '/^ FAIL /{p=1; n=0} /^ ❯ /{p=0} p && n<8 {print; n++}' "$LOG" | head -80
echo "exit $rc; full log: $LOG"
exit $rc
