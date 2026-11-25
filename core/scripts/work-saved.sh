#!/usr/bin/env bash
# Nothing is lost ("Push after every commit" in the core's roles/shared/work-flow.md): Claude Code runs this when a session starts
# ("start") and whenever a reply is about to end ("stop"). start reports work left uncommitted, unpushed or stashed,
# and says in a line where Node is not on the path, so the helper hook is off, what the branch's changed paths call
# for (core archive 234), and whether the owner's stop switch is set (core archive 201);
# stop keeps the reply from ending while any is, once: a second stop in a row goes through, so a push that cannot be
# made never traps a session. At the start it installs the core's packages from main's own npm files where what is installed is not what they name (below); else it only reads the repository, with the git settings that run commands (fsmonitor, hooks)
# turned off; the start asks origin for the switch with the user's own SSH and sign-in setup, never a prompt, and with
# origin's settings that run commands set aside. Claude Code runs the copy merged into main (the project's
# .claude/settings.json; floor rule 3), never the working tree's, so an edit runs once it is reviewed.
mode=$1
input=$(cat 2>/dev/null || true)
cd "${CLAUDE_PROJECT_DIR:-.}" 2>/dev/null || exit 0
g() { git --no-optional-locks -c core.fsmonitor=false -c core.hooksPath=/dev/null "$@"; }
g rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
# Where the core stands, as main's manifest names it (the core's tasks/repositories.md; scripts/core-path.mjs reads the
# line alike): core/ as a rule, nothing in the core's own repository. At the start, a floor that cannot be read there
# stops the session, and the floor's own copy, where a repository whose core a library carries keeps one, is held to it.
at=""
if [ "$mode" = start ]; then
  manifest=$(GIT_NO_LAZY_FETCH=1 GIT_TERMINAL_PROMPT=0 g --no-replace-objects show refs/remotes/origin/main:core-manifest.md 2>/dev/null || true)
  at=$(printf '%s\n' "$manifest" | sed -n -E 's#^Core: [^ ]+( at [0-9a-f]{40}, copied whole|, carried by ([A-Za-z0-9_][A-Za-z0-9._-]*/)+) under (([A-Za-z0-9_][A-Za-z0-9._-]*/)+)( .*)?$#\3#p' | head -n 1)
  [ -z "$at" ] && [ -n "$manifest" ] && at=core/ # (a manifest whose line reads in neither form: the usual path)
  if [ -n "$at" ] && [ ! -f "${at}floor/security.md" ]; then
    echo "STOP: the floor cannot be read at ${at}floor/security.md, where core-manifest.md says the core stands. Do nothing else in this session until it is mended. Mend: bring the core's files into the checkout (git submodule update --init, where a submodule carries them), or, where that cannot be done here, say so to the owner and stop."
  fi
  copy=$(printf '%s\n' "$manifest" | sed -n -E 's#^Floor copy: (([A-Za-z0-9_][A-Za-z0-9._-]*/)+)( .*)?$#\1#p' | head -n 1)
  if [ -n "$copy" ] && [ -d "${at}floor" ] && ! diff -r -q "${at}floor" "$copy" >/dev/null 2>&1; then
    echo "The floor's own copy under $copy differs from the floor under ${at}floor/, the core's that the library carries. Mend: copy ${at}floor/ over it, whole, in a pull request of its own."
  fi
