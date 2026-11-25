// A project's calls to the core's workflows, by the workflow's name (#366), and what each passes as an input: read
// beside the config readers (check-configs.mjs) and the readers of a workflow's steps (own-runs.mjs). A workflow the
// reader cannot read is a step that cannot be read (Unread), never one done or missing.
import { installed } from "./packages.mjs";
import { corePath } from "./core-path.mjs";
import { CORE } from "./core-address.mjs";

// A config, or a workflow, the reader cannot read: a step that would need it throws this, naming why, so the step is
// reported as not read, never as done or as missing.
export class Unread extends Error {}
// (`mentions` says, from a workflow's text, whether the check would read it)
export const readable = (p, mentions) => {
  const unread = Object.entries(p.workflows).filter(([, w]) => !w.yaml && mentions(w.text ?? "")).map(([f]) => `.github/workflows/${f}`);
  if (unread.length) throw new Unread(installed("yaml") ? `the core's reader cannot read ${unread.join(", ")}, in a form it does not know`
    : `the core's packages are not installed, so ${unread.join(", ")} could not be read: run \`if [ -f ${corePath(p.root) || "core/"}scripts/install.mjs ]; then node ${corePath(p.root) || "core/"}scripts/install.mjs; fi\`, then this again`);
};
// A project's calls to a workflow of the core's, by the workflow's name: each as [where, job] (its file and its job,
// with uses and with); `calls` the jobs alone, and `call` the first.
const calling = (p, name) => (readable(p, text => text.toLowerCase().includes(`/.github/workflows/${name}@`.toLowerCase())), Object.entries(p.workflows))
  .flatMap(([f, { yaml }]) => Object.values(yaml?.jobs ?? {}).map(job => [`.github/workflows/${f}`, job]))
  .filter(([, job]) => typeof job?.uses === "string" && job.uses.toLowerCase().startsWith(`${CORE}/.github/workflows/${name}@`.toLowerCase()));
export const calls = (p, name) => calling(p, name).map(([, job]) => job);
// The files that call it, each once.
export const callers = (p, name) => [...new Set(calling(p, name).map(([where]) => where))];
export const call = (p, name) => calls(p, name)[0] ?? null;
// What each call to the core's workflow `name` passes as its input `key`, as { where, value }: undefined where it passes
// none. One that names it only when the workflow runs (an expression) throws, so the check that needs it is not read.
export function given(p, name, key) {
  return calling(p, name).map(([where, job]) => {
    const value = job.with?.[key];
    if (typeof value === "string" && value.includes("${{")) throw new Unread(`${where} passes the core's ${name} its ${key} as ${value}, which names it only when the workflow runs`);
    return { where, value };
  });
}
// The calls to the core's core.yml that run a part of its one job (#376) with the input `key`: a call that gives none
// runs no such part, and is left out; one that gives no text is not read.
export const folded = (p, key) => given(p, "core.yml", key).filter(({ value }) => value !== undefined && value !== null && value !== "" && value !== false);
// The copy's folder, from the manifest (core-path.mjs), "core/" where it names none.
export const copyAt = p => { try { return (p.root && corePath(p.root)) || "core/"; } catch { return "core/"; } };
