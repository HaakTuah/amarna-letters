#!/usr/bin/env bash
# The TypeScript conversion's parity check (docs/CONVERSION-PLAN.md): the C# batch runner plays script games and writes
# their logs and a fingerprint after every phase; the TypeScript build replays every log, then plays every game afresh
# with its own script kings, and compares its fingerprints both times.
#   scripts/parity.sh [GAMES] [FIRST_SEED]   (default 200 games from seed 1, plus 60 with sleeping script kings and 60
#                                             against the frozen baseline)
# Needs the .NET 10 SDK, installed by hand since the conversion (see scripts/cloud-setup.sh), and Node 22. Everything goes to $TMPDIR/amarna-parity; only the summary is printed.
cd "$(dirname "$0")/.." || exit 2
command -v dotnet >/dev/null 2>&1 || { echo "dotnet is missing: install the .NET 10 SDK (see scripts/cloud-setup.sh)"; exit 2; }
GAMES="${1:-200}"
SEED="${2:-1}"
OUT="${TMPDIR:-/tmp}/amarna-parity"
rm -rf "$OUT" && mkdir -p "$OUT"
dotnet build src/Amarna.Batch -c Release -v q >"$OUT/build.log" 2>&1 || { tail -20 "$OUT/build.log"; exit 1; }
run() { # name, games, first seed, the TypeScript play mode, extra arguments
  dotnet run --no-build --project src/Amarna.Batch -c Release -- --games "$2" --seed "$3" ${5:-} --fingerprints "$OUT/$1" --out "$OUT/$1" >"$OUT/$1.log" 2>&1 || { tail -20 "$OUT/$1.log"; exit 1; }
  rm -f "$OUT/$1"/*.final.json
  # A replay reads the decisions only: the request-text column, which only a game played afresh can write, is left out.
  mkdir -p "$OUT/$1.replay"
  for f in "$OUT/$1"/*.parity.tsv; do cut -f1-4 "$f" >"$OUT/$1.replay/$(basename "$f")"; done
  node --experimental-strip-types --no-warnings src/batch/src/parity.ts replay "$OUT/$1" "$OUT/$1.replay" || rc=1
  node --experimental-strip-types --no-warnings src/batch/src/parity.ts "$4" "$OUT/$1" || rc=1
}
run scripts "$GAMES" "$SEED" play
run sleeping 60 1001 play-sleeping --sleeping-scripts
run versus 60 2001 play-versus "--versus baseline"
# The model layer: every role on the simulated API (canned replies; no call leaves the machine), every other king a script
# king so that envoys reach the model kings; the fifth column fingerprints every request's text (rulebook, prompts, schemas).
run simulated 12 3001 play-simulated "--simulate-api --preset showcase --alternate-script"
run simulated-awake 6 4001 play-simulated-awake "--simulate-api --preset showcase --alternate-script --sleep off"
# The recorded model games, replayed leniently by both builds (recorded replies where their keys match, scripts elsewhere).
mkdir -p "$OUT/recorded"
for f in tests/fixtures/replays/*.jsonl; do
  dotnet run --no-build --project src/Amarna.Batch -c Release -- --replay-lenient "$f" --fingerprints "$OUT/recorded" >>"$OUT/recorded.log" 2>&1 || { tail -20 "$OUT/recorded.log"; exit 1; }
done
node --experimental-strip-types --no-warnings src/batch/src/parity.ts lenient tests/fixtures/replays "$OUT/recorded" || rc=1
exit ${rc:-0}
