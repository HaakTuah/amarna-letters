// Checks the personal-terms check (floor rule 11; .github/workflows/personal-terms.yml): its own job, run as GitHub
// runs it (workflow-run.mjs, beside this file), on scratch pull requests, each checked out as GitHub checks one out: its
// merge into its base. What fails: a term in a file, in a line a commit adds and a later one takes away, in a line a
// merge's own resolution adds, in a file's name (an empty file, a rename, a binary file, a name outside plain ASCII),
// in a commit's message, author or committer (name or address), in a private repository too, its failure saying how
// to mend it, and in the title or description; a commit dated before the rule too, since a date is whatever its maker
// writes. What passes: none of these; a term only in a file git reads as binary (not read); a file on main named with
// a term before the rule, deleted or renamed away; only in the
// author of a commit GitHub itself made (floor rule 11's exception: a merge or an edit on github.com, under a profile
// GitHub wrote on a merge of main's, not one through its API under an author its caller named), committed as GitHub and
// signed by its key, while
// one written to look so (unsigned, signed by another key, or with a certificate made to look like GitHub's) fails, and so does every merge's author where the key
// cannot be fetched; only in a commit of the base's, though the event
// names an older base; and a repository without the secret. The terms are invented, built from pieces as the test
// runs, so no file holds them. On Linux and on Windows. Git, bash and Node's own modules.
//
//   node scripts/personal-terms-test.mjs
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runWorkflow } from "./workflow-run.mjs";

