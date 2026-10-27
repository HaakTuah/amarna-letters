#!/usr/bin/env bash
# The TypeScript conversion's parity check (docs/CONVERSION-PLAN.md): the C# batch runner plays script games and writes
# their logs and a fingerprint after every phase; the TypeScript build replays every log, then plays every game afresh
# with its own script kings, and compares its fingerprints both times.
#   scripts/parity.sh [GAMES] [FIRST_SEED]   (default 200 games from seed 1, plus 60 with sleeping script kings and 60
#                                             against the frozen baseline)
# Needs .NET (scripts/cloud-setup.sh) and Node 22. Everything goes to $TMPDIR/amarna-parity; only the summary is printed.
cd "$(dirname "$0")/.." || exit 2
command -v dotnet >/dev/null 2>&1 || { echo "dotnet is missing: run scripts/cloud-setup.sh first"; exit 2; }
GAMES="${1:-200}"
SEED="${2:-1}"
OUT="${TMPDIR:-/tmp}/amarna-parity"
rm -rf "$OUT" && mkdir -p "$OUT"
dotnet build src/Amarna.Batch -c Release -v q >"$OUT/build.log" 2>&1 || { tail -20 "$OUT/build.log"; exit 1; }
run() { # name, games, first seed, the TypeScript play mode, extra arguments
  dotnet run --no-build --project src/Amarna.Batch -c Release -- --games "$2" --seed "$3" ${5:-} --fingerprints "$OUT/$1" --out "$OUT/$1" >"$OUT/$1.log" 2>&1 || { tail -20 "$OUT/$1.log"; exit 1; }
  rm -f "$OUT/$1"/*.final.json
  node --experimental-strip-types --no-warnings src/batch/src/parity.ts replay "$OUT/$1" || rc=1
  node --experimental-strip-types --no-warnings src/batch/src/parity.ts "$4" "$OUT/$1" || rc=1
}
run scripts "$GAMES" "$SEED" play
run sleeping 60 1001 play-sleeping --sleeping-scripts
run versus 60 2001 play-versus "--versus baseline"
# The recorded model games, replayed leniently by both builds (recorded replies where their keys match, scripts elsewhere).
mkdir -p "$OUT/recorded"
for f in tests/fixtures/replays/*.jsonl; do
  dotnet run --no-build --project src/Amarna.Batch -c Release -- --replay-lenient "$f" --fingerprints "$OUT/recorded" >>"$OUT/recorded.log" 2>&1 || { tail -20 "$OUT/recorded.log"; exit 1; }
done
node --experimental-strip-types --no-warnings src/batch/src/parity.ts lenient tests/fixtures/replays "$OUT/recorded" || rc=1
exit ${rc:-0}
