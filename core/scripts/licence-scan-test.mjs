// Checks the licence check (licences.mjs, beside this file) on a whole project, with its scan (licence-scan.mjs): the
// staged project (licence-scan-stage.mjs) passes as it is, passes each allowed form, and fails each form of something
// off its list or left out of its audit but a fetch (licence-fetch-test.mjs has those), for the reason it names. Run by
// the core's tests workflow (.github/workflows/tests.yml).
//
//   node scripts/licence-scan-test.mjs
import { LOCK, append, done, entry, handAudited, json, ok, run, write } from "./licence-scan-stage.mjs";

const base = run();
ok(base.length === 0, "the project as it is passes", base.join("\n"));

for (const [what, change] of [
  ["a tool that only runs under GPL", entry({ name: "mossgrip-lint", licence: "GPL-3.0-only" })],
  ["npx --no-install with a bare name, which never fetches", append("scripts/setup.sh", "npx --no tsc --noEmit\n")],
  ["an npm install with no package, into a folder", append("scripts/setup.sh", "npm install --prefix tools\n")],
  ["npm ci and npm run, which fetch nothing new", append("scripts/setup.sh", "npm ci --prefix tools\nnpm run build\n")],
  ["a file under skip", write("docs/lichen.min.js", "/*! lichen v1 | GPL-3.0 */\n")],
  ["the project's copy of the core, audited by the core", (dir) => { write("core-manifest.md", "# Core manifest\n")(dir); write("core/scripts/moss.min.js", "/*! moss v1 */\n")(dir); }],
  ["a second file in a folder an entry covers", write("site/audio/bark-2.m4a", "")],
  ["an audited package in a string a tool runs", write("scripts/run.js", "require('child_process').execSync('npx mossgrip-cli@1.2.3');\n")],
  ["two versions of a package, each audited", (dir) => { entry({ name: "mossgrip-cli", version: "2.0.0", licence: "MIT" })(dir); append("scripts/setup.sh", "npm install -g mossgrip-cli@2.0.0\n")(dir); }],
  ["an audited package in package.json's scripts", write("package.json", JSON.stringify({ scripts: { build: "npx mossgrip-cli@1.2.3 build", test: "vitest run" } }))],
  ["a command named in prose, not run", write("site/notes.json", JSON.stringify({ about: "run npm install mossgrip-widgets to see" }))],
  ["a word that only looks like a fetcher", write("scripts/tongue.js", "const curl = 1 - e, steps = 4 * curl;\nconst tip = 'a curl of bark';\nexecFileSync('git', ['ls-files']);\necho \"pip\" is a word, and so is \"curl\" or 'wget'\nconst fast = t === \"bunx\" ? 1 : 2, runners = [\"node\", \"bunx\" ], by = { runner: \"bunx\" };\n")],
  ["a config with comments", write("site/jsconfig.json", "{\n  // the game's own types\n  \"compilerOptions\": {}\n}\n")],
  ["a fetch it cannot read, in a file an entry audits by hand", (dir) => { handAudited("scripts/setup.sh")(dir); append("scripts/setup.sh", 'npm pack --ignore-scripts "moss-linux-$ARCH@$V"\ncurl -sSfo moss.tgz https://mossgrip.example/moss.tgz\n')(dir); }],
  ["a script in another language, named by the entries of what it uses", (dir) => { write("scripts/render.py", "import numpy\n")(dir); handAudited("scripts/render.py")(dir); }],
  ["a lockfile the config names, a tool in it under GPL", LOCK("GPL-3.0-only")],
  ["an audited install in a string of code, with a comment after it", write("scripts/run.mjs", "execSync('npm install -g mossgrip-cli@1.2.3') // the one we audited\n")],
  ["an audited install with a comment after it", append("scripts/setup.sh", "npm install -g mossgrip-cli@1.2.3 # the one we audited\n")],
  ["a comment naming a fetcher, in a file whose lines end as Windows writes them", append("scripts/setup.sh", "# we once ran curl -L https://mossgrip.example here\r\necho moss\r\n")],
  ["a workflow comment naming a fetcher, its lines ending as Windows writes them", append(".github/workflows/ci.yml", "      # was: dotnet tool install --global mossgrip\r\n")],
  ...["dotnet restore --locked-mode", "dotnet test", "dotnet add src/Moss.csproj reference src/Bark.csproj", "dotnet tool restore", "choco list", "dotnet package list --vulnerable", "dotnet package search Mossgrip"]
    .map((line) => [`a .NET or Windows command that fetches nothing by a name written here: ${line}`, append(".github/workflows/ci.yml", `      - run: ${line}\n`)]),
  ["dotnet run as an array for what fetches nothing by a name written here", write("scripts/build.mjs", "execFileSync('dotnet', ['build', '-c', 'Release']);\nexecFileSync('dotnet', ['add', 'src/Moss.csproj', 'reference', 'src/Bark.csproj']);\nexecFileSync('dotnet', ['tool', 'restore']);\nexecFileSync('choco', ['--help']);\nexecFileSync('choco', ['list']);\n")],
  ["a PowerShell command's name held as data", write("scripts/labels.mjs", "const label = 'Invoke-WebRequest';\nif (name === \"Install-Module\") skip();\nconst all = ['iwr', 'irm', 'Start-BitsTransfer'];\nconst note = 'IRM protected, irm v1.2';\n")],
  ["npm run after an option", append("scripts/setup.sh", "npm --silent run build\n")],
  ["npm config get registry, which sets nothing", append("scripts/setup.sh", "npm config get registry\n")],
  ["npm link of a folder, and output redirected after an audited install", append("scripts/setup.sh", "npm link ../moss\nnpm install -g mossgrip-cli@1.2.3 > moss.log 2>&1\n")],
  ["an audited install nested in npx -c", append("scripts/setup.sh", "npx -c 'npm install -g mossgrip-cli@1.2.3'\n")],
  ["an audited package written as an array", write("scripts/crop.mjs", "execFileSync('npx', ['mossgrip-cli@1.2.3']);\n")],
  ["npm view with a variable, which fetches nothing", write("scripts/times.mjs", "execFileSync('npm', ['view', name, 'time', '--json']);\n")],
  ["npx and npm asked their version, and a check that npx is there", append("scripts/setup.sh", "npx --version\nnpm exec --help\nif ! command -v npx >/dev/null; then exit 1; fi\nwhich npm\n")],
  ["npm named in a long line of data, with no end within 16 KB", write("scripts/words.js", `const words = ["${"moss ".repeat(5000)}npm named here ${"bark ".repeat(1000)}"];\n`)],
  ["npm named in a message, not as a command", (dir) => { write("scripts/say.mjs", "console.log(`${file}: npm setting not allowed`);\n")(dir); append("scripts/setup.sh", "if npm ci; then echo \"npm packages: installed\"; fi\n")(dir); }],
  ["a page and a component showing commands in their text", (dir) => {
    write("site/tutorial.html", "<p>Run npx mossgrip-cli to start, or curl -o moss.tgz https://mossgrip.example/moss.tgz.</p>\n<pre>npx create-moss my-app</pre>\n<script>const moss = 1;</script>\n")(dir);
    write("site/Guide.vue", "<template><p>Run npx mossgrip-cli to start.</p></template>\n<script setup>const moss = 1;</script>\n")(dir);
  }],
  ["a page's structured data and template in script tags", write("site/howto.html", "<script type=\"application/ld+json\">{\"@type\":\"HowTo\",\"text\":\"npx mossgrip-cli\"}</script>\n<script type=\"text/template\"><p>npx mossgrip-cli</p></script>\n")],
  ["a page's comment naming a command, and a component's style block", (dir) => {
    write("site/guide.html", "<!-- Run npx mossgrip-cli to start. --><p>moss</p>\n<script>const moss = 1;</script>\n")(dir);
    write("site/Moss.vue", "<template><p>{{ moss }}</p></template>\n<style>.moss { color: green }</style>\n")(dir);
  }],
  ["npm diff, cache and publish of what is local or audited", append("scripts/setup.sh", "npm diff --diff=mossgrip-cli@1.2.3 --diff=.\nnpm cache clean --force\nnpm publish ./moss.tgz\n")],
  ["npm exec of an audited package after --", append("scripts/setup.sh", "npm exec --package=mossgrip-cli@1.2.3 -- moss build\n")],
  ["a notices file the config names, holding every shipped entry", (dir) => { write("site/NOTICES.txt", "Mossface (OFL-1.1)\nBark sounds (CC0-1.0)\n")(dir); json("licences.json", (j) => { j.notices = "site/NOTICES.txt"; })(dir); json("audit.json", (j) => j.entries.forEach((e) => delete e.notice))(dir); }],
]) { const f = run(change); ok(f.length === 0, `passes ${what}`, f.join("\n")); }
{ // (a line of many options before npm, read in time: what stands before npm is walked once, never tried two ways)
  const start = Date.now(), f = run(append("scripts/setup.sh", `sudo${" -ux".repeat(60)} X npm ci\n`));
  ok(f.length === 0 && Date.now() - start < 5000, "passes 60 options before npm, in under 5 seconds", f.join("\n") || `${Date.now() - start} ms`);
}
{ // (a long line naming npm many times, as a bundle may, read in time: what stands before each is read only so far back)
  const start = Date.now(), f = run(write("scripts/long.js", `const notes = '${`${"x".repeat(240)} npm run build; `.repeat(8000)}';\n`));
  ok(f.length === 0 && Date.now() - start < 5000, "passes a 2 MB line naming npm 8000 times, in under 5 seconds", f.join("\n") || `${Date.now() - start} ms`);
}

