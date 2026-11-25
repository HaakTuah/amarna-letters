// Whether a hook's command runs its copy on `main` (floor rule 3: what an agent tool starts by itself runs from its copy
// on `main`; agent-tools-read.mjs): only the starter kit's own two forms (KIT_FORMS) show it, whole, each fetching its script
// from the remote's `main` (`git show refs/remotes/origin/main:<path>`), which a session's branch cannot change, and
// running it, perhaps with plain words after it, which that script, main's, reads. Nothing else is read: no other
// command shows where what it runs comes from, so none passes for it. Node's own modules only.
//
//   import { fetchedBy, kitForm, libraryOf } from "./hook-source.mjs";
//   kitForm(command) -> whether it is one of the kit's forms, whole
//   fetchedBy(command) -> the path of the project it fetches from main, or null where it is in neither form
//   libraryOf(command) -> { library, rest } where it reads the script from the commit main pins of a library, at `rest`
//                         there, or null
//   fetchesMain(command) -> whether, in any form, it has git show a file of the remote's main (#1273, point 2)

// The starter kit's two forms of a hook's command, as setup/'s templates write them: its script fetched from main into
// "$f" and run, perhaps with plain words after it, and nothing else, the second after one or more tests that a file is
// there or is not; only the paths and those words change.
const KIT_PATH = "[\\w.-]+(?:/[\\w.-]+)*", KIT_ARGS = "((?: [\\w.-]+)*)";
// (the path fetched from main, written one way alone: each name starting with a letter, a digit, "_" or "-", so no "."
// or "..", which git reads from the folder it runs in, and no other spelling of the same file)
const FETCHED = "[\\w-][\\w.-]*(?:/[\\w-][\\w.-]*)*";
const kitFetch = (dir, library = "") => `f=\\$\\(git -C "${dir}" --no-replace-objects show refs/remotes/origin/main:(?<fetched>${FETCHED}) 2>/dev/null${library}\\)`;
// What core-path.mjs's hookCommands writes for a copy at another path than core/: the start's first test that the floor
// can be read there, which stops a session that cannot, and, where a library carries the core, the script read from the
// library's commit that main pins when main's own tree holds the library as a commit alone (never the working tree's: a
// branch can commit files that form a bare repository where the library stands, or the folder itself as a link, which git,
// run in that folder or at its .git, finds there and reads objects and a config from; the command names the superproject's
// own module repository, which git gives for the library's path (`--git-path modules/<library>`) and a branch cannot
// commit, so the one git has there is the only one it opens, on every version of git; and the path it shows in the
// library's commit is the one fetched first, below it: fetchedBy() reads the two as one).
const FLOOR_TEST = `\\[ -f "\\$\\{CLAUDE_PROJECT_DIR:-\\.\\}"/${KIT_PATH} \\] \\|\\| \\{ echo "[^"'$\`\\\\]*"; exit 0; \\}; `;
const PIN_FALLBACK = ` \\|\\| \\{ s=\\$\\(git -C "\\$\\{CLAUDE_PROJECT_DIR:-\\.\\}" --no-replace-objects rev-parse refs/remotes/origin/main:(?<library>${FETCHED}) 2>/dev/null\\) && m=\\$\\(git -C "\\$\\{CLAUDE_PROJECT_DIR:-\\.\\}" rev-parse --git-path modules/\\k<library> 2>/dev/null\\) && git -C "\\$\\{CLAUDE_PROJECT_DIR:-\\.\\}" --git-dir="\\$m" --no-replace-objects show "\\$s:(?<rest>${FETCHED})" 2>/dev/null; \\}`;
const KIT_FORMS = [
  new RegExp(`^bash -c '(?:${FLOOR_TEST})?${kitFetch("\\$\\{CLAUDE_PROJECT_DIR:-\\.\\}", `(?:${PIN_FALLBACK})?`)} \\|\\| (?:exit 0|\\{ echo "[^"'$\`\\\\]*"; exit 0; \\}); (?:bash -c "\\$f"${KIT_ARGS}|node --input-type=module -e "\\$f"())'$`, "u"),
  new RegExp(`^bash -c 'r=\\$\\(git rev-parse --show-toplevel 2>/dev/null\\) \\|\\| exit 0; (?:\\[ (?:! )?-f "\\$r/${KIT_PATH}" \\] \\|\\| exit 0; )+${kitFetch("\\$r")} \\|\\| exit 0; CLAUDE_PROJECT_DIR="\\$r" bash -c "\\$f"${KIT_ARGS}'$`, "u"),
];

// What a command in one of the kit's forms matched, its named groups, or null where it is in neither, or reads, where the
// library carries the core, another file of the library's commit than the one it fetched first: the two are one path, the
// library's folder, a "/", then the path in the library.
function matched(command) {
  for (const form of KIT_FORMS) {
    const found = form.exec(String(command));
    if (found) return found.groups.library === undefined || found.groups.fetched === `${found.groups.library}/${found.groups.rest}` ? found.groups : null;
  }
  return null;
}
// The path a command in one of the kit's forms fetches from main, or null where the command is in neither.
export const fetchedBy = command => matched(command)?.fetched ?? null;
export const kitForm = command => fetchedBy(command) !== null;
// Where the command in a kit's form reads the script from the library's commit main pins: { library, rest }, `rest` the
// script's path in the library; null where it has no such fallback, or is in no form.
export function libraryOf(command) {
  const found = matched(command);
  return found?.library === undefined ? null : { library: found.library, rest: found.rest };
}
// Whether a command, in the kit's form or one of its own, has git show a file of the remote's `main` (`git … show
// refs/remotes/origin/main:<path>`, the ref perhaps quoted), read from its words alone: git where a command starts
// (after a line's start, a separator, a brace or a quote, then perhaps then, do, else or exec, then perhaps variables set
// before it, each ending at a space, so a run of them splits one way alone; never in an echo's words or a comment), the path from the repository's root (never ./ or ../, which git reads from the folder it
// runs in), and no redirection of its output (`>`, `1>` or `&>`, never `2>`, which sends only errors aside) right after
// the path. A command past MAIN_MAX characters reads as fetching nothing (the safe mark), so a crafted one costs no
// long match. It does not show that what is fetched is what runs: a hook so read is only marked as it stands ("from":
// "main", agent-tools-entries.mjs), and whether it runs main's copy stays a security judgement.
const MAIN_MAX = 4096;
const FROM_MAIN = /(?:^|[\n;&|({`'"])\s*(?:(?:then|do|else|exec)\s+)?(?:\w+=[^\s;&|]*\s+)*git\b[^;&|\n#]{0,512}?\sshow\s{1,16}["']?refs\/remotes\/origin\/main:(?!\.{1,2}\/)(?=([^\s;&|"'`)]+))\1(?!["']?\s*(?:1|&)?>)/u;
export const fetchesMain = command => String(command).length <= MAIN_MAX && FROM_MAIN.test(String(command));
