#!/usr/bin/env bash
# Nothing is lost ("Git and GitHub" in AGENTS.md): Claude Code runs this when a session starts ("start") and whenever
# a reply is about to end ("stop"). start reports work left uncommitted, unpushed or stashed; stop keeps the reply from
# ending while any is, once: a second stop in a row goes through, so a push that cannot be made never traps a session.
# It reads the repository and fetches, nothing more. Claude Code runs the copy on develop, never the working tree's
# (.claude/settings.json), so a hook edited in a session cannot run before it is reviewed and merged.
mode=$1
input=$(cat 2>/dev/null || true)
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
[ "$mode" = start ] && timeout 20 git fetch -q 2>/dev/null
issues=()
dirty=$(git status --porcelain 2>/dev/null)
[ -n "$dirty" ] && issues+=("$(printf '%s\n' "$dirty" | wc -l | tr -d ' ') file(s) not committed, such as $(printf '%s\n' "$dirty" | head -1 | cut -c4-)")
branch=$(git symbolic-ref --short -q HEAD)
if [ -n "$branch" ]; then
  if git rev-parse -q --verify '@{u}' >/dev/null 2>&1; then
    ahead=$(git rev-list --count '@{u}..HEAD')
    [ "$ahead" -gt 0 ] && issues+=("$ahead commit(s) on $branch not pushed")
  else
    alone=$(git rev-list --count HEAD --not --remotes 2>/dev/null || echo 0)
    [ "$alone" -gt 0 ] && issues+=("$branch holds $alone commit(s) on no remote branch: push it with -u")
  fi
fi
stashes=$(git stash list 2>/dev/null | wc -l | tr -d ' ')
[ "$stashes" -gt 0 ] && issues+=("$stashes stash(es): commit what they hold to a branch and push it, or drop them")
[ ${#issues[@]} -eq 0 ] && exit 0
msg="Work not yet on GitHub in $PWD: $(IFS=';'; printf '%s' "${issues[*]}" | sed 's/;/; /g')."
if [ "$mode" = stop ]; then
  printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0
  echo "$msg Commit and push it to the task's branch before ending (\"Git and GitHub\" in AGENTS.md), or say in your last message why it must stay." >&2
  exit 2
fi
echo "$msg"
