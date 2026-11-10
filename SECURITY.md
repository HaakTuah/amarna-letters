# Security

This game takes the floor whole, `core/floor/security.md` and `core/floor/topics.md`, with its threat model,
`core/floor/threat-model.md`, to which `docs/threat-model.md` adds this game's own. What this game adds under the
floor's numbers:

3. **The protected files.** The trusted builder: Claude's builder sessions (`core/modules/roles.md`). Besides those
   the floor names:
   - **what runs by itself or with credentials:** `scripts/cloud-setup.sh`;
   - **the rule files:** `docs/builder-rules.md`, `docs/codex-building.md`, `docs/review-guidelines.md`,
     `docs/threat-model.md` and this file;
   - **the checks on the work:** the copies check's config and baseline (`scripts/copies.json`,
     `scripts/copies-baseline.json`), and the licence check's config (`scripts/licences.json`).
5. **Its inputs:**
   - **Model replies** (kings, characters, the narrator): parsed into the engine's structured fields and checked by the
     engine; never shown as HTML. Nothing a model writes may reach the player's API key, files or any other site.
   - **Save files, share links and URL parameters:** anyone can craft one.
   - **The bridge** (`src/llm/src/bridge.ts`) talks only to the address the player typed; its replies are model replies
     as above.
6. **Where markup is built:** `dangerouslySetInnerHTML`, `innerHTML` and the map's SVG strings (`src/web/src/map/`).
7. **What runs in players' browsers:**
   - **Players' API keys** (model seats): kept in memory, or this tab's session storage if the player asks
     (`src/web/src/session/storage.ts`); never localStorage, cookies, a save, a report, a log, a URL or an error message;
     sent only to the provider the player chose (`src/llm/src/`).
   - **The content security policy** (`src/web/csp.ts`) holds the page and its worker to its own files, the providers on
     one list (`src/llm/src/endpoints.ts`) and the player's own machine; a new provider is a line in that list.
   - **What ships** (floor rule 7) includes the build: Vite, its plugins and what they pull in, such as Rollup and
     esbuild.
10. **What ships, or is built into it:** what the web build bundles, which its notices file lists. The audit of every
    licence is the core's check (`core/scripts/licences.mjs`) with `scripts/licences.json`; `scripts/notices.mjs` writes
    the notices the web build ships.
15. **No install scripts:** `ignore-scripts` in `.npmrc`, for every install here.
17. **The package manifests and lock files:** the `package.json` files and `package-lock.json`.

## Reporting a weakness

"Reporting a weakness" in `core/floor/topics.md`: privately, through the Security tab's "Report a vulnerability".
