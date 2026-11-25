#!/usr/bin/env bash
# What the core's tests workflow downloads while the network is up, for tests that run with it cut off (.github/workflows/tests.yml,
# scripts/offline.sh; #772), each as a file kept under the runner's temporary folder, outside the repository, and never run
# here. Run by the job's set-up step, from the repository's root, naming one:
#
#   bash scripts/test-downloads.sh wheels >> "$GITHUB_ENV"     the wheels of .packages/requirements.txt (the code scan's
#                                                                engine, zizmor), each held to its SHA-256 there by pip
#                                                                (--require-hashes); prints CORE_WHEELS=<folder>
#   bash scripts/test-downloads.sh archives >> "$GITHUB_ENV"   Betterleaks' release for Linux x64, at the version and the
#                                                                archive's SHA-256 that .github/workflows/personal-terms.yml
#                                                                pins for it (tests/workflows-test.mjs holds the two
#                                                                together), checked here before the folder is passed on;
#                                                                prints CORE_ARCHIVES=<folder>
#
# What a download prints goes to the error output, so that the standard output holds the one line for GITHUB_ENV. Where a
# download fails, or its checksum differs, it says so on the error output, prints nothing and exits 0, and the tests that
# need it fail saying their own mend where the run's network is cut off (they name the step), never passing unread. As
# scripts/lychee.sh does, it bounds a download by curl's limits, inside the five minutes the step is given; a fetch that
# stalls past them fails the step by its timeout. Each fetch goes into a folder of its own.
temp="${RUNNER_TEMP:-${TMPDIR:-/tmp}}"
case "${1:-}" in
  wheels)
    dir=$(mktemp -d "$temp/wheels.XXXXXX") &&
      python3 -I -m pip download --require-hashes --no-deps --only-binary=:all: --no-input --disable-pip-version-check --timeout 30 --retries 2 -r .packages/requirements.txt -d "$dir" >&2 &&
      echo "CORE_WHEELS=$dir" ||
      echo "The wheels of .packages/requirements.txt were not fetched: pip's download failed or a wheel differs from its SHA-256." >&2
    ;;
  archives)
    version=1.10.1 sum=c174b42d7aa60caf58c0c3e555c0e4bed01fe6b0d99a412bce777b5af4ce913e
    file="betterleaks_${version}_linux_x64.tar.gz"
    dir=$(mktemp -d "$temp/archives.XXXXXX") &&
      curl -fsSL --proto =https --proto-redir =https --connect-timeout 30 --max-time 300 --retry 2 -o "$dir/$file" "https://github.com/betterleaks/betterleaks/releases/download/v$version/$file" >&2 &&
      echo "$sum  $dir/$file" | sha256sum -c - >&2 &&
      echo "CORE_ARCHIVES=$dir" ||
      echo "Betterleaks $version's archive was not fetched: the download failed or the archive differs from its SHA-256." >&2
    ;;
  *)
    echo "scripts/test-downloads.sh takes wheels or archives and was given \"${1:-}\"; it fetched nothing." >&2
    ;;
esac
