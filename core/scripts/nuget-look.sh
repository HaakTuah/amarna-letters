#!/usr/bin/env bash
# The NuGet check's first look (core/scripts/checks.mjs, its part "nuget"; the header of .github/workflows/nuget.yml
# says what it reads and why): whether the pull request changes anything NuGet reads, by git's own diff against the base
# and, where none changed, by NuGet's own word from a restore against an empty source. It writes "run=false" to
# $GITHUB_OUTPUT only where both say nothing changed, and "built=true" where it ran the pull request's build files. Run
# by checks.mjs with bash -e, from the project's root, with BASE (the base's commit, empty with none), CONFIG (the
# licence check's config), CALLER (the calling workflow's ref, empty with none), CORE_AT (the copy's folder, ending in
# /), NUGET_PACKAGES (a folder of its own) and GITHUB_OUTPUT (the file it writes to). Git, bash, jq, the .NET SDK and
# Node.
# The checkout is the pull request merged into its base, with both parents, so the diff from the base is what
# it changes. Any doubt means the check runs.
paths=(':(glob,icase)**/*.csproj' ':(glob,icase)**/*.fsproj' ':(glob,icase)**/*.vbproj' ':(glob,icase)**/*.props'
  ':(glob,icase)**/*.targets' ':(glob,icase)**/Directory.Build.*' ':(glob,icase)**/*.rsp' ':(glob,icase)**/*.user'
  ':(glob,icase)**/packages.lock.json' ':(glob,icase)**/packages.*.lock.json' ':(glob,icase)**/packages.config'
  ':(glob,icase)**/nuget.config' ':(glob,icase)**/global.json' ':(glob,icase)**/dotnet-tools.json'
  ':(glob,icase)**/*.nupkg' "${CORE_AT}.node-version" .github/workflows/nuget.yml)
