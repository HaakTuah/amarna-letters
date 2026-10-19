// PreToolUse guard for the sim-poller agent, which a workflow uses to orchestrate a simulation (see sim/README.md,
// "Orchestrating from a workflow"). It allows a Bash command that runs sim/wait.js with plain arguments, and the
// StructuredOutput call that hands the answer back to the workflow (it reaches no file). Everything else is blocked
// (exit code 2), so the poller can never read a seat's files.
//
//   node sim/poller-guard.js        (the hook input arrives on stdin as JSON)
let raw = "";
process.stdin.on("data", d => (raw += d));
process.stdin.on("end", () => {
  let input = {};
  try { input = JSON.parse(raw); } catch { /* an unreadable call is blocked below */ }
  const command = String(input.tool_input?.command ?? "").trim();
  const ok = input.tool_name === "StructuredOutput"
    || (input.tool_name === "Bash" && /^node sim\/wait\.js( [A-Za-z0-9_./:-]+)*$/.test(command));
  if (ok) process.exit(0);
  process.stderr.write("Blocked: you may only run node sim/wait.js with its arguments.");
  process.exit(2);
});