for (const [what, change, why] of [
  ["what ships without its notice", entry({ name: "Lichen data", kind: "data", licence: "CC0-1.0", ships: true }), /Lichen data: it ships, so its notice ships too/],
  ["what ships missing from the notices file the config names", (dir) => { write("site/NOTICES.txt", "Mossface (OFL-1.1)\n")(dir); json("licences.json", (j) => { j.notices = "site/NOTICES.txt"; })(dir); }, /Bark sounds: it ships, so its notice ships too .*: its name in site\/NOTICES\.txt/],
  ["a tool under a licence that is not open source", entry({ name: "mossgrip-widgets", licence: "LicenseRef-Mossgrip-Proprietary" }), /not on the list for tools/],
  ["what ships under a licence only tools may use", entry({ name: "mossgrip-widgets", licence: "MPL-2.0", ships: true }), /not on the list for what ships/],
  ["a tool under terms floor rule 10 never allows", entry({ name: "mossgrip-cli-pro", licence: "BUSL-1.1" }), /not on the list/],
  ["GitHub's terms on what is not GitHub's", entry({ name: "mossgrip-cli-pro", licence: "LicenseRef-GitHub-Terms" }), /not on the list/],
  ["an allowed licence grouped with one off the list, in what ships", entry({ name: "mossgrip-widgets", licence: "(MIT OR GPL-3.0-only) AND GPL-3.0-only", ships: true }), /not on the list for what ships/],
  ["AND and OR mixed without brackets", entry({ name: "mossgrip-widgets", licence: "MIT AND GPL-3.0-only OR MIT" }), /not on the list/],
  ["a package that ships, in a lockfile, under GPL", (dir) => { LOCK("GPL-3.0-only")(dir); json("licences.json", (j) => { j.ships = ["package.json"]; })(dir); }, /off the list for what ships: mossgrip-lib/],
  ["the owner's licence on what is not the owner's own", entry({ name: "mossgrip-widgets", licence: "LicenseRef-Owner" }), /the owner's own work is/],
  ["the owner's own work under another licence", entry({ name: "Bark pictures", kind: "own", licence: "MIT", files: ["site/icon.png"] }), /the owner's own work is/],
  ["the owner's own work named as a folder", entry({ name: "Bark pictures", kind: "own", licence: "LicenseRef-Owner", files: ["site/audio/"] }), /one by one/],
  ["the owner's own work standing in for an action", (dir) => { entry({ name: "mossgrip/setup-moss", kind: "own", licence: "LicenseRef-Owner" })(dir); append(".github/workflows/ci.yml", "      - uses: mossgrip/setup-moss@v1\n")(dir); }, /mossgrip\/setup-moss .* is not in/],
  ["the owner's own work covering code with someone's notice", (dir) => { write("site/lib/moss.js", "/*! moss v1 | MIT */\n")(dir); entry({ name: "Bark code", kind: "own", licence: "LicenseRef-Owner", ships: true, files: ["site/lib/moss.js"] })(dir); }, /not the owner's own/],
  ["an action not in the audit", append(".github/workflows/ci.yml", "      - uses: mossgrip/setup-moss@v1\n"), /mossgrip\/setup-moss .* is not in/],
  ["an action in an action of the project's own", write(".github/actions/moss/action.yml", "runs:\n  steps:\n    - uses: mossgrip/setup-moss@v1\n"), /mossgrip\/setup-moss/],
  ["an action under a quoted key", append(".github/workflows/ci.yml", "      - 'uses': mossgrip/setup-moss@v1\n"), /mossgrip\/setup-moss/],
  ["an audited package fetched at another version", append("scripts/setup.sh", "npm install -g mossgrip-cli@1.3.0\n"), /audited at 1\.2\.3/],
  ["a package.json script named like prose", write("package.json", JSON.stringify({ scripts: { help: "npx -y mossgrip-cli", description: "npx -y mossgrip-cli" } })), /cannot be audited/],
  ["the owner's own picture carrying someone's licence notice", (dir) => { write("site/icon.svg", "<!-- SPDX-License-Identifier: GPL-3.0-only --><svg/>\n")(dir); entry({ name: "Moss icon", kind: "own", licence: "LicenseRef-Owner", ships: true, files: ["site/icon.svg"] })(dir); }, /not the owner's own/],
  ["a package.json that cannot be read", write("site/package.json", "{ scripts: "), /cannot be read as JSON/],
  ["a lockfile the config does not name", write("tools/package-lock.json", JSON.stringify({ lockfileVersion: 3, packages: { "": {} } })), /"lockfiles" does not name/],
  ["a package.json with dependencies no named lockfile installs", write("tools/package.json", JSON.stringify({ devDependencies: { "mossgrip-lint": "1.0.0" } })), /no lockfile the config names installs/],
  ["third-party code copied into what ships", write("site/lib/mossgrip.min.js", "/*! mossgrip v1 | MIT */\nvar m=1;\n"), /licence notice\) is not in/],
  ["third-party code that ships, audited as a tool", (dir) => { write("site/lib/mossgrip.min.js", "/*! mossgrip v1 | MIT */\nvar m=1;\n")(dir); entry({ name: "site/lib/mossgrip.min.js", licence: "MIT" })(dir); }, /reaches users/],
  ["third-party code copied into a tool", write("scripts/lichen.mjs", "// SPDX-License-Identifier: MIT\nexport const l = 1;\n"), /licence notice/],
  ["a notice written as a year", write("site/lib/moss.css", "/* Copyright 2020 Mossgrip Ltd. */\n"), /licence notice/],
  ["a file that ships, covered by two entries and one of them a tool's", (dir) => { write("site/bundle.js", "/*! moss bundle */\n")(dir); entry({ name: "Moss lib", licence: "MIT", ships: true, files: ["site/bundle.js"] })(dir); entry({ name: "Lichen lib", licence: "GPL-3.0-only", files: ["site/bundle.js"] })(dir); }, /every entry covering it ships/],
  ["a licence notice in a JSON file with comments", write("site/theme.jsonc", "// SPDX-License-Identifier: GPL-3.0-only\n{ \"moss\": 1 }\n"), /theme\.jsonc \(a file carrying a licence notice\)/],
  ["a file that ships, covered only by a tool's entry, with no notice in it", (dir) => { write("site/vendor.js", "export const moss = 1;\n")(dir); entry({ name: "Moss library", licence: "GPL-3.0-only", files: ["site/vendor.js"] })(dir); }, /covers site\/vendor\.js, which reaches users, so it ships/],
  ["code copied in, in a language it does not run", write("site/lib.c", "/* SPDX-License-Identifier: GPL-3.0-only */\nint moss;\n"), /lib\.c \(a file carrying a licence notice\)/],
  ["a font, image or sound not in the audit", write("site/bark.png", ""), /bark\.png .* is not in/],
  ["a font kept with a tool, not in the audit", write("scripts/mossface.ttf", ""), /mossface\.ttf/],
  ["a WebAssembly module not in the audit", write("site/moss.wasm", ""), /moss\.wasm/],
  ["a binary file whatever its name", write("site/moss.dat", "\u0000\u0001\u0002moss\u0000"), /binary file/],
  ["an asset that ships, covered only by a tool's entry", json("audit.json", (j) => { j.entries.find((e) => e.name === "Bark sounds").ships = false; }), /reaches users/],
  ["an entry covering a file that is gone", entry({ name: "Old bark", kind: "asset", licence: "CC0-1.0", ships: true, files: ["site/old-bark.m4a"] }), /names no tracked file/],
  ['"files" that is not a list of paths', json("audit.json", (j) => { j.entries.find((e) => e.name === "Bark sounds").files = "site/audio/"; }), /not a list of paths/],
  ["a scan key it does not know", json("licences.json", (j) => { j.scan.servd = ["site/"]; }), /keys it does not know/],
  ["a scan that does not say what reaches users", json("licences.json", (j) => { delete j.scan.served; }), /what reaches users/],
  ["a scan path outside the project", json("licences.json", (j) => { j.scan.skip = ["../elsewhere/"]; }), /not a list of paths in the project/],
  ["a scan that skips everything", json("licences.json", (j) => { j.scan.skip = [""]; }), /not a list of paths in the project/],
  ["a scan path written another way than git lists it", json("licences.json", (j) => { j.scan.served = ["./site/"]; }), /not a list of paths in the project/],
  ['a scan folder without its "/", which names no file', json("licences.json", (j) => { j.scan.served = ["site"]; }), /names no tracked file/],
  ["a scan path that names nothing", json("licences.json", (j) => { j.scan.skip = ["notes/"]; }), /names no tracked file/],
  ["a scan without an audit", json("licences.json", (j) => { delete j.audit; j.lockfiles = ["package-lock.json"]; }), /needs an "audit"/],
  ["notices that are no path", json("licences.json", (j) => { j.notices = 7; }), /"notices" is not a path/],
  ["notices without an audit", (dir) => { LOCK("MIT")(dir); json("licences.json", (j) => { delete j.audit; delete j.scan; j.notices = "site/NOTICES.txt"; })(dir); }, /names no "audit"/],
  ["notices naming no file", json("licences.json", (j) => { j.notices = "site/NOTICES.txt"; }), /"notices", site\/NOTICES\.txt, names no file/],
  ["notices naming a folder", json("licences.json", (j) => { j.notices = "site/audio"; }), /"notices", site\/audio, names no file/],
]) { const f = run(change); ok(f.some((m) => why.test(m)), `fails on ${what}`, f.join("\n") || "(it passed)"); }

done();
