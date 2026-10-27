#!/usr/bin/env bash
# Prepare a built web app for GitHub Pages: set its base path, and make it a root site or a PR preview.
#   scripts/site-prepare.sh <site-dir> <base-path> root|preview
# <site-dir> is the static output of the build (the web app's, from Vite: src/web/dist). <base-path> is where the site
# is served, such as /amarna-letters/ or /amarna-letters/pr-12/. Only this step and the build command know about the
# build; publishing does not.
set -euo pipefail
site=$1 base=$2 kind=$3
[[ $base =~ ^/[A-Za-z0-9._/-]*/$ ]] || { echo "bad base path: $base" >&2; exit 2; }
[ -f "$site/index.html" ] || { echo "no index.html in $site" >&2; exit 2; }

# The site lives under a sub-path, so the app's base path must match.
sed -i "s|<base href=\"/\" />|<base href=\"$base\" />|" "$site/index.html"
grep -q "<base href=\"$base\" />" "$site/index.html" || { echo "base path not set in index.html" >&2; exit 2; }

case $kind in
  root)
    # Deep links such as /play are served the app, whose router takes over. Pages serves only the root's 404.html,
    # so a deep link inside a preview (/pr-12/play) lands here too: send it to that preview's start.
    redirect='<script>(function(){var m=location.pathname.match(/^(.*[/]pr-[0-9]+[/])./);if(m)location.replace(m[1]);})();</script>'
    sed "s|<head>|<head>$redirect|" "$site/index.html" > "$site/404.html"
    grep -q 'pr-\[0-9\]' "$site/404.html" || { echo "redirect not added to 404.html" >&2; exit 2; }
    ;;
  preview)
    # A preview registers no service worker of its own: one would take over the root's caches (its activate step
    # deletes every offline-cache-* it does not own). The root's worker leaves pr-<n>/ paths to the network.
    rm -f "$site"/service-worker*.js "$site"/service-worker*.js.* "$site/404.html"
    ;;
  *) echo "kind must be root or preview" >&2; exit 2 ;;
esac
# Without this, Pages' Jekyll step would drop any file or folder starting with an underscore.
touch "$site/.nojekyll"
