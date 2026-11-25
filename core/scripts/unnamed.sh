# What a script of the core's shows of a log on its error output, with the temporary folder it gives and the home
# folder named, never written out: on a runner on the owner's own computer each holds the account's name (#1223). Each
# is replaced as written, with no slash at its end, and, where cygpath stands (Git for Windows), in each form Windows
# tools write it (C:\…, C:/…, /c/…, the short 8.3 name, and backslashes doubled, as a Python repr writes them), letter
# case aside, as Windows reads a path. Sourced, beside it, by lychee.sh and workflow-tools.sh:
#
#   tail -n 5 "$log" | unnamed "$temp" >&2
#
# (personal-terms.yml, which runs in a project's checkout where the core's scripts are not, writes no such path to its
# log instead: it names each from the temporary folder)
unnamed() (
  forms() {
    printf '%s\n' "$1"
    command -v cygpath > /dev/null 2>&1 || return 0
    local f w
    for f in -w -m -u -d; do w=$(cygpath "$f" "$1" 2> /dev/null) && [ "${#w}" -gt 3 ] && printf '%s\n%s\n' "$w" "${w//\\/\\\\}"; done
  }
  t=${1%/} h=${HOME:-}; h=${h%/}
  temps=() homes=()
  # (read with a loop, not mapfile, which macOS's own bash, 3.2, lacks: a filter it could not build would show all)
  if [ "${#t}" -gt 1 ]; then while IFS= read -r f; do temps+=("$f"); done < <(forms "$t"); fi
  if [ "${#h}" -gt 1 ]; then while IFS= read -r f; do homes+=("$f"); done < <(forms "$h"); fi
  command -v cygpath > /dev/null 2>&1 && shopt -s nocasematch
  while IFS= read -r l || [ -n "$l" ]; do
    for f in "${temps[@]}"; do l=${l//"$f"/'<temp>'}; done
    for f in "${homes[@]}"; do l=${l//"$f"/'~'}; done
    printf '%s\n' "$l"
  done
)
