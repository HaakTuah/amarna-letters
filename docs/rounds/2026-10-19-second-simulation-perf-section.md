## Fix (b): phone performance

Agent B's part of item 4, on branch `item/second-simulation-perf` (from `c0ff3cf`), for the integrator to merge into
this report. Watching a game on a phone is the first milestone; item 2's report left two problems: playing a season
froze the page for up to about 3 s on a slow emulated phone, and the first load took about 20 s on slow 4G.

**In short.** The freeze is gone: the script kings and the script characters now think in a Web Worker, and the
longest stretch in which the page could not answer a tap while seasons played fell from 2.3-4.2 s to 0.6-0.8 s (once,
at the first season) and at most 0.33 s after it. The first load is only somewhat faster: 15% fewer bytes (the
Anthropic SDK is no longer downloaded) and 7-10% less time on average; "much faster" is not met, and what would
close the gap is below. Seeds and replays are unchanged: no rule changed, the save version stays 3.

### What was built

- **The script players think in a Web Worker** (`dfce064`). In a browser game the script kings' look-ahead and the
  script characters' writing run in a worker with a second .NET runtime (`Services/ScriptWorker.cs`,
  `Services/ScriptWorkerClient.cs`, `wwwroot/js/script-worker.js` and `script-worker-client.js`). The worker boots
  from the files the page has already downloaded (it downloads nothing of its own), starts when a game with script
  players is set up, and warms up on a throwaway game while the page sets up the real one. Each request carries what
  the engine handed the seat or the mind (a king's view, a character's context) as JSON, as a file seat's view is
  written; the answer comes back the same way into the runner, which records it as before. The kings keep their
  memory in the worker from season to season (one `ScriptLeader` per game, as in the page and the batch runner), so
  every answer is the one the same code gives in the page. Where no worker can start, the kings think in the page as
  before (`YieldingSeat`); if the worker stops during a game, the page takes over and says so in a notice (the kings
  then start with no memory of earlier seasons; the characters keep none of their own, so theirs is the same answer).
  Model kings and characters wait on the network and stay in the page.
- **What stays in the page is drawn apart from the engine's work** (same commit). A season's redraws are coalesced
  into one task after the engine's work instead of inside it (`GameSession.NotifySoon`), and the page draws that a
  season is under way before the season's work starts. Loading a saved log is quicker too, as it no longer redraws at every
  phase of every replayed season.
- **The log writes each decision's line once** (`0e28da3`). `GameLog.ToJsonl`, which the autosave calls
  every season, wrote and re-parsed every line each time, which grows long late in a game. The first version kept a
  copy of the log's line format in the web app (`LogText`, in `dfce064`); a trial merge with the item branch showed
  why that was fragile (the branch adds model characters' shadow decisions to the log, and the copy missed them), so
  the log now keeps the lines it has written itself, and its text is unchanged: a test compares the text written
  season by season with the text a log read back from it writes afresh, for a script game and a model game.
- **Generated serializers tried and dropped** (`25bd620`). Build-time JSON code for the worker's messages added 69 KB
  to the download and did not shorten the first season's longest stretch (363-364 ms with the engine's own serializer
  against 445-1,055 ms with the generated one, two runs each on the emulated phone).
- **The SDK path is out of `Amarna.Llm`** (`a35b847`). The browser never constructs the Anthropic SDK (it posts with
  HttpClient), but it downloaded 0.47 MB of it. The SDK transport now lives in a new project, `src/Amarna.Llm.Sdk`,
  which the batch runner and the game tests reference and register once (`AnthropicSdk.Use()`, one line at the top of
  `Program.cs`); `ClaudeClient` keeps its constructor and its `browser` flag, and a model client built outside the
  browser without the SDK registered says how to get it. The web app no longer ships `Anthropic`,
  `System.IO.Compression` or `System.Web.HttpUtility`. This is a split rather than lazy loading: the browser has no
  use for the SDK at all, so it never needs to download it.
