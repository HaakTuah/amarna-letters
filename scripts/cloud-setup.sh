#!/usr/bin/env bash
# Prepare a cloud machine (Ubuntu 24.04, run as root): the npm packages and Playwright's Chromium for the smoke test
# and the phone measurements. Node 22 is already there; the game no longer needs .NET (the TypeScript conversion,
# item 5+). Safe to run twice; always exits 0 and says what it could not install. The same script can be pasted into a
# cloud environment's "Setup script" field, so that new sessions start with it done.
have() { command -v "$1" >/dev/null 2>&1; }
cd "$(dirname "$0")/.." || exit 0
if have npm; then
  if npm ci --silent >/tmp/npm-ci.log 2>&1; then echo "npm packages: installed"; else echo "NOT INSTALLED: npm packages (see /tmp/npm-ci.log)"; fi
fi
if have node && node -e "require('playwright').chromium" >/dev/null 2>&1; then
  echo "playwright chromium: already there"
elif have npx && [ "${SKIP_PLAYWRIGHT:-}" != "1" ]; then
  # The version CI's smoke job installs (PLAYWRIGHT in .github/workflows/pages.yml): change both together.
  if npx -y playwright@1.49.1 install --with-deps chromium >/tmp/playwright-install.log 2>&1; then
    echo "playwright chromium: installed"
  else
    echo "NOT INSTALLED: Playwright's Chromium (see /tmp/playwright-install.log)"
  fi
fi
exit 0
