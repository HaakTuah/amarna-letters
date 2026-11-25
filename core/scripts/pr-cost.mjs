// The cost line a description carries, or the mark that the script printed none (split from pr-description.mjs, #888; "An exemption leaves a mark" in roles/shared/work-flow.md; #302). pr-description.mjs,
// beside this file, says what the check asks as a whole, runs this one and exports what it holds.

export const NO_COST = "No cost line: the script printed none.";

// The mend where a description has neither the line session-cost.mjs prints ("Session so far: ...") nor the mark that
// it printed none, each on a line of its own; null where it has one.
export function costMend(body) {
  const lines = String(body ?? "").split(/\r\n|\r|\n/u).map(l => l.trim());
  if (lines.some(l => /^Session so far: [\d,]+ answers\b/u.test(l) || l === NO_COST)) return null;
  return `the description has neither the line the cost script prints nor the mark that it printed none. Mend: run \`node core/scripts/session-cost.mjs\` (\`node scripts/session-cost.mjs\` in the core) and put the line it prints above the closing lines; where it prints nothing, put there instead, on a line of its own, "${NO_COST}"`;
}
