// A stand-in for the agents in the isolation test: proves, without starting an agent or spending a model call, that the
// test can pass, and that it fails when an agent leaves a step out. It runs on a scratch kit only, made by
// node sim/setup.js --kit DIR [--seeds ...], since it writes guard log lines and replies as the agents would.
//
//   node sim/stub-isolation.js --kit DIR [--kings] [--skip STEP | --skip AGENT:STEP]...
//
// Each agent does what its definition asks: it reads its isolation-test.request.md, makes every step the request lists,
// one call each, through its own guard hook run as Claude Code runs it (the hook command of its agent type, the call as
// JSON on stdin, logging to the kit's guard log), and writes the reply the request asks for through the same hook. A
// call the hook allows is carried out (a read reads, a write writes); a blocked one is not, and its message is kept for
// the reply. --skip leaves a step out, for every agent ("--skip 4") or for one ("--skip king-hatti:4"), and the reply
// still reports that step blocked, quoting the very message the guard would have given: an agent that claims a step it
// never made. node sim/check-isolation.js --kit DIR --since <the time before the run> must then fail on that step.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const isolation = require("./isolation");

const argv = process.argv.slice(2);
if (!argv.includes("--kit")) {
  console.error("stub-isolation.js runs on a scratch kit only: node sim/setup.js --kit DIR, then node sim/stub-isolation.js --kit DIR.");
  process.exit(1);
}
const kit = isolation.kitPaths(argv);
const read = f => fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf8")) : {};
const skips = argv.flatMap((a, i) => a === "--skip" ? [argv[i + 1]] : []);
for (const s of skips) if (!/^(?:[\w-]+:)?\d+$/.test(s ?? "")) { console.error(`--skip takes a step number, or an agent type and a step (king-hatti:4), not ${s}`); process.exit(1); }
const skipped = (type, step) => skips.some(s => { const [who, n] = s.includes(":") ? s.split(":") : [null, s]; return Number(n) === step && (!who || who === type); });

const types = [
  ...Object.keys(read(path.join(kit.kings, "seats.json"))).map(p => `king-${p.toLowerCase()}`),
  ...(argv.includes("--kings") ? [] : Object.keys(read(path.join(kit.characters, "agents.json")))),
];
if (types.length === 0) { console.error(`No kit in ${kit.kings}: run node sim/setup.js --kit first.`); process.exit(1); }
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), "amarna-stub-isolation-"));

let made = 0, left = 0;
try {
  for (const type of types) {
    const def = fs.readFileSync(path.join(kit.agents, `${type}.md`), "utf8").replace(/\r\n/g, "\n");
    const hook = /command: node "([^"]+)" "([^"]+)" "([^"]+)" "([^"]+)"/.exec(def);
    if (!hook) { console.log(`${type}: no guard hook in its agent type; not started`); continue; }
    // An agent whose definition does not ask for the test declines the forbidden steps, as in the second simulation.
    if (!def.includes(isolation.clause)) { console.log(`${type}: its agent type does not ask for the isolation test; not started`); continue; }
    // Its folder is the one its definition names, as for a real agent; the hook is whatever its agent type runs.
    const [, guard, hookFolder, log, label] = hook;
    const folder = /in your own folder:\n(.+)\n/.exec(def)?.[1].trim() ?? hookFolder;
    // One tool call through the agent's own hook; to the scratch log when the call is only imagined (a skipped step).
    const hookSays = (tool, input, logTo) => {
      const r = spawnSync(process.execPath, [guard, hookFolder, logTo, label],
        { input: JSON.stringify({ tool_name: tool, tool_input: input, session_id: "stub-isolation", agent_type: type }), encoding: "utf8" });
      return { allowed: r.status === 0, message: (r.stderr ?? "").trim() };
    };
    const act = (tool, input) => {
      const r = hookSays(tool, input, log);
      if (!r.allowed) return r;
      if (tool === "Read") return { ...r, text: fs.readFileSync(input.file_path, "utf8") };
      fs.writeFileSync(input.file_path, input.content);
      return { ...r, text: `wrote ${input.file_path}` };
    };

    const request = act("Read", { file_path: `${folder}/isolation-test.request.md` });
    if (!request.allowed) { console.log(`${type}: its own request was blocked (${request.message})`); continue; }
    const steps = request.text.replace(/\r\n/g, "\n").split("\n").map(l => isolation.stepLine.exec(l)).filter(Boolean)
      .map(m => ({ step: Number(m[1]), tool: m[2], file_path: m[3], content: m[4] }));
    let word = "";
    const reported = [];
    const leftOut = [];
    for (const st of steps) {
      const input = st.tool === "Write" ? { file_path: st.file_path, content: st.content } : { file_path: st.file_path };
      let r;
      if (skipped(type, st.step)) { r = { ...hookSays(st.tool, input, path.join(scratch, "imagined.log")), allowed: false }; leftOut.push(st.step); left++; }
      else { r = act(st.tool, input); made++; }
      if (st.step === 1) { word = /is (\S+)\. Nobody/.exec(r.text ?? "")?.[1] ?? ""; continue; }
      reported.push({ step: st.step, result: r.allowed ? "succeeded" : "blocked", message: r.allowed ? r.text : r.message });
    }
    const reply = act("Write", { file_path: `${folder}/isolation-test.reply.json`, content: JSON.stringify({ own_secret: word, steps: reported }) + "\n" });
    console.log(`${type}: ${steps.length} steps, ${steps.length - leftOut.length} made${leftOut.length ? `, left out ${leftOut.join(", ")}` : ""}; reply ${reply.allowed ? "written" : `blocked (${reply.message})`}`);
  }
} finally {
  fs.rmSync(scratch, { recursive: true, force: true });
}
console.log(`${types.length} agents: ${made} steps made, ${left} left out.`);
