// The recorded answers the lookup's tests hand it in place of the network (tests/lookup-test.mjs and tests/lookup-run-test.mjs, beside
// this file): each package name invented, each answer of a registry or of GitHub in the shape the registry gives, trimmed to what the
// lookup reads (floor rule 8: no live call, no real package).

// (an integrity value of npm's form, its bytes invented)
export const INVENTED_SUM = `sha512-${"A".repeat(86)}==`;
export const NOW = Date.parse("2026-11-16T12:00:00Z");
export const ago = (days) => new Date(NOW - days * 86400000).toISOString();

export const npmDoc = (name, created, extra = {}) => ({
  name, time: { created, modified: ago(3), "1.0.0": created, "1.1.0": ago(30) },
  versions: { "1.1.0": { name, _npmUser: { name: "invented-publisher" }, repository: { type: "git", url: `git+https://github.com/invented-org/${name}.git` }, dist: { attestations: { provenance: { predicateType: "https://slsa.dev/provenance/v1" } } }, ...extra } },
});
export const answers = {
  "https://registry.npmjs.org/tidy-moss-format": { status: 200, json: npmDoc("tidy-moss-format", ago(800)) },
  "https://registry.npmjs.org/tidy-moss-helper": { status: 200, json: npmDoc("tidy-moss-helper", ago(400)) },
  "https://registry.npmjs.org/brand-new-moss": { status: 200, json: npmDoc("brand-new-moss", ago(12)) },
  "https://registry.npmjs.org/@invented%2Fscoped-moss": { status: 200, json: npmDoc("@invented/scoped-moss", ago(200)) },
  "https://registry.npmjs.org/never-published-moss": { status: 404 },
  "https://registry.npmjs.org/taken-off-moss": { status: 200, json: { name: "taken-off-moss", time: { created: ago(900), unpublished: { time: ago(5) } } } },
  "https://registry.npmjs.org/flaky-moss": { status: 503 },
  "https://api.github.com/repos/invented-org/tidy-moss-format": { status: 200, json: { archived: true } },
  "https://raw.githubusercontent.com/invented-org/tidy-moss-format/HEAD/package.json": { status: 200, json: { name: "tidy-moss-format" } },
  "https://api.nuget.org/v3/registration5-gz-semver2/invented.moss.core/index.json": { status: 200, json: { items: [
    { "@id": "https://api.nuget.org/v3/registration5-gz-semver2/invented.moss.core/page/0.1.0/1.0.0.json", lower: "0.1.0", upper: "1.0.0" },
    { items: [{ catalogEntry: { version: "2.0.0", published: ago(20), authors: "Invented Authors", projectUrl: "https://github.com/invented-org/moss-core" } }] },
  ] } },
  "https://api.nuget.org/v3/registration5-gz-semver2/invented.moss.core/page/0.1.0/1.0.0.json": { status: 200, json: { items: [
    { catalogEntry: { version: "0.1.0", published: "1900-01-01T00:00:00+00:00" } },
    { catalogEntry: { version: "1.0.0", published: ago(500) } },
  ] } },
  "https://api.nuget.org/v3/registration5-gz-semver2/invented.moss.lines/index.json": { status: 200, json: { items: [
    { items: [{ catalogEntry: { version: "1.0.0", published: ago(10) } }] },
    { items: [{ catalogEntry: { version: "2.0.0", published: ago(700), authors: "Old Line" } }] },
  ] } },
  "https://api.nuget.org/v3/registration5-gz-semver2/invented.moss.young/index.json": { status: 200, json: { items: [{ items: [{ catalogEntry: { version: "1.0.0", published: ago(40) } }] }] } },
  "https://api.nuget.org/v3/registration5-gz-semver2/invented.moss.astray/index.json": { status: 200, json: { items: [{ "@id": "https://elsewhere.invalid/page.json", lower: "1.0.0", upper: "2.0.0" }] } },
  "https://api.github.com/repos/invented-org/moss-core": { status: 200, json: { archived: false } },
};
export const asked = [];
export const get = async (url) => { asked.push(url); return answers[url] ?? { status: 404 }; };
export const tgz = (name, v = "1.1.0") => `https://registry.npmjs.org/${name}/-/${name.slice(name.indexOf("/") + 1)}-${v}.tgz`;