fi
# The core's packages (#654): at the start, where main's copy holds a lock file in .packages/ and what is installed
# there is not what it names, and main's scripts/packages.mjs finds them all from npm's registry, npm installs them from
# main's package list, lock file and .npmrc alone, written into a folder of its own outside the checkout, so that
# nothing of the branch's is read or run (a shrinkwrap, a config, a link); then the folder it installed takes the place
# of the copy's .packages/node_modules/, only where .packages/ is a folder of the checkout's own and node_modules/ in it
# no link and nothing git tracks. No install script runs, and it gives up after 20 seconds, inside the hook's 30. A
# note, never a block: a check that needs a package says so, with its mend.
if [ "$mode" = start ] && command -v npm >/dev/null 2>&1 && command -v node >/dev/null 2>&1 \
  && g cat-file -e "refs/remotes/origin/main:${at}.packages/package-lock.json" 2>/dev/null; then
  w=$(mktemp -d 2>/dev/null) || w=""
  # (main's three npm files at the folder's top, where npm runs, and its scripts/packages.mjs beside them)
  if [ -n "$w" ] && (for f in .packages/package.json .packages/package-lock.json .packages/.npmrc scripts/packages.mjs; do t="$w/${f#.packages/}"; mkdir -p "$(dirname "$t")" && g --no-replace-objects show "refs/remotes/origin/main:${at}$f" >"$t" 2>/dev/null || exit 1; done); then
    # (whether the folder holds what main's lock file names, by each entry's version, address and integrity: node reads
    # the two files as data, and runs nothing of either)
    if ! node -e 'const fs=require("fs");const read=f=>{try{return JSON.parse(fs.readFileSync(f,"utf8")).packages||{}}catch{return null}};const [w,h]=process.argv.slice(1).map(read);process.exit(w&&h&&Object.keys(w).filter(k=>k&&!w[k].dev).every(k=>h[k]&&["version","resolved","integrity"].every(f=>w[k][f]===h[k][f]))?0:1)' "$w/package-lock.json" "${at}.packages/node_modules/.package-lock.json" 2>/dev/null; then
      dest="${at}.packages/node_modules"
      here=$(pwd -P)
      if [ "$(cd "./${at}.packages" 2>/dev/null && pwd -P)" != "$here/${at}.packages" ]; then
        echo "The core's packages are not installed: ${at}.packages is not a folder of this checkout's own. Mend: put the core's files there in place of the link, then install them: if [ -f ${at}scripts/install.mjs ]; then node ${at}scripts/install.mjs; fi."
      # (a link as the shell sees one, or as Node does, which reads a Windows junction as one too)
      elif [ -L "$dest" ] || node -e 'process.exit(require("fs").lstatSync(process.argv[1],{throwIfNoEntry:false})?.isSymbolicLink()?0:1)' "$dest" 2>/dev/null \
        || [ -n "$(g ls-files -- "$dest" 2>/dev/null | head -n 1)" ]; then
        echo "The core's packages are not installed: ${dest} is a link or holds files git tracks, which the install would replace. Mend: take it out of git and remove the link, then install them: if [ -f ${at}scripts/install.mjs ]; then node ${at}scripts/install.mjs; fi."
      # (main's own reading of its package list, lock file and .npmrc, as install.mjs reads them before npm runs: only
      # npm's registry, and its own two settings; the npm that comes with the least Node reads no setting that says so)
      elif ! node --input-type=module -e 'const fs=await import("node:fs"),{pathToFileURL}=await import("node:url");const w=process.argv[1],p=await import(pathToFileURL(w+"/scripts/packages.mjs").href),r=f=>fs.readFileSync(w+"/"+f,"utf8");process.exit(p.lockFaults(JSON.parse(r("package.json")),JSON.parse(r("package-lock.json"))).length||p.npmrcOthers(r(".npmrc")).length?1:0)' "$w" >/dev/null 2>&1; then
        echo "The core's packages are not installed: main's ${at}.packages/package.json, ${at}.packages/package-lock.json or ${at}.packages/.npmrc names a source or a setting the core's install does not take. Mend: run if [ -f ${at}scripts/install.mjs ]; then node ${at}scripts/install.mjs; fi, which says what it refuses."
      else
        omit=--omit=dev; [ -z "$at" ] && [ -d tests ] && omit= # (a copy installs no package only the core's own tests run)
        if (cd "$w" && timeout 20 npm ci --ignore-scripts --no-audit --no-fund --allow-git=none --allow-remote=none --allow-file=none --allow-directory=none --workspaces=false $omit >/dev/null 2>&1) && rm -rf "$dest" && mv "$w/node_modules" "$dest"; then :; else
          echo "The core's packages are not installed: npm could not install them from main's ${at}.packages/package-lock.json. Mend: none is needed for the checks, which install them themselves before they read (#1093); to install them now, run if [ -f ${at}scripts/install.mjs ]; then node ${at}scripts/install.mjs; fi."
        fi
      fi
    fi
  fi
  [ -n "$w" ] && rm -rf "$w"
fi
# (a note, never a block: the helper hook is started by node, so without it there the hook stops nothing)
if [ "$mode" = start ] && ! command -v node >/dev/null 2>&1; then
  echo "The helper hook is off here: Node is not on the path, and Claude Code starts that hook with node (the core's README.md, \"On Windows\")."