let failed = 0, count = 0;
const ok = (cond, what, detail = "") => { count++; if (cond) console.log(`ok   ${what}`); else { failed++; console.error(`FAIL ${what}${detail && `\n     ${String(detail).slice(0, 800).replace(/\n/g, "\n     ")}`}`); } };
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/personal-terms.yml"), "utf8");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "personal-terms-test-"));
process.on("exit", () => { try { fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* (left to the system's own cleaning) */ } });
const [term, other, wide] = [["qz", "vk", "wy"], ["xj", "qq", "zf"], ["zç", "qñ", "x"]].map(t => t.join(""));
const TERMS = `${term}\n${other}\n${wide}\n`;
const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(GIT_|GITHUB_|RUNNER_|ACTIONS_|CI$)/i.test(name)));
Object.assign(env, { GIT_CONFIG_GLOBAL: path.join(tmp, "none"), GIT_CONFIG_NOSYSTEM: "1", GIT_AUTHOR_DATE: "2026-11-13T12:00:00Z", GIT_COMMITTER_DATE: "2026-11-13T12:00:00Z" });
const ME = { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.invalid", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.invalid" };
const git = (dir, args, extra = {}) => execFileSync("git", args, { cwd: dir, env: { ...env, ...ME, ...extra }, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const AS_GITHUB = { GIT_COMMITTER_NAME: "GitHub", GIT_COMMITTER_EMAIL: "noreply@github.com" };
// GitHub's own signing key, stood in for by one made here, which a stand-in for curl serves as the check fetches it;
// where gpg cannot run (a Windows runner without it), the cases that need a signature are left out, said below. The
// check itself runs only on GitHub's Linux runners.
const bash = (script, extra = {}) => spawnSync("bash", ["-c", script], { env: { ...env, ...extra }, encoding: "utf8" });
const signer = path.join(tmp, "signer"), stranger = path.join(tmp, "other-signer"), stubs = path.join(tmp, "stubs");
const keyFile = path.join(tmp, "web-flow.gpg");
fs.mkdirSync(stubs);
fs.writeFileSync(path.join(stubs, "curl"), `#!/bin/sh\n[ -f "$STAND_IN_KEY" ] || exit 22\ncat "$STAND_IN_KEY"\n`, { mode: 0o755 });
const makeKey = (home, who) => { fs.mkdirSync(home, { mode: 0o700 }); return bash(`gpg -q --batch --pinentry-mode loopback --passphrase '' --quick-gen-key '${who}' ed25519 sign never`, { GNUPGHOME: home }).status === 0; };
const signedBy = (home, key) => ({ GNUPGHOME: home, GIT_CONFIG_COUNT: "3", GIT_CONFIG_KEY_0: "commit.gpgSign", GIT_CONFIG_VALUE_0: "true", GIT_CONFIG_KEY_1: "gpg.program", GIT_CONFIG_VALUE_1: "gpg", GIT_CONFIG_KEY_2: "user.signingKey", GIT_CONFIG_VALUE_2: key });
process.on("exit", () => { for (const home of [signer, stranger]) bash("gpgconf --kill all", { GNUPGHOME: home }); });
// (gpg is tried whole first: both keys made, GitHub's exported, a commit signed with it and read back as good)
const gpg = (() => {
  try {
    if (!makeKey(signer, "GitHub <noreply@github.com>") || !makeKey(stranger, "Someone <someone@example.invalid>")) return false;
    fs.writeFileSync(keyFile, execFileSync("gpg", ["-q", "--batch", "--armor", "--export"], { env: { ...env, GNUPGHOME: signer } }));
    const probe = path.join(tmp, "gpg-probe"), keys = path.join(tmp, "gpg-probe-keys");
    fs.mkdirSync(probe);
    fs.mkdirSync(keys, { mode: 0o700 });
    git(probe, ["init", "-q"]);
    git(probe, ["commit", "-q", "--allow-empty", "-m", "signed"], { ...AS_GITHUB, ...signedBy(signer, "noreply@github.com") });
    execFileSync("gpg", ["-q", "--batch", "--import", keyFile], { env: { ...env, GNUPGHOME: keys }, stdio: "ignore" });
    return /^[GU]$/.test(git(probe, ["-c", "gpg.program=gpg", "log", "-1", "--format=%G?"], { GNUPGHOME: keys }));
  } catch {
    return false;
  } finally {
    bash("gpgconf --kill all", { GNUPGHOME: path.join(tmp, "gpg-probe-keys") });
  }
})();
// a commit as GitHub makes one: committed by GitHub and signed with its key
const GITHUB = gpg ? { ...AS_GITHUB, ...signedBy(signer, "noreply@github.com") } : AS_GITHUB;

let n = 0;
const put = (dir, files) => { for (const [name, text] of Object.entries(files)) { const at = path.join(dir, name); if (text === null) fs.rmSync(at); else { fs.mkdirSync(path.dirname(at), { recursive: true }); fs.writeFileSync(at, text); } } };
const commitAll = (dir, [files, extra = {}, message = "a change"]) => { if (typeof files === "function") files(dir); else put(dir, files); git(dir, ["add", "-A"]); git(dir, ["commit", "-q", "--allow-empty", "-m", message], extra); };
// A repository whose main holds a first commit and then `onMain`, and a pull request's branch, `change`, from the first
// commit with its `commits` (each [files or a function of the folder, extra env, message]).
function pull(commits, onMain = []) {
  const dir = path.join(tmp, `repo-${++n}`);
  fs.mkdirSync(dir);
  git(dir, ["init", "-q", "-b", "main"]);
  commitAll(dir, [{ "README.md": "# A project\n", "a.md": "one\ntwo\nthree\n" }, {}, "first"]);
  const first = git(dir, ["rev-parse", "HEAD"]);
  for (const c of onMain) commitAll(dir, c);
  git(dir, ["checkout", "-q", "-b", "change", first]);
  for (const c of commits) commitAll(dir, c);
  return { dir, first };
}
// The check's verdict, with the pull request checked out as GitHub merges it into the base's tip; the event names
// `eventBase`, the tip itself unless an older base is given.
function check({ dir, first }, { terms = TERMS, title = "A change", body = "Words.", stale = false, key = keyFile, isPrivate = false, opener = null } = {}) {
  const tip = git(dir, ["rev-parse", "main"]);
  git(dir, ["checkout", "-q", "--detach", "main"]);
  git(dir, ["merge", "-q", "--no-ff", "--no-edit", "change"], { ...GITHUB, ...(opener ? { GIT_AUTHOR_NAME: opener } : {}) });
  const github = { event_name: "pull_request", repository: "someone/project", ref: "refs/pull/1/merge", event: { pull_request: { title, body, base: { sha: stale ? first : tip } }, repository: { private: isPrivate } } };
  const base = { ...env, ...ME, STAND_IN_KEY: key, PATH: `${stubs}${path.delimiter}${env.PATH ?? env.Path ?? ""}` };
  const [job] = runWorkflow(workflow, { github, secrets: { PERSONAL_TERMS: terms }, base, workspace: () => dir, uses: { "actions/checkout": () => {} }, temp: tmp });
  return { passed: job.passed, out: job.steps.map(s => s.out).join("") };
}
const fails = (what, repo, opts) => { const r = check(repo, opts); ok(!r.passed && ![term, other, wide].some(t => r.out.includes(t)), `${what} fails, and the term is never printed`, r.out); };
const passes = (what, repo, opts) => { const r = check(repo, opts); ok(r.passed, `${what} passes`, r.out); };

passes("a pull request with no term anywhere", pull([[{ "b.md": "plain words\n" }]]));
fails("a term in a file", pull([[{ "b.md": `a line with ${term.toUpperCase()} in it\n` }]]));
fails("a term added in one commit and taken out in the next", pull([[{ "b.md": `${term}\n` }], [{ "b.md": "gone\n" }]]));
fails("a term in an empty file's name, the file removed again", pull([[{ [`notes-${other}.md`]: "" }], [{ [`notes-${other}.md`]: null }]]));
fails("a term in a file's new name, renamed and nothing else", pull([[dir => { git(dir, ["mv", "a.md", `${term}.md`]); }]]));
fails("a term in a binary file's name, the file removed again", pull([[{ [`${other}.bin`]: "\u0000x\u0000" }], [{ [`${other}.bin`]: null }]]));
fails("a term outside plain ASCII in a file's name", pull([[{ [`a-${wide}.md`]: "x\n" }]]));
// a file named with a term before the rule, already on main: taking it out passes, by deletion or by renaming it away
const leaked = [[{ [`old-${term}.md`]: "kept\n" }, { GIT_AUTHOR_DATE: "2026-10-01T00:00:00Z", GIT_COMMITTER_DATE: "2026-10-01T00:00:00Z" }, "before the rule"]];
const cleanup = change => { const repo = pull([], leaked); git(repo.dir, ["checkout", "-q", "-B", "change", "main"]); commitAll(repo.dir, [change]); return repo; };
passes("deleting a file named with a term before the rule", cleanup(dir => git(dir, ["rm", "-q", `old-${term}.md`])));
passes("renaming such a file to a clean name", cleanup(dir => git(dir, ["mv", `old-${term}.md`, "old.md"])));
fails("a term in a commit's message", pull([[{ "b.md": "x\n" }, {}, `fix for ${term}`]]));
fails("a term in a commit's author name", pull([[{ "b.md": "x\n" }, { GIT_AUTHOR_NAME: `A ${term}` }]]));
fails("a term in a commit's author address", pull([[{ "b.md": "x\n" }, { GIT_AUTHOR_EMAIL: `${other}@example.invalid` }]]));
fails("a term in a commit's committer name", pull([[{ "b.md": "x\n" }, { GIT_COMMITTER_NAME: term }]]));
// a name the machine's git writes into every commit fails in a private repository too, and the failure says how the
// session mends the pull request itself (core archive 202), naming both commits
const named = check(pull([[{ "b.md": "x\n" }, { GIT_AUTHOR_NAME: `A ${term}`, GIT_COMMITTER_EMAIL: `${other}@example.invalid` }], [{ "c.md": "y\n" }, { GIT_AUTHOR_NAME: `A ${term}` }]]), { isPrivate: true });
ok(!named.passed && /To mend it, on the machine that made them/.test(named.out) && /--reset-author/.test(named.out) && (named.out.split("author or committer (name or address):\n")[1]?.split("\n")[0].match(/\b[0-9a-f]{7,}\b/g) ?? []).length === 2 && ![term, other, wide].some(t => named.out.includes(t)),
  "a term in commits' author or committer fails in a private repository too, both commits named, the mend said and the term never printed", named.out);
// a merge of main into the branch, as "update branch" makes it (GitHub's) or as a person does
const onMain = [[{ "c.md": "y\n" }, {}, "on main"]];
// a merge GitHub made on main under the profile `name`, as each merge of a pull request is: the profiles the check takes
const profileOnMain = name => [[dir => { git(dir, ["checkout", "-q", "-b", "side"]); commitAll(dir, [{ "side.md": "s\n" }]); git(dir, ["checkout", "-q", "main"]); git(dir, ["merge", "-q", "--no-ff", "--no-edit", "side"], { GIT_AUTHOR_NAME: name, ...GITHUB }); }, {}, "after that merge"]];
const update = (committer, more = []) => pull([[{ "b.md": "x\n" }], [dir => { git(dir, ["merge", "-q", "--no-ff", "--no-edit", "main"], { GIT_AUTHOR_NAME: `A ${term}`, ...committer }); }]], [...onMain, ...more]);
if (gpg) {
  passes("a merge GitHub itself made into the branch, its author the merging account's profile, which GitHub wrote on a merge of main's (floor rule 11's exception)", update(GITHUB, profileOnMain(`A ${term}`)));
  fails("a merge GitHub signed into the branch, under an author no merge of GitHub's on main carries (as its API takes one), though it is a merge on the branch's own side", update(GITHUB));
  passes("a merge GitHub itself made into the branch, under a profile GitHub wrote on a squashed pull request of main's (one parent)", update(GITHUB, [[{ "sq.md": "s\n" }, { GIT_AUTHOR_NAME: `A ${term}`, ...GITHUB }, "a squashed pull request"]]));
  passes("the merge GitHub makes only to check the pull request, under the opener's profile, where main holds no commit of GitHub's under it", pull([[{ "b.md": "x\n" }]]), { opener: `A ${term}` });
  fails("a merge written to look like GitHub's, committed as GitHub but not signed", update(AS_GITHUB));
  fails("a merge committed as GitHub but signed by another key", update({ ...AS_GITHUB, ...signedBy(stranger, "someone@example.invalid") }));
  // a certificate made to look like GitHub's: an X.509 signature, which carries its own certificate and which gpgsm
  // reads as good where it is not told to trust none (made only where openssl and gpgsm can make one here)
  const forger = path.join(tmp, "x509");
  const x509 = (() => {
    try {
      fs.mkdirSync(forger, { mode: 0o700 });
      const run = (cmd, args, input) => execFileSync(cmd, args, { cwd: forger, env: { ...env, GNUPGHOME: forger }, input, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"], timeout: 30000 });
      run("openssl", ["req", "-x509", "-newkey", "rsa:2048", "-nodes", "-keyout", "key.pem", "-out", "cert.pem", "-days", "30", "-subj", "/CN=GitHub/emailAddress=noreply@github.com"]);
      run("openssl", ["pkcs12", "-export", "-legacy", "-inkey", "key.pem", "-in", "cert.pem", "-out", "id.p12", "-passout", "pass:"]);
      run("gpgsm", ["--batch", "--pinentry-mode", "loopback", "--passphrase-fd", "0", "--import", "id.p12"], "\n");
      const fpr = run("gpgsm", ["--with-colons", "--list-secret-keys"]).split("\n").find(l => l.startsWith("fpr:"))?.split(":")[9];
      if (!fpr) return null;
      fs.writeFileSync(path.join(forger, "trustlist.txt"), `${fpr.match(/../g).join(":")} S relax\n`);
      fs.writeFileSync(path.join(forger, "gpgsm.conf"), "disable-crl-checks\ninclude-certs -1\n");
      const signing = { GNUPGHOME: forger, GIT_CONFIG_COUNT: "4", GIT_CONFIG_KEY_0: "commit.gpgSign", GIT_CONFIG_VALUE_0: "true", GIT_CONFIG_KEY_1: "gpg.format", GIT_CONFIG_VALUE_1: "x509", GIT_CONFIG_KEY_2: "user.signingKey", GIT_CONFIG_VALUE_2: fpr, GIT_CONFIG_KEY_3: "gpg.x509.program", GIT_CONFIG_VALUE_3: "gpgsm" };
      // (tried first: a commit it signs reads as good to a gpgsm that trusts nothing of its own, as the check's runner would)
      const probe = path.join(tmp, "x509-probe"), empty = path.join(tmp, "x509-empty");
      fs.mkdirSync(probe);
      fs.mkdirSync(empty, { mode: 0o700 });
      git(probe, ["init", "-q"]);
      git(probe, ["commit", "-q", "--allow-empty", "-m", "signed"], { ...AS_GITHUB, ...signing });
      return /^[GU]$/.test(git(probe, ["-c", "gpg.x509.program=gpgsm", "log", "-1", "--format=%G?"], { GNUPGHOME: empty })) ? signing : null;
    } catch {
      return null;
    }
  })();
  process.on("exit", () => { for (const home of [forger, path.join(tmp, "x509-empty")]) bash("gpgconf --kill all", { GNUPGHOME: home }); });
  if (x509) fails("a merge committed as GitHub but signed with a certificate made to look like GitHub's (X.509)", update({ ...AS_GITHUB, ...x509 }));
  else console.log("note openssl or gpgsm cannot make a certificate here, so a merge signed with one is not tried");
  const unfetched = check(update(GITHUB, profileOnMain(`A ${term}`)), { key: path.join(tmp, "no-such-key") });
  ok(!unfetched.passed && unfetched.out.includes("could not be fetched") && !unfetched.out.includes(term), "where GitHub's key cannot be fetched, no merge is taken for GitHub's, and the run says so", unfetched.out);
} else {
  console.log("note gpg cannot run here, so the merges GitHub signs are not tried (the check runs on GitHub's Linux runners alone)");
}
fails("a merge anyone else made, with a term in its author", update({}));
if (gpg) {
  // an edit on github.com: GitHub signs it, its author the acting account's profile, which GitHub also wrote as the
  // author of a merge it made on main; one made through GitHub's API, under an author its caller named, does not pass
  passes("a commit that is no merge GitHub itself made (an edit on github.com), under the profile GitHub wrote on a merge of main's", pull([[{ "b.md": "x\n" }, { GIT_AUTHOR_NAME: term, ...GITHUB }]], profileOnMain(term)));
  fails("a commit that is no merge GitHub signed, under an author no merge of GitHub's on main carries (as its API takes one)", pull([[{ "b.md": "x\n" }, { GIT_AUTHOR_NAME: term, ...GITHUB }]]));
}
fails("a commit that is no merge, with a term in its author, committed as GitHub but not signed", pull([[{ "b.md": "x\n" }, { GIT_AUTHOR_NAME: term, ...AS_GITHUB }]]));
// a merge resolved by hand: the lines its resolution adds are read
const resolved = pull([[{ "a.md": "one\nmine\nthree\n" }], [dir => {
  try { git(dir, ["merge", "-q", "--no-edit", "main"]); } catch { /* (the conflict, resolved below) */ }
  fs.writeFileSync(path.join(dir, "a.md"), `one\n${term}\nthree\n`);
  git(dir, ["add", "a.md"]);
  git(dir, ["commit", "-q", "--no-edit"]);
}], [{ "a.md": "one\nboth\nthree\n" }]], [[{ "a.md": "one\ntheirs\nthree\n" }, {}, "on main"]]);
fails("a term in a line a merge's own resolution adds, taken out again later", resolved);
fails("a term in the title", pull([[{ "b.md": "x\n" }]]), { title: `About ${other}` });
fails("a term in the description", pull([[{ "b.md": "x\n" }]]), { body: `Words.\n\n${term}` });
passes("a term only in a file git reads as binary (not read: the check's header says so)", pull([[{ "a.bin": `\u0000${term}\u0000` }]]));
fails("a term in a commit dated before the rule, added and taken out again, its author too (a date is its maker's to write)", pull([[{ "b.md": `${term}\n` }, { GIT_AUTHOR_NAME: term, GIT_AUTHOR_DATE: "2026-10-01T00:00:00Z", GIT_COMMITTER_DATE: "2026-10-01T00:00:00Z" }], [{ "b.md": "gone\n" }]]));
passes("a term only in a commit of the base's, though the event names an older base", pull([[{ "b.md": "x\n" }]], [[{ "c.md": "y\n" }, { GIT_AUTHOR_NAME: term, ...GITHUB }, "squashed on main"]]), { stale: true });
const none = check(pull([[{ "b.md": `${term}\n` }]]), { terms: "" });
ok(none.passed && none.out.includes("PERSONAL_TERMS is not set"), "without the secret it passes with a note: the check stays optional", none.out);

console.log(failed ? `${failed} of ${count} failed` : `ok   ${count} assertions on the personal-terms check`);
process.exitCode = failed ? 1 : 0;
