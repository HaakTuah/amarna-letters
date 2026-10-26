#!/usr/bin/env bash
# Write one part of the published site to the gh-pages branch, which GitHub Pages serves.
#   scripts/site-publish.sh root <site-dir>      main's build: replaces the root, keeps every pr-<n>/ folder
#   scripts/site-publish.sh pr-<n> <site-dir>    a PR's preview: replaces pr-<n>/ only
#   scripts/site-publish.sh pr-<n> --remove      removes pr-<n>/ only
# Run only from workflows that run main's own copy (never a PR's code). Each publish is one fresh commit with no
# parent, so the branch does not grow with every build; it is pushed with a lease on the commit it was built from,
# and redone from the new tip if another run moved the branch first.
set -euo pipefail
target=$1 src=$2
[[ $target =~ ^(root|pr-[0-9]+)$ ]] || { echo "bad target: $target" >&2; exit 2; }
if [ "$src" != --remove ]; then
  [ -f "$src/index.html" ] || { echo "no index.html in $src" >&2; exit 2; }
  src=$(cd "$src" && pwd)
  find "$src" -type l -delete   # a link in a built site could point anywhere on the runner
fi
branch=gh-pages
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

  # A preview never creates the branch, nor writes beside a root that is not there: deployed, such a branch would
  # replace the game with an empty site. Previews start once main has published the root.
  if [ "$target" != root ] && [ ! -f "$work/tree/index.html" ]; then
    echo "gh-pages: no root published yet; $target skipped"; exit 0
  fi
  if [ "$target" = root ]; then
    find "$work/tree" -mindepth 1 -maxdepth 1 ! -regex '.*/pr-[0-9]+' -exec rm -rf {} +
    cp -R "$src"/. "$work/tree"/
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
