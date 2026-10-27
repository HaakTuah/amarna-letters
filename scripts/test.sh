#!/usr/bin/env bash
# Type-check, lint and run every test (Vitest), printing only the summary and the failures.
# The full log goes to $TMPDIR/amarna-test.log (or /tmp). Extra arguments go to `vitest run`,
# for example: scripts/test.sh src/engine/test/siege.test.ts   or   scripts/test.sh -t "besieges"
cd "$(dirname "$0")/.." || exit 2
command -v node >/dev/null 2>&1 || { echo "node is missing (Node 22 or later)"; exit 2; }
[ -d node_modules ] || npm ci --silent >/dev/null 2>&1 || { echo "npm ci failed"; exit 2; }
LOG="${TMPDIR:-/tmp}/amarna-test.log"
{ npm run --silent typecheck && npm run --silent lint && npx vitest run --reporter=default "$@"; } >"$LOG" 2>&1
rc=$?
# type and lint errors, then the test summary
grep -E "error TS[0-9]+|^\s+[0-9]+:[0-9]+\s+error|problems? \(" "$LOG" | head -30
grep -E "Test Files|Tests  |Duration" "$LOG" | sed 's/^ *//'
# each failing test: its name and the first lines of its message, without the stack
awk '/^ FAIL /{p=1; n=0} /^ ❯ /{p=0} p && n<8 {print; n++}' "$LOG" | head -80
echo "exit $rc; full log: $LOG"
exit $rc
