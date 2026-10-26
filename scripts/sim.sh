#!/usr/bin/env bash
# Run the batch runner (src/Amarna.Batch) quietly: the full output goes to a log file, and only its
# last lines (the tables and signals it prints at the end) are shown. Arguments go to the runner,
# for example: scripts/sim.sh --games 50 --seed 1 --verify-replay
# Script games only: the model presets cost real money and the builder rules forbid them.
cd "$(dirname "$0")/.." || exit 2
command -v dotnet >/dev/null 2>&1 || { echo "dotnet is missing: run scripts/cloud-setup.sh first"; exit 2; }
for a in "$@"; do
  case "$a" in --preset|--leaders|--characters|--narrator|--budget) echo "refused: $a starts model games"; exit 2;; esac
done
LOG="${TMPDIR:-/tmp}/amarna-sim-$(date +%Y%m%d-%H%M%S).log"
dotnet run --project src/Amarna.Batch -c Release -- "$@" >"$LOG" 2>&1
rc=$?
tail -n "${SIM_TAIL:-40}" "$LOG"
echo "exit $rc; full log: $LOG"
exit $rc