- **A worker that does not start in two minutes is given up** (`0c9342b`), and the page plays instead of waiting.
- **The loading screen says that the first visit downloads the game** (`6147b9c`): "The first visit downloads the game,
  about 3 MB. Later visits start from this device." A visit the service worker starts does not show it.

`docs/DESIGN-NOTES.md` ("Transport" under Models; "Load size", "Script kings and characters in a worker" and "What is
left in the page" under the web map) and the README's project table changed in the same commits.

### How it was measured

As in item 2: the published Release builds of `c0ff3cf` (before) and `a35b847` (after; the later commits add the start
timeout and the loading note, and move the cache of the log's lines from the web app into the log, which in a game of
script players writes the same text with the same work), each served from its own local port as a CDN serves it
(precompressed Brotli, long caching for fingerprinted files), in headless Chrome 155 driven over the DevTools protocol
with Lighthouse's mobile settings: a 412 x 823 screen at 1.75x, 4x CPU slowdown, slow 4G (150 ms, 1.6 Mbps). The
script is item 2's
(cold load, service-worker install, second visit, a game of seed 7 from `play?watch=7`, twelve seasons played,
timeline steps, sliding, pinching and panning), run three times for each build, back to back and alternating
(before, after, after, before, after, before). The first load was also measured as GitHub Pages serves the site:
gzip instead of Brotli and ten minutes of caching (checked against the live site with curl on 19 October: Pages sends
`dotnet.native.wasm` as 1.20 MB of gzip, where the Brotli file is 0.98 MB).

Two things differ from item 2's runs:

- **Chrome cannot slow a worker down.** CPU throttling reaches the page only (a fixed loop took 50 ms in a worker at
  both 1x and 4x, while the page's took 60 and 217 ms), and the DevTools protocol refuses to throttle a worker target
  ("Operation is only supported for pages, not workers"). So the worker emulates the phone itself: the profiler sets
  `self.__amarnaSlowdown = 4` in it through the protocol, and after each piece of work (its start and each answer)
  the worker waits out three times as long. The hook is three lines in `script-worker.js` and is never set in play.
- **The machine was shared** with the other agents' builds and tests. CPU load, sampled before and after each run,
  was 9-68%; each figure below gives all three runs. No physical phone was used: every phone figure comes from
  Chrome's emulation.

### Results

| Measure (emulated phone) | Before (3 runs) | After (3 runs) |
|---|---|---|
| First load, bytes (Brotli, as a CDN serves it) | 3,282 KB | 2,804 KB |
| First load: home page ready (Brotli) | 20.4 / 19.4 / 19.7 s | 19.1 / 16.7 / 19.3 s |
| First load, bytes (gzip, as GitHub Pages serves it) | 4,005 KB | 3,416 KB |
| First load: home page ready (gzip; 2 runs) | 23.4 / 24.6 s | 21.0 / 22.2 s |
| First paint (the loading screen) | 0.57-0.59 s | 0.56-0.62 s |
| Second visit (from the service worker): ready | 2.4 / 2.4 / 2.7 s | 2.0 / 1.6 / 4.3 s |
| A game to watch from a link: map shown | 8.0 / 8.4 / 7.3 s | 9.7 / 4.8 / 10.3 s |
| **Longest stretch the page could not respond while seasons play** | **4.1 / 4.2 / 2.3 s** | **0.83 / 0.62 / 0.70 s** |
| The same, from the second season on | 4.1 / 4.2 / 2.3 s | 0.27 / 0.24 / 0.33 s |
| Longest stretch per season, median | 1.9 / 1.9 / 1.6 s | 0.16 / 0.13 / 0.22 s |
| Playing the first season | 8.8 / 12.1 / 8.5 s | 12.0 / 9.5 / 14.1 s |
| Playing a season, seasons 2-12, median | 6.8 / 7.6 / 4.2 s | 3.1 / 2.7 / 4.2 s |
| Switching seasons, Season panel open: median | 178 / 160 / 156 ms | 202 / 127 / 156 ms |
| The same, Events panel open: median / 95th percentile | 281-466 / 1,082-1,239 ms | 257-475 / 1,115-2,094 ms |
| Sliding, pinching and panning | 32-58 fps | 32-58 fps |

Memory, after eight seasons of seed 7: before, the page's .NET memory was 96 MB; after, 80 MB in the page and 55 MB
in the worker, 135 MB in all.

**What the numbers say.**

- **No freeze.** The page now answers within a third of a second throughout a season from the second season on; the
  one longer stretch, 0.6-0.8 s, is the page's own first season (its code running for the first time). Before, every
  season held stretches of 1-4 s. On a real phone the worker runs on another core, so the page and the kings work at
  the same time.
- **Seasons are no slower, and mostly quicker** (median 2.7-4.2 s against 4.2-7.6 s from the second season), since the
  page's drawing and the kings' thinking now overlap. The first season takes about as long as before or a little
  longer (9.5-14.1 s against 8.5-12.1 s): the worker boots its own runtime and warms up when the game starts, about
  1.1-1.4 s of work on this machine, emulated as 4.5-5.6 s, and a season played at once waits for it.
- **The first load is 15% smaller and 7-10% faster on average** (19.8 to 18.4 s with Brotli, 24.0 to 21.6 s with gzip), not much faster. Smoothness, season switching and the second
  visit are unchanged within the noise of a shared machine (sliding, pinching and panning came out at either about
  33 or about 57 frames a second in both builds, run by run).

**What limits the first load, and what would close the gap.** The download is most of it: at 1.6 Mbps every 200 KB is
a second. What is left is the .NET runtime (0.98 MB with Brotli), the core library (0.54 MB) and Blazor (about
0.3 MB), about 1.9 MB before any of the game's own code, which is about 0.9 MB (the engine, the game, the model layer,
the web app, and the JSON, regular-expression and HTTP libraries it uses).

1. **Brotli on the host.** GitHub Pages compresses with gzip and ignores the build's Brotli files: 3.4 MB instead of
   2.8 MB, about 3 s on slow 4G. A host or CDN that serves the precompressed files (Cloudflare Pages, Netlify, Azure
   Static Web Apps, or a CDN in front of Pages) gains that at once. Blazor's documented alternative for static hosts,
   decoding Brotli in the page, needs a third-party decoder script vendored into the repository and a service worker
   that decodes too (else installing it downloads the app a second time, as gzip); not done here, since it needs that
   download.
2. **Relinking the runtime** with the `wasm-tools` workload: the time-zone data alone is 188 KB in
   `dotnet.native.wasm` (35 KB with Brotli), and unused native code can go. The workload is not installed on this
   machine, installing it needs administrator rights, and the Pages workflow would need it too. Ahead-of-time
   compilation, the other use of the workload, makes the download larger (compiled code is bigger than the
   interpreted assemblies it replaces); with the bots in a worker it would only shorten seasons, so it was not tried.
3. **Lazy loading what the home page does not use** (the regular-expression and HTTP libraries, about 0.17 MB):
   about 0.8 s on slow 4G for the home page only; a link to watch a game needs them at once, and the worker would
   have to load them too.
4. Beyond these, only a lighter first page (a static home page that loads .NET when a game starts) or a lighter engine
   would bring the first visit near 10 s on slow 4G. Later visits already start from the device in about 2-3 s, and
   ordinary 4G is several times faster than Lighthouse's slow 4G.

### Decisions and readings

1. **Kings and characters, one worker.** The characters went to the worker as well: once the kings had left the page,
   a script character's first text (its text code warming up) was the longest stretch left, 1.8 s at the second
   season. One worker serves all the script players, one request at a time, as the page did; a worker per king would
   cost a runtime's memory each. The template narrator stays in the page: its personas are written before the worker
   can be ready, and it is light.
2. **Exactness by construction and by test.** The worker runs the same code on the same inputs; the view or context is
   JSON-serialized with the engine's own settings (`Json.Options`), as file seats already rely on. Tests in
   `tests/Amarna.Web.Tests/ScriptWorkerTests.cs` play seeds 1, 2, 7 and 14 through an in-process worker (the same
   requests, replies and JSON) and compare every decision and the final state with the game played in the page, seed
   5 season by season, and check the fallbacks and a replay of a worker-played log. In the browser, a whole watch game of seed 7 played through the
   worker matched a native game of seed 7 with the web app's settings in 573 of its 580 logged decisions (19 seasons, Egypt
   winning, as item 2 found); the other seven, the chronicles, differ only in line endings, `\n` in the browser against `\r\n` on
   Windows (the template narrator writes `Environment.NewLine`; it was so before this change, and replays read the
   chronicles from the log).
