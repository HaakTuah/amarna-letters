#!/usr/bin/env bash
# Prepare a cloud machine (Ubuntu 24.04, run as root): the npm packages and Playwright's Chromium for the smoke test
# and the phone measurements, and Node 26 where the machine has an older one: the same Node as CI's `node-version` in
# .github/workflows/pages.yml, the two moved together ("Node's version" in core/modules/updates.md). Safe to run twice; always exits
# 0 and says what it could not install. The same script can be pasted into a cloud environment's "Setup script" field,
# so that new sessions start with it done.
NODE_VERSION=26.13.0
have() { command -v "$1" >/dev/null 2>&1; }
cd "$(dirname "$0")/.." || exit 0
# Node from the npm registry, the download host the cloud allows: its node-linux-<arch> package holds the official
# binary, which takes the place of the machine's own node, so every shell's PATH finds it; npm stays as it is. The
# version is pinned and the binary checked against its SHA-256 before it runs: the same binary as in nodejs.org's
# node-v<version>-linux-<arch>.tar.xz, whose SHASUMS256.txt was checked when the pin was set. A new pin repeats that.
if have node && have npm && [ "$(node -p 'process.versions.node.split(".")[0]')" -lt "${NODE_VERSION%%.*}" ]; then
  case "$(uname -m)" in
    x86_64) arch=x64 sum=0adde40d1b7dfa57c8bc83cbc319758c3ec6ebba21363bb2fa752ea6b267ad1b ;;
    aarch64) arch=arm64 sum=66f4a883c880ef336276e7730c01cbae2b92fb8e6a51f7371f920599cac824b7 ;;
    *) arch=unknown sum=none ;;
  esac
  dir=$(mktemp -d) && bin=$(readlink -f "$(command -v node)")
  if (cd "$dir" && npm pack --silent "node-linux-$arch@$NODE_VERSION" && tar xzf node-linux-*.tgz package/bin/node \
    && echo "$sum  package/bin/node" | sha256sum -c -) >/tmp/node-install.log 2>&1 \
    && cp "$dir/package/bin/node" "$bin.new" && mv "$bin.new" "$bin"; then
    echo "node: $(node -v) installed"
  else
    echo "NOT INSTALLED: Node $NODE_VERSION (see /tmp/node-install.log)"
  fi
  rm -rf "$dir"
fi
if have npm; then
  if npm ci --silent >/tmp/npm-ci.log 2>&1; then echo "npm packages: installed"; else echo "NOT INSTALLED: npm packages (see /tmp/npm-ci.log)"; fi
fi
if have node && node -e "require('playwright').chromium" >/dev/null 2>&1; then
  echo "playwright chromium: already there"
elif have npx && [ "${SKIP_PLAYWRIGHT:-}" != "1" ]; then
  # The version CI's smoke job installs (PLAYWRIGHT in .github/workflows/pages.yml): change both together.
  if npx -y playwright@1.63.0 install --with-deps chromium >/tmp/playwright-install.log 2>&1; then
    echo "playwright chromium: installed"
  else
    echo "NOT INSTALLED: Playwright's Chromium (see /tmp/playwright-install.log)"
  fi
fi
exit 0
