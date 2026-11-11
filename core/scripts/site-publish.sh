#!/usr/bin/env bash
# Write one part of a game's published site to its gh-pages branch, which GitHub Pages serves ("How a project takes
# the core" in README.md, point 5). Run from the game's clone, as its core/ copy:
#   core/scripts/site-publish.sh root <site-dir>      main's build: replaces the root, keeps every pr-<n>/ folder
#   core/scripts/site-publish.sh pr-<n> <site-dir>    a PR's preview: replaces pr-<n>/ only
#   core/scripts/site-publish.sh pr-<n> --remove      removes pr-<n>/ only
# Run only from workflows that run main's own copy (never a PR's code): the game's publish of main, and the core's
# preview workflow. The root is published only from a commit of main (GITHUB_SHA) that comes after the one live, which
# .root-commit names: a re-run of an older build is skipped, so the live game never goes back, and a passing build goes
# live even when main has moved past it (a run by hand, without GITHUB_SHA, clears the record). Each publish is one
# fresh commit with no parent, so the branch does not grow with every build; it is pushed with a lease on the commit it
# was built from, and redone from the new tip if another run moved the branch first.
set -euo pipefail
target=$1 src=$2
[[ $target =~ ^(root|pr-[0-9]+)$ ]] || { echo "bad target: $target" >&2; exit 2; }
if [ "$src" != --remove ]; then
  [ -f "$src/index.html" ] || { echo "no index.html in $src" >&2; exit 2; }
  src=$(cd "$src" && pwd)
  find "$src" -type l -delete   # a link in a built site could point anywhere on the runner
fi
branch=gh-pages
ancestor() {   # 0: commit $1 is $2 or comes before it; 1: it does not; anything else (an unknown commit) stops the run
  local rc=0; git merge-base --is-ancestor "$1" "$2" || rc=$?
  local b=${2#refs/remotes/origin/}
  [ "$rc" -le 1 ] || { echo "gh-pages: could not compare ${1:0:7} with ${b:0:7}" >&2; exit 1; }
  return "$rc"
}
gitdir=$(git rev-parse --absolute-git-dir)
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

for attempt in 1 2 3 4 5; do
  rm -rf "$work/tree" && mkdir "$work/tree"
  if git fetch -q origin "+refs/heads/$branch:refs/remotes/origin/$branch" 2>/dev/null; then
    old=$(git rev-parse "refs/remotes/origin/$branch")
    git archive "$old" | tar -x -C "$work/tree"
  else
    old=""   # the branch does not exist yet: the lease requires that it still does not
  fi
  # (main's history, commits only, fetched after gh-pages, so the commit live under this lease is in it)
  if [ "$target" = root ] && [ -n "${GITHUB_SHA:-}" ]; then
    deepen=$([ "$(git rev-parse --is-shallow-repository)" = true ] && echo --unshallow || true)
    git fetch -q --filter=tree:0 $deepen origin "+refs/heads/main:refs/remotes/origin/main"
    git config --unset remote.origin.partialclonefilter || true   # (later fetches, gh-pages's, whole again)
    ancestor "$GITHUB_SHA" refs/remotes/origin/main ||
      { echo "gh-pages: ${GITHUB_SHA:0:7} is not on main; root skipped"; exit 0; }
    live=$(head -c 40 "$work/tree/.root-commit" 2>/dev/null || true)
    if [[ $live =~ ^[0-9a-f]{40}$ ]] && git merge-base --is-ancestor "$live" refs/remotes/origin/main 2>/dev/null &&
      ! ancestor "$live" "$GITHUB_SHA"; then
      echo "gh-pages: the live root is from ${live:0:7}, after this run's ${GITHUB_SHA:0:7}; root skipped"; exit 0
    fi
  fi

  # A preview never creates the branch, nor writes beside a root that is not there: deployed, such a branch would
  # replace the game with an empty site. Previews start once main has published the root.
  if [ "$target" != root ] && [ ! -f "$work/tree/index.html" ]; then
    echo "gh-pages: no root published yet; $target skipped"; exit 0
  fi
  if [ "$target" = root ]; then
    find "$work/tree" -mindepth 1 -maxdepth 1 ! -regex '.*/pr-[0-9]+' -exec rm -rf {} +
    cp -R "$src"/. "$work/tree"/
    rm -f "$work/tree/.root-commit"   # (the commit live at the root, for the next publish to compare with)
    [ -z "${GITHUB_SHA:-}" ] || echo "$GITHUB_SHA" > "$work/tree/.root-commit"
  else
    rm -rf "${work:?}/tree/$target"
    [ "$src" = --remove ] || { mkdir "$work/tree/$target" && cp -R "$src"/. "$work/tree/$target"/; }
  fi
  touch "$work/tree/.nojekyll"

  rm -f "$work/index"
  GIT_INDEX_FILE="$work/index" git --git-dir="$gitdir" --work-tree="$work/tree" -C "$work/tree" add -A -f .
  tree=$(GIT_INDEX_FILE="$work/index" git --git-dir="$gitdir" write-tree)
  if [ -n "$old" ] && [ "$tree" = "$(git rev-parse "$old^{tree}")" ]; then echo "gh-pages: $target unchanged"; exit 0; fi
  commit=$(git -c user.name="github-actions[bot]" -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
    commit-tree "$tree" -m "Publish $target from ${GITHUB_SHA:-local} (run ${GITHUB_RUN_ID:-local})")
  if git push -q --force-with-lease="refs/heads/$branch:$old" origin "$commit:refs/heads/$branch"; then
    echo "gh-pages: published $target"; exit 0
  fi
  echo "gh-pages moved during the publish; trying again ($attempt)" >&2
  sleep $((attempt * 3))
done
echo "could not publish $target to gh-pages" >&2
exit 1