# NuGet's own word on whether every lock file still holds what its project asks for, however the project asks
# (in an import, through a property, from any file a build reads): a restore of each project file from its
# lock file alone against an empty source, which downloads nothing. It holds only where each restore passed
# or failed only for packages not found that a lock file names, and no project downloads a package beside its
# lock file (a PackageDownload, a targeting pack), as each restore's own record of the project says.
# (the SDK's own reference packs, which it adds by itself, a Windows project's with EnableWindowsTargeting: no
# package of the project's, and the same for every project on the runner's SDK)
PACKS='Microsoft\.(NETCore|WindowsDesktop|AspNetCore)\.App\.Ref'
holds() {
  local empty config stamp project out codes id projects locks records
  # (from here the pull request's build files have run in this job: the licence read before the restore is
  # left out, since nothing it reads changed from the base)
  echo "built=true" >> "$GITHUB_OUTPUT"
  empty=$(mktemp -d) stamp=$(mktemp)
  # (a NuGet config of its own and nothing else, so that no NuGet.Config of the project's has a say: one that
  # maps packages to their sources maps none to the empty source, and NuGet would name that, not a package
  # not found; #380)
  config="$empty.config"
  printf '%s\n' '<?xml version="1.0" encoding="utf-8"?>' '<configuration />' > "$config"
  mapfile -d '' -t projects < <(git -c core.quotePath=false ls-files -z -- ':(glob,icase)**/*.csproj' \
    ':(glob,icase)**/*.fsproj' ':(glob,icase)**/*.vbproj' ":(exclude)${CORE_AT}**")
  mapfile -d '' -t locks < <(git -c core.quotePath=false ls-files -z -- ':(glob,icase)**/packages.lock.json' \
    ':(glob,icase)**/packages.*.lock.json' ":(exclude)${CORE_AT}**")
  for project in "${projects[@]}"; do
    out=$(dotnet restore --locked-mode --configfile "$config" --source "$empty" "-p:RestorePackagesPath=$NUGET_PACKAGES" \
      -p:NuGetLockFilePath= "./$project" < /dev/null 2>&1) && continue
    codes=$(printf '%s\n' "$out" | grep -oE 'error [A-Z]+[0-9]+' | sort -u)
    # (its error lines, whole, so the next reader sees the cause; each behind "  | " and with "##[" broken, so none is
    # read as a workflow command, which the runner finds after leading spaces, and "##[" anywhere; where none says
    # error, all it printed; #1239)
    [ -n "$codes" ] || { echo "$project: the restore failed with no error NuGet names. It printed:"
      { printf '%s\n' "$out" | grep -iw error || printf '%s\n' "$out"; } | tr -d '\r' | sed 's/##\[/# #[/g; s/^/  | /'; return 1; }
    if printf '%s\n' "$codes" | grep -qvE '^error NU110[123]$'; then echo "$project:" $codes; return 1; fi
    while IFS= read -r id; do
      printf '%s\n' "$id" | grep -qxE "$PACKS" && continue
      [ "${#locks[@]}" -gt 0 ] && grep -qiF -- "\"$id\": {" "${locks[@]}" || { echo "$project: a package no lock file names is asked for ($id)"; return 1; }
    done < <(printf '%s\n' "$out" | grep -oE 'NU110[123]: Unable to find (a stable )?package [^ ]+' | sed -E 's/.* package //; s/\.$//' | sort -u)
  done
  # (each project's own record of its restore, written just now inside the checkout and naming that project:
  # one that lies elsewhere, or is not there, is a doubt)
  records=$(find . -path "./${CORE_AT%/}" -prune -o -name project.assets.json -newer "$stamp" -print0 \
    | xargs -0 -r jq -r '.project.restore.projectPath // empty' | tr '\\' '/' | tr -d '\r')
  for project in "${projects[@]}"; do
    printf '%s\n' "$records" | while IFS= read -r r; do [[ "${r,,}" == *"/${project,,}" ]] && echo yes; done | grep -q yes \
      || { echo "$project: its own record of its restore lies outside the checkout"; return 1; }
  done
  while IFS= read -r -d '' assets; do
    jq -e --arg packs "$PACKS" '[.project.frameworks[]? | .downloadDependencies // [] | .[] | select(.name | test("^(" + $packs + ")$") | not)] | length == 0' "$assets" > /dev/null \
      || { echo "a project downloads a package beside its lock file"; return 1; }
  done < <(find . -path "./${CORE_AT%/}" -prune -o -name project.assets.json -newer "$stamp" -print0)
}
run=true
# (the config, its audit and each folder it names as a source, each by its exact name, and the caller)
if [ -n "$BASE" ] && extra=$(jq -r '[.audit, (.nuget.sources // [])[]] | .[] | strings | select(startswith("https://") | not)' "$CONFIG"); then
  paths+=(":(literal)$CONFIG")
  while IFS= read -r p; do p=${p%$'\r'}; [ -n "$p" ] && paths+=(":(literal)$p"); done <<< "$extra" # (jq on Windows ends lines with CR)
  caller=${CALLER#"$GITHUB_REPOSITORY"/}; caller=${caller%%@*}
  [ -n "$caller" ] && [ "$caller" != "$CALLER" ] && paths+=(":(literal)$caller")
  # (each file an Import, or a property MSBuild's own targets import a file by, brings in under another name
  # than a build file's, and each whose root element is a Project, which the script reads as one: a change to
  # it alone is one NuGet reads)
  imports=ok
  brought=$(node "$CORE_AT"scripts/nuget.mjs --imports) || imports=
  while IFS= read -r p; do p=${p%$'\r'}; [ -n "$p" ] && paths+=(":(literal)$p"); done <<< "$brought"
  if [ -n "$imports" ] && { git cat-file -e "$BASE^{commit}" 2>/dev/null || git fetch --quiet --no-tags --depth=1 origin "$BASE"; } \
    && changed=$(git diff --no-renames --name-only "$BASE" HEAD -- "${paths[@]}") \
    && listed=$(git ls-files -s -- "${paths[@]}"); then
    if [ -n "$changed" ]; then
      echo "Changed:"
      printf '%s\n' "$changed" | sed 's/^/- /' # behind a dash, so that no file's name starts a workflow command
    elif printf '%s\n' "$listed" | grep -q '^120000 '; then
      echo "A listed file is a link to another, whose changes this step would not see."
    elif holds; then
      run=false
      echo "Nothing NuGet reads changed, and every lock file still holds what its project asks for: nothing to restore."
    else
      echo "A lock file no longer holds what its project asks for, or a project downloads a package beside it, or NuGet could not say: the check runs."
      echo "That look ran the pull request's build files, so the licence read before the restore is left out: nothing it reads changed from the base."
    fi
  fi
fi
echo "run=$run" >> "$GITHUB_OUTPUT"
