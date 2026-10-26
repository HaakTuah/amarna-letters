#!/usr/bin/env bash
# Prepare a cloud machine (Ubuntu 24.04, run as root): the .NET 10 SDK, which cloud machines lack,
# and Playwright's Chromium for the phone measurements of the conversion. Node 22 is already there.
# Safe to run twice; always exits 0 and says what it could not install. The same script can be pasted
# into a cloud environment's "Setup script" field, so that new sessions start with it done.
have() { command -v "$1" >/dev/null 2>&1; }
if ! have dotnet; then
  if curl -fsSL https://dot.net/v1/dotnet-install.sh -o /tmp/dotnet-install.sh; then
    bash /tmp/dotnet-install.sh --channel 10.0 --install-dir /usr/share/dotnet >/tmp/dotnet-install.log 2>&1 \
      && ln -sf /usr/share/dotnet/dotnet /usr/local/bin/dotnet
  fi
fi
if ! have dotnet && have apt-get; then
  { apt-get update -q && apt-get install -y -q software-properties-common \
    && add-apt-repository -y ppa:dotnet/backports && apt-get update -q \
    && apt-get install -y -q dotnet-sdk-10.0; } >/tmp/dotnet-apt.log 2>&1
fi
if have dotnet; then echo "dotnet $(dotnet --version)"; else echo "NOT INSTALLED: .NET 10 SDK (see /tmp/dotnet-install.log, /tmp/dotnet-apt.log)"; fi
export DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1
if have npx && [ "${SKIP_PLAYWRIGHT:-}" != "1" ]; then
  if npx -y playwright@1.49.1 install --with-deps chromium >/tmp/playwright-install.log 2>&1; then
    echo "playwright chromium: installed"
  else
    echo "NOT INSTALLED: Playwright's Chromium (see /tmp/playwright-install.log)"
  fi
fi
exit 0
