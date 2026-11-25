// The daily look's reading of the host and of its own record (look.mjs, beside this file; #1092): what GitHub answers for
// the repository, read once in a project, with the labels of the core's list made first in GitHub's job; and the lines of
// the record that say when the packages were looked up and the host read. Node's own modules, through the scripts named.
import { ghApi, makeLabels } from "./labels.mjs";
import { readHost, refusal } from "./host.mjs";
import { HOST_READ, LOOKED } from "./step-checks-host.mjs";
import { project } from "./steps.mjs";
import { recordBody } from "./look-keep.mjs";
import { staleFinding } from "./look-checks.mjs";

// What GitHub answers for the repository, read once in a project (host.mjs), with the record as this run writes it, so
// the steps that read the record (330, 600, 820) read this run; and, in GitHub's job, the labels of the core's list made
// first, each write refused said: { host (null where it was not read), refused }. `gh` and `ask` are labels.mjs's and
// host.mjs's ways to GitHub, or a test's stand-ins.
export function hostOf(ctx, reach, { gh = ghApi, ask, root = process.cwd() } = {}) {
  const { repo, manifest, job, dry, at, say } = ctx, refused = [];
  if (job && !dry && reach.yes) { try { makeLabels(repo, gh, say); } catch (e) { refused.push(refusal("The labels of the core's list", e, "issues: write")); } }
  refused.forEach(r => say(r));
  if (manifest === null) return { host: null, refused };
  try { return { host: readHost(project(root), repo, { ...(ask ? { ask } : {}), reach, record: { body: recordBody({ ...ctx, hostRead: at }) }, at, looking: true }), refused }; } catch (e) { say(`The host was not read here (${e?.name ?? "an error"} in core/scripts/host.mjs), so the steps read on it are left out of this run.`); return { host: null, refused }; }
}

// What the look finds, kind by kind, each { title, what, unread }; and `stepsLeft`, the count of a release's steps not
// done (null where they were not read), for the state report.
// The packages a project holds looked up (look-checks.mjs's staleFinding), the record's line written where they were.
function lookUp(ctx) {
  const stale = staleFinding();
  if (!stale.unread) ctx.looked = ctx.at;
  return stale;
}

// The finding of the packages gone stale, where they were looked up this run: at once, or with the monthly report.
export function staleOf(ctx, report, stale) {
  if (!stale && report.monthly !== null && ctx.manifest !== null) return [lookUp(ctx)];
  return stale ? [stale] : [];
}

// What the record says of the look's runs before (its lines "Packages looked up:" and "Host read:"), set on `ctx`; in a
// project, the packages it holds looked up at once where the record shows they never were, as step 600 asks, and then
// once a month with the state report (#488, point 8; #1092).
export function recordRead(ctx, record) {
  ctx.looked = LOOKED.exec(record?.body ?? "")?.[1] ?? null;
  ctx.hostRead = HOST_READ.exec(record?.body ?? "")?.[1] ?? null;
  return ctx.manifest !== null && !ctx.looked ? lookUp(ctx) : null;
}