3. **Bot-visible behaviour is unchanged,** so the bot benchmarks were not rerun: no rule or bot code changed (the one
   change outside the web app and the SDK project is how the log writes its text, which stays the same), and the
   replay check (`--games 10 --seed 1 --verify-replay --no-chronicles`) prints the same output, line for line, at
   `c0ff3cf` and at `0e28da3` except its timing line; all ten replays match.
4. **The worker keeps the kings of the newest game only**, and drops requests still queued for a game the page has
   left. A request that reaches a king whose code fails comes back as that king's error, and the runner's stand-in
   answers it, as for any seat.
5. **A trap for the next builder:** the .NET loader takes a worker whose `onmessage` is set when `dotnet.js` loads for
   one of its own threads, and then waits forever for a main runtime that does not exist; the worker listens with
   `addEventListener` instead (commented in the script).
6. **`AnthropicSdk.Use()` is a registration, not a parameter,** so that `SeatSetup.Build` and `ClaudeClient` keep their
   signatures (other agents' code calls them). A console program that plays model seats must call it once; the batch
   runner does, and so do the two game tests that build model seats outside the browser.
7. **Numbers added:** none that touch balance. Two operational ones: the worker is given up if not ready within two
   minutes, and the loading note says "about 3 MB" (2.8 MB with Brotli, 3.4 MB with gzip).

### Left out, and why

- Ahead-of-time compilation and relinking: the `wasm-tools` workload is not installed and needs administrator rights;
  AOT would enlarge the download (see above).
- Brotli decoding in the page for GitHub Pages: needs a vendored third-party decoder (a download) and service-worker
  changes; moving to a host that serves Brotli is simpler and is the owner's call.
- Lazy loading for the home page: small, and of no help to a link that opens a game.
- Starting the worker before a game is set up (while the player chooses a table): it would hide the worker's start from
  the first season, but cost every visitor a second runtime's memory and a core's work whether or not they play.
- No physical phone was available; all phone figures are Chrome's emulation.

### Checks

`dotnet build` 0 warnings; `dotnet test` 699 passed (220 engine, 454 game, 25 web; 13 of them new); the replay check
as above. A trial merge of this branch into `item/second-simulation` as it stood at `72bee0d` (with the other
agents' work merged so far) merged without conflicts, built with 0 warnings and passed all 724 tests, the worker tests included (the trial
was not committed). In the browser (the published build, and the development server): a whole game watched to its end with every
court's view and every panel opened (item 2's smoke script; 22 seasons, no errors, the page never scrolled), a human
seat (Egypt) sealing orders and answering audiences for four seasons with the worker and with workers made
unavailable (`Worker` replaced by a constructor that throws; the kings then think in the page), and the loading note
shown on a first visit and not on a visit the service worker starts.

### Commits

- `dfce064` Run the script kings and characters in a Web Worker
- `25bd620` Write the worker's messages with the engine's serializer
- `a35b847` Move the Anthropic SDK path out of Amarna.Llm
- `0c9342b` Give up on a script worker that does not start
- `6147b9c` Say on a first visit's loading screen that the game is downloading
- `481cf5f` Report fix (b), phone performance, for the item 4 report
- `0e28da3` Write each decision's line of the log once
- and the commit that brings this section up to date
