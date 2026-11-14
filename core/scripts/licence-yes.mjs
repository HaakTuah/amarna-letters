// The owner's yes (floor rule 10, in floor/topics.md beside this folder: "one the owner wants anyway waits for the
// owner's yes"), for the licence check (licences.mjs, beside this file) and the NuGet check (nuget.mjs): how a config
// names what is off its list and accepted all the same, and what no yes takes in. A package is named with its one
// exact version, as { "package": "<name>@<version>", "licence": what it is under (an SPDX expression of ids the
// licence check knows, or LicenseRef-<a name for it>, as LicenseRef-Vendor-EULA for one that was bought, so that a
// machine can read it), "ships": true or false, "yes": the owner's words and their date, "notice": its notice, where
// it ships }; in the licence check's "accepted" an audit entry (a font, an image, a tool a script installs) is named
// as { "entry": its name in the audit, "version": its version there, where it has one, "licence", "ships", "yes" },
// its notice being the entry's own. A yes holds for what the owner saw and no further: for one version and not the
// next, for the licence it names and not another the lockfile, the manifest or the audit comes to record, for a
// tool and not for what ships; and none takes in terms the floor never allows (non-commercial, no-derivatives,
// source-available), by any id or word for them the licence check knows, in the yes or in what else names the
// licence. Each check fails a yes that nothing needs any more, so a list only shrinks by itself. What no machine
// holds: that a name the owner gave (LicenseRef-<name>) is true to the terms it stands for, a package whose own
// fields say "UNLICENSED" or point to a file being read by hand like any other; and whether the owner said what a
// "yes" quotes. The reviews hold both, the config being a protected file. Node's own modules only; it reads no file.

/**
 * A list of what the owner accepted off a list (this config's "accepted", the NuGet check's "nuget.accepted"),
 * checked: `key` is its name in the config, `named` what a package's "<name>@<version>" looks like there, `shape` the
 * words for it, and `same` what makes two names one. With `entries`, an item may name an audit entry instead. A key or
 * a shape it does not know would check less without a word.
 */
export function acceptedList(list = [], key, named, shape, { entries = false, same = (name) => name } = {}) {
  const text = (v) => typeof v === "string" && v.trim() !== "";
  const only = (a, keys) => Object.keys(a).every((k) => keys.includes(k));
  const whole = (a) => a && typeof a === "object" && !Array.isArray(a) && text(a.yes) && (a.package !== undefined
    ? only(a, ["package", "licence", "ships", "yes", "notice"]) && text(a.package) && named.test(a.package) && text(a.licence)
      && typeof a.ships === "boolean" && (a.notice === undefined || typeof a.notice === "string")
    : entries && only(a, ["entry", "version", "licence", "ships", "yes"]) && text(a.entry) && (a.version === undefined || text(a.version))
      && text(a.licence) && typeof a.ships === "boolean");
  if (!Array.isArray(list) || !list.every(whole)) throw new Error(`the config's "${key}" is not a list of { "package": "${shape}", "licence": ..., "ships": true or false, "yes": ..., and "notice" where it ships }${entries ? ', or { "entry": an audit entry\'s name, its "version" where it has one, "licence": ..., "ships": ..., "yes": ... }' : ""}`);
  const names = list.map((a) => (a.package !== undefined ? `package ${same(a.package)}` : `entry ${a.entry}${a.version === undefined ? "" : `, version ${a.version}`}`));
  const again = names.filter((n, i) => names.indexOf(n) !== i);
  if (again.length) throw new Error(`the config's "${key}" names one twice: ${[...new Set(again)].join(", ")}`);
  return list;
}

/** Whether a licence is named so that a machine can read it: a whole SPDX expression, each licence in it one of `ids`
 *  or LicenseRef-<name>, an exception's id after WITH, its brackets closed and nothing left over, its words parted by
 *  spaces alone (scripts/readers-test.mjs, in the core's own tests, holds it to SPDX's own parser). */
export function readable(licence, ids) {
  const words = typeof licence === "string" && !/[^\x20-\x7e]/u.test(licence) ? licence.match(/\(|\)|[^ ()]+/gu) ?? [] : [];
  const joins = ["AND", "OR", "WITH"];
  if (words.length > 100) return false; // (no licence anyone wrote is that long, and each bracket is a call deeper)
  let at = 0;
  const term = () => {
    if (words[at] === "(") { at++; return level() && words[at++] === ")"; }
    const name = words[at++];
    if (name === undefined || !(ids.has(name) || /^LicenseRef-[A-Za-z0-9][A-Za-z0-9.-]*$/u.test(name))) return false;
    if (words[at] !== "WITH") return true;
    const exception = words[at + 1];
    at += 2;
    return exception !== undefined && !joins.includes(exception.toUpperCase()) && /^[A-Za-z0-9][A-Za-z0-9.-]*$/u.test(exception);
  };
  const level = () => {
    if (!term()) return false;
    while (words[at] === "AND" || words[at] === "OR") { at++; if (!term()) return false; }
    return true;
  };
  return level() && at === words.length;
}

/**
 * What stands against an owner's yes for `name`, which is off its list: the lines that fail it. `a` is the yes
 * ({ licence, ships, notice }), `shipped` whether what it names is held as what ships, `others` what else names its
 * licence (a lockfile, a manifest, an audit entry: one of them that a machine can read and that differs from the
 * yes's fails it), `lists` the licence check's `policy`, and `where` the place its notice stands, or null where
 * another rule holds the notice.
 */
export function yesFaults(name, a, shipped, others, lists, where) {
  const ids = new Set([...lists.tools, ...lists.allowedFor("", true, "data"), ...lists.allowedFor("", true, "font")]);
  // (what a lockfile or an audit holds for a licence may be no text at all: read as the JSON it is, so nothing hides in it)
  const said = others.filter((l) => l !== undefined && l !== null).map((l) => (typeof l === "string" ? l : JSON.stringify(l)));
  const never = [a.licence, ...said].filter((l) => lists.never.test(l));
  const faults = [];
  if (never.length) faults.push(`${name}: accepted, and under ${never[0]}, terms floor rule 10 never allows`);
  const other = said.find((l) => l.trim() !== String(a.licence).trim() && readable(l, ids));
  if (other !== undefined) faults.push(`${name}: accepted under ${a.licence}, and recorded as under ${other}: another licence is another yes`);
  if (!readable(a.licence, ids)) faults.push(`${name}: accepted under "${a.licence}", which no machine can read: name it by an SPDX id this check knows, or as LicenseRef-<a name for it>, as LicenseRef-Vendor-EULA for one that was bought`);
  if (shipped && a.ships !== true) faults.push(`${name}: accepted as a tool that only runs ("ships": false), and it is held as what ships: a yes for a tool is no yes for what ships (floor rule 10)`);
  if (where && shipped && !a.notice?.trim()) faults.push(`${name}: it ships, so its notice ships too (floor rule 10): its "notice" in ${where}`);
  return faults;
}