fi
# What to read (the core's tasks/tools.md, "One script says what to read"): at the start, what the paths changed on
# this branch call for, as the reading script says it, from its copy merged into main as this hook is (never the
# working tree's), the core's own where main holds no manifest and the project's copy of it where it does. The script
# reads the roles and modules from main's own tree too; on a branch that has changed nothing that calls for a file,
# without Node, or before main holds the script, nothing is said.
if [ "$mode" = start ] && command -v node >/dev/null 2>&1; then
  reading=scripts/reading.mjs
  # (neither read fetches what a clone made without its files lacks, nor asks for a sign-in)
  [ -n "$at" ] && reading=${at}scripts/reading.mjs
  r=$(GIT_NO_LAZY_FETCH=1 GIT_TERMINAL_PROMPT=0 g --no-replace-objects show "refs/remotes/origin/main:$reading" 2>/dev/null)
  # (where a library's submodule carries the core, from the library's commit main pins, in the submodule's repository)
  lib=$(printf '%s\n' "$manifest" | sed -n -E 's#^Core: [^ ]+, carried by (([A-Za-z0-9_][A-Za-z0-9._-]*/)+) under .*#\1#p' | head -n 1)
  if [ -z "$r" ] && [ -n "$lib" ] && pin=$(GIT_NO_LAZY_FETCH=1 GIT_TERMINAL_PROMPT=0 g --no-replace-objects rev-parse "refs/remotes/origin/main:${lib%/}" 2>/dev/null); then
    r=$(GIT_NO_LAZY_FETCH=1 GIT_TERMINAL_PROMPT=0 g -C "$lib" --no-replace-objects show "$pin:${reading#"$lib"}" 2>/dev/null)
  fi
  [ -n "$r" ] && printf '%s' "$r" | node --input-type=module - --hook 2>/dev/null
fi
# The quick check (the core's roles/shared/work-flow.md, "Sessions"; #306): named, never run, since a hook that ran the
# project's code would run it outside a box the owner set up for it (floor rule 18) and past the hook's time; the
# command as main's manifest gives it in its row *quick check*, the row's second cell (a pipe escaped there, \|, read
# as one), kept to printable ASCII (no control, bidirectional or line-separating character of any encoding), or else
# the slot named with its default.
if [ "$mode" = start ]; then
  quick=$(printf '%s\n' "$manifest" | sed -n -E 's#^\|[[:space:]]*\*quick check\*[[:space:]]*\|[[:space:]]*(([^|\\]|\\.)*)\|.*$#\1#p' | head -n 1 | sed -E 's/^[[:space:]]+//; s/[[:space:]]+$//; s/\\\|/|/g' | LC_ALL=C tr -cd '\040-\176' | cut -c1-300)
  [ -n "$quick" ] || quick="the *quick check* its AGENTS.md names, or else its *other builders' checks*, by default its own tests"
  echo "Before your first change, run the quick check ($quick): a failure there is a bug of its own, filed, and the task goes on with what does not hang on it (the core's roles/shared/work-flow.md, \"Sessions\")."
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
elif g rev-parse -q --verify HEAD >/dev/null 2>&1; then
  # (a detached HEAD: a commit made there is on no branch at all, and goes with the machine unless one holds it)
  alone=$(g rev-list --count HEAD --not --remotes 2>/dev/null || echo 0)
  [ "$alone" -gt 0 ] && issues+=("a detached HEAD holds $alone commit(s) on no remote branch: put them on a branch (git switch -c <name>) and push it")
fi
stashes=$(g stash list 2>/dev/null | wc -l | tr -d ' ')
[ "$stashes" -gt 0 ] && issues+=("$stashes stash(es): commit what they hold to a branch and push it, or drop them")
if [ ${#issues[@]} -gt 0 ]; then
  msg="Work not yet on GitHub in ${PWD##*/}: $(IFS=';'; printf '%s' "${issues[*]}" | sed 's/;/; /g')."
  if [ "$mode" = stop ]; then
    printf '%s' "$input" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true' && exit 0
    echo "$msg Commit and push it to the task's branch before ending (\"Push after every commit\" in the core's roles/shared/work-flow.md), or say in your last message why it must stay." >&2
    exit 2
  fi
  echo "$msg"
fi
[ "$mode" = start ] || exit 0
# The owner's stop switch (the core's roles/shared/work-flow.md): the branch agents-stop on origin, by that name alone, asked
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
  echo "The owner's stop switch is set (the branch agents-stop on origin): start no task; commit and push what you have, write the hand-off note in its pull request (the core's tasks/tools.md, \"A change of tool loses nothing\"), and stop, saying so."
elif [ "$rc" != 0 ]; then
  echo "The owner's stop switch could not be read (origin did not answer in time): say so before starting a task, and read it again before each commit (the core's roles/shared/work-flow.md)."
fi
rm -f "$asked" 2> /dev/null
exit 0
