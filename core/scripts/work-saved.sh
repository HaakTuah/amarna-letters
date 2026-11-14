#!/usr/bin/env bash
# Nothing is lost ("Push after every commit" in the core's modules/git.md): Claude Code runs this when a session starts
# ("start") and whenever a reply is about to end ("stop"). start reports work left uncommitted, unpushed or stashed,
# and says in a line where Node is not on the path, so the helper hook is off, and whether the owner's stop switch is
# set (core archive 201);
# stop keeps the reply from ending while any is, once: a second stop in a row goes through, so a push that cannot be
# made never traps a session. It only reads the repository, with the git settings that run commands (fsmonitor, hooks)
# turned off; the start asks origin for the switch with the user's own SSH and sign-in setup, never a prompt, and with
# origin's settings that run commands set aside. Claude Code runs the copy merged into main (the project's
# .claude/settings.json; floor rule 3), never the working tree's, so an edit runs once it is reviewed.
mode=$1
input=$(cat 2>/dev/null || true)
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
g() { git --no-optional-locks -c core.fsmonitor=false -c core.hooksPath=/dev/null "$@"; }
g rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
# (a note, never a block: the helper hook is started by node, so without it there the hook stops nothing)
if [ "$mode" = start ] && ! command -v node >/dev/null 2>&1; then
  echo "The helper hook is off here: Node is not on the path, and Claude Code starts that hook with node (the core's README.md, \"On Windows\")."
fi
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
if [ ${#issues[@]} -gt 0 ]; then
  msg="Work not yet on GitHub in ${PWD##*/}: $(IFS=';'; printf '%s' "${issues[*]}" | sed 's/;/; /g')."
  if [ "$mode" = stop ]; then
    printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0
    echo "$msg Commit and push it to the task's branch before ending (\"Push after every commit\" in the core's modules/git.md), or say in your last message why it must stay." >&2
    exit 2
  fi
  echo "$msg"
fi
[ "$mode" = start ] || exit 0
# The owner's stop switch (the core's modules/work-flow.md): the branch agents-stop on origin, by that name alone, asked
# last, so that nothing above waits on it, and for eight seconds at most: no prompt for a sign-in or a host's key, and
# origin's settings that run commands (an ext:: address, an upload-pack of its own) set aside; the user's own way to
# ssh (GIT_SSH_COMMAND, GIT_SSH, core.sshCommand) kept. Where origin does not answer, that is said, since a switch
# nobody read stops nothing; with no origin there is no switch, and nothing is said.
g remote get-url origin > /dev/null 2>&1 || exit 0
asked=$(mktemp 2>/dev/null) || exit 0
quiet=(GIT_TERMINAL_PROMPT=0 GCM_INTERACTIVE=never)
[ -z "${GIT_SSH_COMMAND:-}${GIT_SSH:-}" ] && [ -z "$(g config --get core.sshCommand 2>/dev/null)" ] && quiet+=("GIT_SSH_COMMAND=ssh -o BatchMode=yes -o ConnectTimeout=5")
# (git itself in the background, its output in a file of its own and none on the hook's, so that stopping it leaves
# nothing holding the hook open)
env "${quiet[@]}" git --no-optional-locks -c core.fsmonitor=false -c core.hooksPath=/dev/null -c credential.interactive=never \
  -c protocol.ext.allow=never -c remote.origin.uploadpack=git-upload-pack ls-remote origin refs/heads/agents-stop \
  < /dev/null > "$asked" 2> /dev/null &
asking=$! waited=0 rc=timeout
while kill -0 "$asking" 2> /dev/null && [ $waited -lt 16 ]; do sleep 0.5; waited=$((waited + 1)); done
if kill -0 "$asking" 2> /dev/null; then kill "$asking" 2> /dev/null; else wait "$asking"; rc=$?; fi
if grep -q "$(printf '\t')refs/heads/agents-stop\$" "$asked" 2> /dev/null; then
  echo "The owner's stop switch is set (the branch agents-stop on origin): start no task; commit and push what you have, and stop, saying so."
elif [ "$rc" != 0 ]; then
  echo "The owner's stop switch could not be read (origin did not answer in time): say so before starting a task, and read it again before each commit (the core's modules/work-flow.md)."
fi
rm -f "$asked" 2> /dev/null
exit 0
