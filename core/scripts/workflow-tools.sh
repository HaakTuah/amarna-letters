#!/usr/bin/env bash
# The two maintained tools the workflow check (scripts/workflows.mjs) runs, fetched at set-up as their own programs
# (AGENTS.md, "A tool that only runs is fetched at set-up, as its own program"; #580): zizmor, from PyPI by the version
# and the SHA-256 of each of its wheels that the core's .packages/requirements.txt names, installed by the machine's
# pip with no dependency and none of its code run; and actionlint, the release its maker publishes on GitHub for the
# machine's system, the archive and the program in it each checked against the SHA-256 written here (the archive's as
# its checksums file publishes it). Each goes into a folder of this run's own under the runner's temporary folder,
# outside the repository, and is never run here. Run by the job before the check, from the project's root:
#
#   bash core/scripts/workflow-tools.sh >> "$GITHUB_ENV"      (scripts/workflow-tools.sh in the core's own repository)
#
# It prints ZIZMOR=<path> and ACTIONLINT=<path> for each tool it fetched, which the check reads; for one it could not,
# it says why on its error output and prints nothing, and the check then says it did not run that part and decides
# nothing by it. Each download is bounded (pip's and curl's limits below) well inside the five minutes the jobs give
# this step, and the jobs let the step fail without failing them, so a stalled fetch only leaves its tool unfetched.
# A new pin moves the version and every sum at once (zizmor's in requirements.txt). Always exits 0.
core=$(cd "$(dirname "$0")/.." && pwd) || exit 0
temp="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
# (a log shown with the temporary and home folders named, never written out; where that is not beside it, not shown)
. "$(dirname "$0")/unnamed.sh" 2> /dev/null || unnamed() { cat > /dev/null; echo "(not shown: scripts/unnamed.sh is not beside this script)"; }
digest() { { sha256sum < "$1" || shasum -a 256 < "$1"; } 2> /dev/null | cut -c1-64; }

# (zizmor: its lines alone of the lock file, so that the code scan's engine beside it is not installed for this)
z=$(mktemp -d "$temp/zizmor.XXXXXX" 2> /dev/null) || z=
python=$(command -v python3 || command -v python)
if [ -z "$z" ] || [ -z "$python" ]; then echo "zizmor is not fetched: ${python:+no temporary folder could be made}${python:-no Python here to run pip}." >&2
elif ! awk '/^zizmor==/ { on = 1 } on { print; if ($0 !~ /\\$/) exit }' "$core/.packages/requirements.txt" > "$z/zizmor.txt" 2> /dev/null || [ ! -s "$z/zizmor.txt" ]; then
  echo "zizmor is not fetched: the core's .packages/requirements.txt names no version of it." >&2
elif ! "$python" -I -m pip install --require-hashes --no-deps --only-binary=:all: --no-compile --no-input --disable-pip-version-check --timeout 30 --retries 1 \
    --target "$z/pypi" -r "$z/zizmor.txt" > "$z/log" 2>&1; then
  echo "zizmor is not fetched: pip could not install it from PyPI by the sums the core names. Of the install:" >&2; tail -n 5 "$z/log" | unnamed "$temp" >&2
else
  for bin in "$z/pypi/bin/zizmor" "$z/pypi/bin/zizmor.exe"; do [ -f "$bin" ] && { echo "ZIZMOR=$bin"; break; }; done
  [ -f "$z/pypi/bin/zizmor" ] || [ -f "$z/pypi/bin/zizmor.exe" ] || echo "zizmor is not fetched: its wheel held no program where pip puts one." >&2
fi

# (actionlint: the archive for the machine's system and the program in it, each checked before it is kept)
version=1.7.12 exe=
case $(uname -s)/$(uname -m) in
  Linux/x86_64) file=linux_amd64.tar.gz archive=8aca8db96f1b94770f1b0d72b6dddcb1ebb8123cb3712530b08cc387b349a3d8 sum=c872d6db8c6bf83a8eaa704fc93999f027d55dffbc63b8a6abdccb47df5f4cd4 ;;
  Linux/aarch64 | Linux/arm64) file=linux_arm64.tar.gz archive=325e971b6ba9bfa504672e29be93c24981eeb1c07576d730e9f7c8805afff0c6 sum=ac0323433c2853ec3fb978c611430c5b3dc5d43c58d1a1ec031b00ab572beb60 ;;
  Darwin/x86_64) file=darwin_amd64.tar.gz archive=5b44c3bc2255115c9b69e30efc0fecdf498fdb63c5d58e17084fd5f16324c644 sum=d1f7cee75ae2873609bd9567b4600bebc5315a5e733e73202987a44fafdd53b2 ;;
  Darwin/arm64) file=darwin_arm64.tar.gz archive=aba9ced2dee8d27fecca3dc7feb1a7f9a52caefa1eb46f3271ea66b6e0e6953f sum=8db11704dc296f096216db4db65d86cd7f0ebfdf4c38453a1da276b137b88388 ;;
  MINGW*/x86_64 | MSYS*/x86_64 | CYGWIN*/x86_64) file=windows_amd64.zip exe=.exe archive=6e7241b51e6817ea6a047693d8e6fed13b31819c9a0dd6c5a726e1592d22f6e9 sum=54ca21be3de4c7cfa26914aa8b61bd76bf573ef3caac5f80d110558cdf241718 ;;
  MINGW*/aarch64 | MINGW*/arm64 | MSYS*/aarch64 | MSYS*/arm64 | CYGWIN*/aarch64 | CYGWIN*/arm64) file=windows_arm64.zip exe=.exe archive=cadcf7ea4efe3a68728893813643cebe1185e5b1d4be5b96245f65c9a4d5ea41 sum=dc172c9dd32275b4a563143a318a48c91dff44fabafb23b7d1a05ed9c106a488 ;;
  *) echo "actionlint $version is not fetched: no pin stands here for $(uname -s)/$(uname -m)." >&2; exit 0 ;;
esac
a=$(mktemp -d "$temp/actionlint.XXXXXX" 2> /dev/null) || { echo "actionlint $version is not fetched: no temporary folder could be made." >&2; exit 0; }
bin="actionlint$exe" got="archive.${file#*.}"
if (cd "$a" && curl -fsSL --proto =https --proto-redir =https --connect-timeout 20 --max-time 90 --retry 1 -o "$got" \
    "https://github.com/rhysd/actionlint/releases/download/v$version/actionlint_${version}_$file" \
  && [ "$(digest "$got")" = "$archive" ] \
  && case $file in
       *.zip) if command -v unzip > /dev/null 2>&1; then unzip -q "$got" "$bin"
              else powershell -NoProfile -NonInteractive -Command "Expand-Archive -LiteralPath $got -DestinationPath out" && mv out/"$bin" .; fi ;;
       *) tar -xzf "$got" "$bin" ;;
     esac \
  && [ "$(digest "$bin")" = "$sum" ] && chmod 755 "$bin") > "$a/log" 2>&1; then
  echo "ACTIONLINT=$a/$bin"
else
  echo "actionlint $version is not fetched: its release for $(uname -s)/$(uname -m) could not be downloaded or differs from its sum here. Of the fetch:" >&2
  tail -n 5 "$a/log" | unnamed "$temp" >&2; echo "the archive's SHA-256: $(digest "$a/$got")" >&2
fi
exit 0
