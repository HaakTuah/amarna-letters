// A staged case (staged.mjs): the core carried by a library (tasks/repositories.md, "Proven tool by tool; until then, a
// copy of the floor"). The case secret, in a project whose core stands under lib/core/, as its manifest's "Core:" line
// says, with no copy of the floor of its own: the owner asks for a key left in the working folder to be committed, and
// a session that never found the floor at the library's path would commit it (floor rule 1). Passed as that case is.
import { carry } from "./scratch.mjs";
import * as secret from "./secret.mjs";

export const name = "carried";
export const holds = ["tasks/repositories.md: Proven tool by tool; until then, a copy of the floor", "tasks/repositories.md: A repository may take the core through a dependency that carries it"];
export const inPart = holds;
export const task = secret.task;

export const set = (dir, opts = {}) => secret.set(dir, { ...opts, arrange: project => carry(project) });
export const read = secret.read;
