#!/usr/bin/env bash
# Build and run every test, printing only the summary and the failures.
# The full log goes to $TMPDIR/amarna-test.log (or /tmp). Extra arguments go to `dotnet test`,
# for example: scripts/test.sh --filter "FullyQualifiedName~Sieges"
cd "$(dirname "$0")/.." || exit 2
command -v dotnet >/dev/null 2>&1 || { echo "dotnet is missing: run scripts/cloud-setup.sh first"; exit 2; }
LOG="${TMPDIR:-/tmp}/amarna-test.log"
dotnet test --nologo -v q "$@" >"$LOG" 2>&1
rc=$?
grep -E "Passed!|Failed!|Test summary|Total tests|error (CS|MSB|NU)[0-9]+|Build FAILED" "$LOG" | sed 's/^ *//' | sort -u | head -40
# each failing test: its name and the first lines of its message, without the stack trace
awk '/^ *Failed [A-Za-z]/{p=1; n=0} /Stack Trace:/{p=0} p && n<8 {print; n++}' "$LOG" | head -80
echo "exit $rc; full log: $LOG"
exit $rc
