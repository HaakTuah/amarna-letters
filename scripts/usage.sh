#!/usr/bin/env bash
# Print this plan's weekly usage, as the status line last saw it (scripts/statusline.sh), and exit 0.
# If no status line runs in this session, say so: then usage cannot be read from inside the session, and the
# builder checks no more and says nothing about it ("Usage by provider" in AGENTS.md).
f="${TMPDIR:-/tmp}/claude-usage.json"
[ -s "$f" ] || f="/tmp/claude-usage.json"
if [ -s "$f" ] && command -v jq >/dev/null 2>&1; then
  jq -r '"weekly usage: \(.rate_limits.seven_day.used_percentage // "unknown")% (resets \(.rate_limits.seven_day.resets_at // 0 | todate)); five-hour: \(.rate_limits.five_hour.used_percentage // "unknown")%; read \((now - (.at // now)) / 60 | floor) min ago"' "$f"
else
  echo "weekly usage: not readable in this session; check no more and say nothing about it"
fi
