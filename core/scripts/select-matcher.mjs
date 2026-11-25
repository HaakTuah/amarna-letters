// The pathspec matcher of the selection (select.mjs; tasks/tests.md, "A pull request runs the tests its change can
// reach"): whether a path is one of git pathspecs', as git's default wildcards and ":(glob)" read them. Split from the
// selection so that what changes how a pattern matches is read apart from what a change selects (#943).

// A pattern as a list of steps, matched by walking every step a path could stand at at once, so a match takes time in
// proportion to the path's length times the pattern's, whatever runs of wildcards it holds: each step is a character
// ({ one: test }), a run of any length ({ run: test }), or a choice that consumes nothing ({ fork: n }: the next step,
// or the step n on, as "**/" is nothing or a run that ends in "/", the choice made before the run, never inside it).
const LINE_END = /[\n\r\u2028\u2029]/u; // (where a wildcard of git's default stops, as "." does in a regular expression)
const literal = c => ({ one: ch => ch === c });
// One part of a pathspec with git's default wildcards: "*" any run (across folders too), "?" one character, "[...]"
// one of a set ("[!...]" one not in it), anything else itself.
function wild(spec) {
  const steps = [];
  for (const p of spec.split(/(\*+|\?|\[!?[^\]]+\])/u)) {
    if (/^\*+$/u.test(p)) steps.push({ run: ch => !LINE_END.test(ch) }); // (a run of stars is one star)
    else if (p === "?") steps.push({ one: ch => !LINE_END.test(ch) });
    else if (/^\[!?[^\]]+\]$/u.test(p)) {
      const not = p.startsWith("[!"), set = new RegExp(`^[${p.slice(not ? 2 : 1, -1).replace(/[\\\]^]/gu, "\\$&")}]$`, "u");
      steps.push({ one: ch => set.test(ch) !== not });
    } else for (const c of p) steps.push(literal(c));
  }
  return steps;
}
// One of ":(glob)": "**/" any folders, "**" any run, "*" a run within one folder, anything else itself.
function globSteps(spec) {
  const steps = [];
  for (const p of spec.split(/(\*\*\/|\*\*|\*)/u)) {
    if (p === "**/") steps.push({ fork: 3 }, { run: () => true }, literal("/"));
    else if (p === "**") steps.push({ run: () => true });
    else if (p === "*") steps.push({ run: ch => ch !== "/" });
    else for (const c of p) steps.push(literal(c));
  }
  return steps;
}
// Whether the steps match the whole path.
function walks(steps, f) {
  const close = at => {
    const all = new Set(at);
    for (const i of all) if (steps[i]?.run || steps[i]?.fork) { all.add(i + 1); if (steps[i].fork) all.add(i + steps[i].fork); }
    return all;
  };
  let at = close([0]);
  for (const ch of f) {
    const next = new Set();
    for (const i of at) {
      const step = steps[i];
      if (step?.run) { if (step.run(ch)) next.add(i); }
      else if (step?.one?.(ch)) next.add(i + 1);
    }
    if (!next.size) return false;
    at = close(next);
  }
  return at.has(steps.length);
}

// Whether a path is one of git pathspecs': a plain one is the path or a folder above it, or, where it holds a
// wildcard, matches as git's default does ("*", "?" and "[...]", across folders too); one of ":(glob)" is a glob ("**" any
// folders, "*" within one); and ":!" or ":(exclude)" leaves out what it matches.
export function matcher(specs) {
  const one = spec => {
    const glob = spec.startsWith(":(glob)"), body = spec.replace(/^:\((glob|exclude)\)|^:!/u, "");
    if (!glob && /[*?[]/u.test(body)) { const steps = wild(body); return f => walks(steps, f); }
    if (!glob) { const plain = body.replace(/\/$/u, ""); return f => plain === "." || f === plain || f.startsWith(`${plain}/`); }
    const steps = globSteps(body);
    return f => walks(steps, f);
  };
  const out = s => s.startsWith(":!") || s.startsWith(":(exclude)");
  const ins = specs.filter(s => !out(s)).map(one), outs = specs.filter(out).map(one);
  return f => ins.some(m => m(f)) && !outs.some(m => m(f));
}
