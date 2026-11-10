#!/usr/bin/env bash
# Prepare a cloud machine (Ubuntu 24.04, run as root): the core's one exact Node, the one CI runs ("Node" in
# core/modules/updates.md), the npm packages, and Playwright's Chromium for the smoke test and the phone measurements.
# Safe to run twice; always exits 0 and says what it could not install. The same script can be pasted into a cloud
# environment's "Setup script" field, so that new sessions start with it done.
have() { command -v "$1" >/dev/null 2>&1; }
cd "$(dirname "$0")/.." || exit 0
# Node: the core's scripts/node.sh, as main holds it, as this script itself runs (floor rule 3).
if node_sh=$(git --no-replace-objects show refs/remotes/origin/main:core/scripts/node.sh 2>/dev/null); then
  bash -c "$node_sh"; hash -r
else
  echo "NOT INSTALLED: Node (no core/scripts/node.sh on refs/remotes/origin/main: fetch main)"
fi
if have npm; then
  if npm ci --silent >/tmp/npm-ci.log 2>&1; then echo "npm packages: installed"; else echo "NOT INSTALLED: npm packages (see /tmp/npm-ci.log)"; fi
fi
# Playwright is a devDependency (package.json, where Dependabot updates it), so npm ci brings it; its Chromium is
# looked for where that version expects it, and installed by that version if missing, as CI's smoke job does.
if have node && node -e "require('fs').accessSync(require('playwright').chromium.executablePath())" >/dev/null 2>&1; then
  echo "playwright chromium: already there"
elif [ "${SKIP_PLAYWRIGHT:-}" = "1" ]; then
  :
elif [ -x node_modules/.bin/playwright ]; then
  # The locked Playwright only, never one found elsewhere on the machine.
  if node_modules/.bin/playwright install --with-deps chromium >/tmp/playwright-install.log 2>&1; then
    echo "playwright chromium: installed"
  else
    echo "NOT INSTALLED: Playwright's Chromium (see /tmp/playwright-install.log)"
  fi
else
  echo "NOT INSTALLED: Playwright's Chromium (the locked Playwright is missing: see /tmp/npm-ci.log)"
fi
exit 0
