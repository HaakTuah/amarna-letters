#!/usr/bin/env bash
# Run the batch runner (src/batch, TypeScript on Node) quietly: the full output goes to a log file, and only its
# last lines (the tables and signals it prints at the end) are shown. Arguments go to the runner,
# for example: scripts/sim.sh --games 50 --seed 1 --verify-replay
# Script games only: model games need ANTHROPIC_API_KEY, which is never set here, and the builder rules forbid them.
cd "$(dirname "$0")/.." || exit 2
command -v node >/dev/null 2>&1 || { echo "node is missing (Node 22 or later)"; exit 2; }
[ -d node_modules ] || npm ci --silent >/dev/null 2>&1 || { echo "npm ci failed"; exit 2; }
LOG="${TMPDIR:-/tmp}/amarna-sim-$(date +%Y%m%d-%H%M%S).log"
node --experimental-strip-types --no-warnings src/batch/src/main.ts "$@" >"$LOG" 2>&1
rc=$?
tail -n "${SIM_TAIL:-40}" "$LOG"
echo "exit $rc; full log: $LOG"
exit $rc
