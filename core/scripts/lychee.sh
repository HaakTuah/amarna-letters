#!/usr/bin/env bash
# lychee, the maintained link checker the pointer check (scripts/pointers.mjs) runs for Markdown's own links, fetched at
# set-up as its own program (AGENTS.md, "A tool that only runs is fetched at set-up, as its own program"; #582): the
# release its maker publishes on GitHub for the machine's system, the archive and the program in it each checked against
# the SHA-256 written here (the archive's as its release publishes it beside the archive). It goes into a folder of this run's own
# under the runner's temporary folder, outside the repository, and is never run here. Run by the job before the check,
# from the project's root:
#
#   bash core/scripts/lychee.sh >> "$GITHUB_ENV"      (scripts/lychee.sh in the core's own repository)
#
# It prints LYCHEE=<path> where it fetched it; where it could not, it says why on its error output and prints nothing,
# and the check then says it did not run that part and decides nothing by it. The download is bounded (curl's limits
# below) well inside the five minutes the jobs give this step, and the jobs let the step fail without failing them, so
# a stalled fetch only leaves it unfetched. A new pin moves the version and every sum at once. Always exits 0.
temp="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
# (a log shown with the temporary and home folders named, never written out; where that is not beside it, not shown)
. "$(dirname "$0")/unnamed.sh" 2> /dev/null || unnamed() { cat > /dev/null; echo "(not shown: scripts/unnamed.sh is not beside this script)"; }
digest() { { sha256sum < "$1" || shasum -a 256 < "$1"; } 2> /dev/null | cut -c1-64; }
version=0.24.2 exe=
case $(uname -s)/$(uname -m) in
  Linux/x86_64) target=x86_64-unknown-linux-musl ext=tar.gz archive=73657a111819a30c47c08352896796f23d64e4eb2b3ed39b6d32149241566fc5 sum=5c44b077feb43359fb7ad0fd60452e33e1ed8a7bfdbfe6fdad029a020252943b ;;
  Linux/aarch64 | Linux/arm64) target=aarch64-unknown-linux-musl ext=tar.gz archive=5d0b0e3aeab240f41920c633a6eaf97599be6eedda034b36e858ede7dba5e535 sum=29bc0ac5c5ac3cfe9c312a5783a94f8fca33118d1a7bb687323eab0b52735f79 ;;
  Darwin/x86_64) target=x86_64-apple-darwin ext=tar.gz archive=887503a9cff667d322b8d0892b40bf49976eb9507af8483220a3706cdad55978 sum=db236f940ad0dbe02b8c3e12ac0f7b7dcae15be02bb5fb1868def5026b5e01e7 ;;
  Darwin/arm64) target=aarch64-apple-darwin ext=tar.gz archive=c9d3740ea2d891854d37116c9fba840f37b6e7c89d330e7db84ac333631c4977 sum=af111b5890746a863e60b4929720ab383337843ed15b701515871aa6e8817c2b ;;
  MINGW*/x86_64 | MSYS*/x86_64 | CYGWIN*/x86_64) target=x86_64-pc-windows-msvc ext=zip exe=.exe archive=32975d1493ee1a975d6bb41e4fb56fe419cb442ded628bb772ba2e614acfacad sum=2d15a3f78ac680103720b0c59667dc6f1da7de35f7e9c95171bdf4b76fb6829b ;;
  *) echo "lychee $version is not fetched: no pin stands here for $(uname -s)/$(uname -m)." >&2; exit 0 ;;
esac
a=$(mktemp -d "$temp/lychee.XXXXXX" 2> /dev/null) || { echo "lychee $version is not fetched: no temporary folder could be made." >&2; exit 0; }
bin="lychee-$target/lychee$exe" got="archive.$ext"
if (cd "$a" && curl -fsSL --proto =https --proto-redir =https --connect-timeout 20 --max-time 120 --retry 1 -o "$got" \
    "https://github.com/lycheeverse/lychee/releases/download/lychee-v$version/lychee-$target.$ext" \
  && [ "$(digest "$got")" = "$archive" ] \
  && case $ext in
       zip) if command -v unzip > /dev/null 2>&1; then unzip -q "$got" "$bin"
            else powershell -NoProfile -NonInteractive -Command "Expand-Archive -LiteralPath $got -DestinationPath ." ; fi ;;
       *) tar -xzf "$got" "$bin" ;;
     esac \
  && [ "$(digest "$bin")" = "$sum" ] && chmod 755 "$bin") > "$a/log" 2>&1; then
  echo "LYCHEE=$a/$bin"
else
  echo "lychee $version is not fetched: its release for $(uname -s)/$(uname -m) could not be downloaded or differs from its sum here. Of the fetch:" >&2
  tail -n 5 "$a/log" | unnamed "$temp" >&2; echo "the archive's SHA-256: $(digest "$a/$got")" >&2
fi
exit 0
