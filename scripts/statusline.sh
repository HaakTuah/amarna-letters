#!/usr/bin/env bash
# Status line for Claude Code. Claude Code passes the session's data as JSON on stdin, including the
# plan's rate limits; this keeps them in a file that scripts/usage.sh reads, so a session can check its
# weekly usage. It prints a short status line.
f="${TMPDIR:-/tmp}/claude-usage.json"
input=$(cat)
if command -v jq >/dev/null 2>&1; then
  printf '%s' "$input" | jq -c '{rate_limits, at: now}' >"$f.tmp" 2>/dev/null && mv "$f.tmp" "$f"
  printf '%s' "$input" | jq -r '"week \(.rate_limits.seven_day.used_percentage // "?")% · 5h \(.rate_limits.five_hour.used_percentage // "?")%"' 2>/dev/null
else
  printf '%s' "$input" >"$f"
  echo "usage: see $f"
fi
