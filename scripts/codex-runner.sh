#!/usr/bin/env bash
# The Codex runner: runs on Haakon's PC (Git Bash on Windows, or any Linux), one per repository, from that repository's clone. It hands
# pull requests labelled `codex` to Codex's cloud (`codex cloud exec`), applies Codex's diff to the PR's branch and
# reports on the PR; pull requests labelled `codex-review` get a read-only review from Codex on this PC. It acts only on
# pull requests that HaakTuah opened from this repository and labelled himself. Setup, labels and the rules it keeps:
# docs/claude-and-codex.md, "The runner on Haakon's PC".
#
#   CODEX_ENV_ID=<this repository's Codex cloud environment> scripts/codex-runner.sh
#
# Optional: CODEX_RUNNER_OWNER (HaakTuah), CODEX_RUNNER_POLL (seconds between checks, 60),
# CODEX_RUNNER_MAX_MINUTES (a cloud task's limit, 120), CODEX_RUNNER_ONCE=1 (one pass, then stop: for testing).
set -uo pipefail

OWNER="${CODEX_RUNNER_OWNER:-HaakTuah}"
ENV_ID="${CODEX_ENV_ID:?set CODEX_ENV_ID to the Codex cloud environment of this repository}"
POLL="${CODEX_RUNNER_POLL:-60}"
MAX_MIN="${CODEX_RUNNER_MAX_MINUTES:-120}"

cd "$(dirname "$0")/.." || exit 1
ROOT=$(pwd)
REPO=$(git remote get-url origin | sed -E 's#^.*github\.com[:/]##; s#\.git$##')
STATE="$HOME/.codex-runner/${REPO//\//-}"
mkdir -p "$STATE/tasks" "$STATE/work"
LOG="$STATE/runner.log"
NO_SUMMARY="(The task gave no summary; its report is in the Codex task list.)"
DEFAULT_SUMMARY="Codex's diff, applied by the runner on Haakon's PC."

# Python reads Codex's task list: python3 on Linux, often only python on Windows (Git Bash), where python3 may be a
# Store alias that does not run.
PY=""; for p in python3 python; do "$p" -c 1 >/dev/null 2>&1 && { PY=$p; break; }; done
[ -n "$PY" ] || { echo "The runner needs Python 3 (python3 or python)." >&2; exit 1; }

log() { echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*" | tee -a "$LOG" >&2; }
comment() { gh api "repos/$REPO/issues/$1/comments" -F body=@- --jq .id >/dev/null; }   # body on stdin
label_add() { gh api "repos/$REPO/issues/$1/labels" -f "labels[]=$2" >/dev/null; }
label_del() { gh api -X DELETE "repos/$REPO/issues/$1/labels/$2" >/dev/null 2>&1 || true; }
has_label() { gh api "repos/$REPO/issues/$1/labels" --jq '.[].name' | grep -qx "$2"; }
for l in codex codex-running codex-done codex-failed codex-review codex-reviewing codex-reviewed; do
  gh api "repos/$REPO/labels" -f name="$l" -f color=5319e7 >/dev/null 2>&1 || true   # exists already: fine
done

# Only HaakTuah's own work: opened by him, from a branch in this repository (never a fork), and the label added by him.
# Strangers can comment and open issues or PRs from forks, but cannot add labels; their text is never read as a brief.
trusted() { # PR number, label -> sets BRANCH and BODY; 0 if it may be acted on
  local n=$1 lab=$2 author head actor
  author=$(gh api "repos/$REPO/pulls/$n" --jq .user.login) || return 1
  head=$(gh api "repos/$REPO/pulls/$n" --jq .head.repo.full_name) || return 1
  BRANCH=$(gh api "repos/$REPO/pulls/$n" --jq .head.ref) || return 1
  actor=$(gh api "repos/$REPO/issues/$n/events?per_page=100" \
    --jq "[.[] | select(.event == \"labeled\" and .label.name == \"$lab\")] | last | .actor.login") || return 1
  if [ "$author" != "$OWNER" ] || [ "$head" != "$REPO" ] || [ "$actor" != "$OWNER" ]; then
    log "PR #$n: not acted on (opened by $author from $head, '$lab' added by $actor)"
    return 1
  fi
  [ "$BRANCH" != main ] && [ "$BRANCH" != develop ] || { log "PR #$n: not acted on (branch $BRANCH)"; return 1; }
  BODY=$(gh api "repos/$REPO/pulls/$n" --jq .body)
}

task_ids() { codex cloud list --json 2>/dev/null | "$PY" -c '
import json, sys
d = json.load(sys.stdin); t = d.get("tasks", []) if isinstance(d, dict) else d
print("\n".join(str(x.get("id", "")) for x in t))' 2>/dev/null; }
task_field() { codex cloud list --json 2>/dev/null | "$PY" -c '
import json, sys
d = json.load(sys.stdin); t = d.get("tasks", []) if isinstance(d, dict) else d
m = [x for x in t if str(x.get("id")) == sys.argv[1]]
v = m[0].get(sys.argv[2], "") if m else ""
print(v if isinstance(v, str) else json.dumps(v))' "$1" "$2" 2>/dev/null; }

build_prompt() { # PR number: the brief Codex gets, around the PR's own description
  cat <<EOF
You are Codex, building for Haakon in $REPO: pull request #$n, branch $BRANCH (made from develop).
1. Run \`git fetch origin $BRANCH && git checkout $BRANCH\` and work on that branch.
2. Read AGENTS.md and the "For Codex" section of docs/claude-and-codex.md, then do the brief below. Build nothing
   outside it.
3. Run the checks the brief and AGENTS.md ask for, and fix what fails. Never change, skip or weaken a test you were
   given; if you think one is wrong, say so in your report.
4. Do not commit, push or open a pull request: the runner on Haakon's PC applies your diff to the branch.
5. End with a short report: what you changed, the checks you ran and their results, "Readings taken" and
   "Questions for Haakon" (or "None.").

The brief (the pull request's description, written from Haakon's account):

$BODY
EOF
}

start_build() { # PR number
  local n=$1 before out task
  trusted "$n" codex || { label_del "$n" codex; return; }
  label_del "$n" codex; label_add "$n" codex-running
  before=$(task_ids)
  build_prompt "$n" >"$STATE/work/prompt-$n"
  out=$(codex cloud exec --env "$ENV_ID" "$(cat "$STATE/work/prompt-$n")" 2>&1)
  if [ $? -ne 0 ]; then
    log "PR #$n: codex cloud exec failed: $out"
    label_del "$n" codex-running; label_add "$n" codex-failed
    printf 'Codex could not start: `codex cloud exec` failed on the runner.\n\n```\n%s\n```\n' "$(echo "$out" | tail -n 15)" | comment "$n"
    return
  fi
  task=$(echo "$out" | grep -oE 'task_[A-Za-z0-9_]+' | head -n 1)
  [ -n "$task" ] || task=$(comm -13 <(echo "$before" | sort) <(task_ids | sort) | head -n 1)
  if [ -z "$task" ]; then
    log "PR #$n: submitted, but no task id found in: $out"
    label_del "$n" codex-running; label_add "$n" codex-failed
    echo "Codex was given the task, but the runner could not find its task id, so it cannot follow it. See the runner's log." | comment "$n"
    return
  fi
  printf '%s %s %s\n' "$task" "$(date +%s)" "$BRANCH" >"$STATE/tasks/$n"
  log "PR #$n: started cloud task $task on $BRANCH"
  echo "Codex has started: cloud task \`$task\`, environment \`$ENV_ID\`, on \`$BRANCH\`. The runner applies its diff here when it is done." | comment "$n"
}

finish_build() { # PR number, task, branch
  local n=$1 task=$2 branch=$3 wt summary
  wt="$STATE/work/pr-$n"
  rm -rf "$wt"; git -C "$ROOT" worktree prune
  git -C "$ROOT" fetch -q origin "$branch" && git -C "$ROOT" worktree add -q -f --detach "$wt" "origin/$branch" || return 1
  ( cd "$wt" && codex apply "$task" ) >>"$LOG" 2>&1 || { rm -rf "$wt"; git -C "$ROOT" worktree prune; return 1; }
  summary=$(task_field "$task" summary)
  ( cd "$wt" && git add -A && { git diff --cached --quiet || git -c user.name="Codex (runner on Haakon's PC)" -c user.email="$OWNER@users.noreply.github.com" commit -q -m "Codex: PR #$n (cloud task $task)

${summary:-$DEFAULT_SUMMARY}" ; } && git push -q origin "HEAD:$branch" ) >>"$LOG" 2>&1 || { rm -rf "$wt"; git -C "$ROOT" worktree prune; return 1; }
  rm -rf "$wt"; git -C "$ROOT" worktree prune
  printf 'Codex is done: its diff from cloud task `%s` is pushed to `%s`.\n\n%s\n' "$task" "$branch" "${summary:-$NO_SUMMARY}" | comment "$n"
}

check_build() { # PR number
  local n=$1 task started branch status age
  read -r task started branch <"$STATE/tasks/$n"
  if [ "$(gh api "repos/$REPO/pulls/$n" --jq .state)" != open ] || ! has_label "$n" codex-running; then
    log "PR #$n: closed or taken back; stopped following $task"; rm -f "$STATE/tasks/$n"; return
  fi
  status=$(task_field "$task" status | tr '[:upper:]' '[:lower:]')
  age=$(( ($(date +%s) - started) / 60 ))
  case "$status" in
    completed|complete|succeeded|success|ready|done|finished)
      if finish_build "$n" "$task" "$branch"; then label_del "$n" codex-running; label_add "$n" codex-done; log "PR #$n: done ($task)"
      else label_del "$n" codex-running; label_add "$n" codex-failed; log "PR #$n: applying $task failed"
        echo "Codex finished cloud task \`$task\`, but the runner could not apply or push its diff. See the runner's log." | comment "$n"; fi
      rm -f "$STATE/tasks/$n" ;;
    failed|error|errored|cancelled|canceled)
      label_del "$n" codex-running; label_add "$n" codex-failed; rm -f "$STATE/tasks/$n"; log "PR #$n: task $task $status"
      echo "Codex's cloud task \`$task\` ended as **$status**. $(task_field "$task" summary)" | comment "$n" ;;
    *)
      if [ "$age" -ge "$MAX_MIN" ]; then
        label_del "$n" codex-running; label_add "$n" codex-failed; rm -f "$STATE/tasks/$n"; log "PR #$n: $task timed out ($status)"
        echo "Codex's cloud task \`$task\` is still not done after $age minutes (status: ${status:-unknown}), so the runner has stopped following it." | comment "$n"
      fi ;;
  esac
}

review_prompt() { # PR number
  cat <<EOF
Review pull request #$n of $REPO: the changes on this checkout against origin/develop (\`git diff origin/develop...HEAD\`).
Read AGENTS.md first, and review as "Reviews: a score, and what keeps it from 10" in docs/claude-and-codex.md says:
a score from 1 to 10, and every point that keeps the work from 10, each with its file and line or design section and
marked **blocking** or **not blocking**. Check the changes against the pull request's description below, the design
sections it names and the standing rules. Change no files. Your whole answer is posted as a comment on the PR.

The pull request's description:

$BODY
EOF
}

review() { # PR number: a read-only review by Codex on this PC, posted as a comment
  local n=$1 wt out
  trusted "$n" codex-review || { label_del "$n" codex-review; return; }
  label_del "$n" codex-review; label_add "$n" codex-reviewing
  wt="$STATE/work/review-$n"; out="$STATE/work/review-$n.md"
  rm -rf "$wt" "$out"; git -C "$ROOT" worktree prune
  if git -C "$ROOT" fetch -q origin "$BRANCH" develop && git -C "$ROOT" worktree add -q -f --detach "$wt" "origin/$BRANCH" &&
     codex exec --cd "$wt" --sandbox read-only --output-last-message "$out" "$(review_prompt "$n")" >>"$LOG" 2>&1 && [ -s "$out" ]; then
    { echo "## Codex review"; echo; cat "$out"; } | comment "$n"
    label_del "$n" codex-reviewing; label_add "$n" codex-reviewed; log "PR #$n: reviewed"
  else
    label_del "$n" codex-reviewing; label_add "$n" codex-failed; log "PR #$n: review failed"
    echo "Codex could not review this PR on the runner. See the runner's log." | comment "$n"
  fi
  rm -rf "$wt"; git -C "$ROOT" worktree prune
}

log "runner started for $REPO, environment $ENV_ID"
while true; do
  for n in $(gh api "repos/$REPO/issues?state=open&labels=codex&per_page=20" --jq '.[] | select(.pull_request) | .number'); do start_build "$n"; done
  for f in "$STATE"/tasks/*; do [ -e "$f" ] && check_build "$(basename "$f")"; done
  for n in $(gh api "repos/$REPO/issues?state=open&labels=codex-review&per_page=20" --jq '.[] | select(.pull_request) | .number'); do review "$n"; done
  [ "${CODEX_RUNNER_ONCE:-}" = 1 ] && break
  sleep "$POLL"
done
