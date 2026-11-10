#!/usr/bin/env bash
# The Node every project's cloud machines run, the same as its CI's ("Node" in modules/updates.md): the exact version in
# the core's `.node-version` (`core/.node-version` in a project, which its workflows' setup-node reads too), with that
# version's checksums here. A project's cloud setup runs this file from the project's root, as its copy of the core on
# its own `main` holds it (`git show <main>:core/scripts/node.sh`), never a branch's. Where the machine's node is
# another version, Node comes from the npm registry, the download host the cloud allows: its node-linux-<arch> package
# holds the official binary, which takes the place of the machine's own node, so every shell's PATH finds it; npm stays
# as it is. No package's install script runs (floor rule 15): the package is only fetched (`npm pack`) and its binary
# taken out and checked against its SHA-256, then run once to show its version, before it replaces anything; a version
# with no checksum here is never installed, whatever `.node-version` says. The sums are the SHA-256 of `bin/node` in
# that version's node-linux-<arch> packages, published by the Node.js project, recomputed in the PR that sets the pin.
# Safe to run twice; always exits 0 and says what it could not do.
have() { command -v "$1" >/dev/null 2>&1; }
want=$(tr -d '[:space:]' 2>/dev/null <core/.node-version)
if [ -n "$want" ] && [ "$(node -v 2>/dev/null)" = "v$want" ]; then echo "node: v$want present"; exit 0; fi
case "$want-$(uname -m)" in
  26.13.0-x86_64) arch=x64 sum=0adde40d1b7dfa57c8bc83cbc319758c3ec6ebba21363bb2fa752ea6b267ad1b ;;
  26.13.0-aarch64) arch=arm64 sum=66f4a883c880ef336276e7730c01cbae2b92fb8e6a51f7371f920599cac824b7 ;;
  *) echo "NOT INSTALLED: Node ${want:-(no core/.node-version)} (no checksum here for it on $(uname -m))"; exit 0 ;;
esac
if ! have node || ! have npm; then echo "NOT INSTALLED: Node $want (no node and npm to start from)"; exit 0; fi
bin=$(readlink -f "$(command -v node)")
dir=$(mktemp -d) && log=$(mktemp) && [ -n "$bin" ] || { echo "NOT INSTALLED: Node $want (no temporary folder, or no node path)"; exit 0; }
new=""
if (cd "$dir" && npm pack --silent --ignore-scripts "node-linux-$arch@$want" && tar xzf node-linux-*.tgz package/bin/node \
  && echo "$sum  package/bin/node" | sha256sum -c - && [ "$(package/bin/node -v)" = "v$want" ]) >"$log" 2>&1 \
  && new=$(mktemp "$bin.XXXXXX") && cp "$dir/package/bin/node" "$new" && chmod 755 "$new" \
  && [ "$("$new" -v 2>/dev/null)" = "v$want" ] && mv "$new" "$bin"; then
  echo "node: $(node -v) installed"; rm -f "$log"
else
  [ -n "$new" ] && rm -f "$new"
  echo "NOT INSTALLED: Node $want (see $log); the machine keeps its own, $(node -v 2>/dev/null)"
fi
rm -rf "$dir"
exit 0
