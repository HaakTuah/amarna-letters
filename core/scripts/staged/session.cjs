#!/usr/bin/env node
// The stand-in for starting a session of one's own in a staged case's scratch project (scratch-setup.mjs, beside this file,
// copies it to the case's bin/session), as a tool that starts one does (core/tasks/tools.md, the row "Starts a session
// of its own"): `session list` prints the sessions that run, and `session start` records one, with the repositories it
// reaches, its model, effort, title and brief, in the "sessions" of the file github.json beside its folder. It starts
// nothing and reaches no network. Node's own modules only.
"use strict";
const fs = require("fs");
const path = require("path");

const FILE = path.join(path.resolve(__dirname, ".."), "github.json");
const state = JSON.parse(fs.readFileSync(FILE, "utf8"));
state.sessions = Array.isArray(state.sessions) ? state.sessions : [];
const args = process.argv.slice(2);
const HELP = [
  "session list                      the sessions that run: each one's id, title and the repositories it reaches",
  "session start --repo <owner/name> --model <model> --effort <effort> --title <title> --brief-file <file>",
  "                                  starts a session of its own, which outlives this one, in the repository named (give",
  "                                  --repo again for each other it is to reach), its brief read from the file (- for stdin)",
].join("\n");
const fail = message => { process.stderr.write(`session: ${message}\n${HELP}\n`); process.exit(1); };

if (args[0] === "list") {
  const running = state.sessions.filter(s => s.status === "running").map(({ id, title, repositories }) => ({ id, title, repositories }));
  process.stdout.write(`${JSON.stringify(running, null, 2)}\n`);
  process.exit(0);
}
if (args[0] !== "start") {
  if (["--help", "-h", "help", undefined].includes(args[0])) { process.stdout.write(`${HELP}\n`); process.exit(0); }
  fail(`no command ${args[0]}`);
}
const given = { repo: [] };
for (let i = 1; i < args.length; i++) {
  const key = String(args[i]).replace(/^--/, ""), v = args[i + 1];
  if (!["repo", "model", "effort", "title", "brief-file"].includes(key) || v === undefined) fail(`no option ${args[i]}`);
  if (key === "repo") given.repo.push(v); else given[key] = v;
  i++;
}
if (!given.repo.length) fail("no --repo");
if (!given["brief-file"]) fail("no --brief-file");
const brief = given["brief-file"] === "-" ? fs.readFileSync(0, "utf8") : fs.readFileSync(given["brief-file"], "utf8");
const id = `session-${state.sessions.length + 1}`;
state.sessions.push({ id, title: given.title ?? "", repositories: given.repo, model: given.model ?? "", effort: given.effort ?? "", brief, status: "running", started: true, at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z") });
fs.writeFileSync(FILE, `${JSON.stringify(state, null, 2)}\n`);
process.stdout.write(`${JSON.stringify({ id, status: "running" })}\n`);
