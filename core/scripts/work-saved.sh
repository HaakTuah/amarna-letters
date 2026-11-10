#!/usr/bin/env bash
# Nothing is lost ("Push after every commit" in the core's modules/git.md): Claude Code runs this when a session starts
# ("start") and whenever a reply is about to end ("stop"). start reports work left uncommitted, unpushed or stashed;
# stop keeps the reply from ending while any is, once: a second stop in a row goes through, so a push that cannot be
# made never traps a session. It only reads the repository, with the git settings that run commands (fsmonitor, hooks)
# turned off. Claude Code runs the copy merged into main (the project's
# .claude/settings.json; floor rule 3), never the working tree's, so an edit runs once it is reviewed.
mode=$1
input=$(cat 2>/dev/null || true)
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
g() { git --no-optional-locks -c core.fsmonitor=false -c core.hooksPath=/dev/null "$@"; }
g rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
issues=()
dirty=$(g status --porcelain 2>/dev/null)
[ -n "$dirty" ] && issues+=("$(printf '%s\n' "$dirty" | wc -l | tr -d ' ') file(s) not committed, such as $(printf '%s\n' "$dirty" | head -1 | cut -c4-)")
branch=$(g symbolic-ref --short -q HEAD)
if [ -n "$branch" ]; then
  if g rev-parse -q --verify '@{u}' >/dev/null 2>&1; then
    ahead=$(g rev-list --count '@{u}..HEAD')
    [ "$ahead" -gt 0 ] && issues+=("$ahead commit(s) on $branch not pushed")
  else
    alone=$(g rev-list --count HEAD --not --remotes 2>/dev/null || echo 0)
    [ "$alone" -gt 0 ] && issues+=("$branch holds $alone commit(s) on no remote branch: push it with -u")
  fi
fi
stashes=$(g stash list 2>/dev/null | wc -l | tr -d ' ')
[ "$stashes" -gt 0 ] && issues+=("$stashes stash(es): commit what they hold to a branch and push it, or drop them")
[ ${#issues[@]} -eq 0 ] && exit 0
msg="Work not yet on GitHub in ${PWD##*/}: $(IFS=';'; printf '%s' "${issues[*]}" | sed 's/;/; /g')."
if [ "$mode" = stop ]; then
  printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0
  echo "$msg Commit and push it to the task's branch before ending (\"Push after every commit\" in the core's modules/git.md), or say in your last message why it must stay." >&2
  exit 2
fi
echo "$msg"
