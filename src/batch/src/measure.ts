/**
 * The measure of call size ("Call size matters as much as call count"; item 6b): script games in which every king is
 * shadowed by a model king. The script king plays each season, so the games are the script games themselves, and the
 * model king's request for the very same view is built and measured; its record is then written as a model king's would
 * be, with the script's orders and notes, summary and ledger lines of the lengths model kings write (the "realistic"
 * variant of the simulation-fixes round: notes of 1,800 characters, a 1,800-character summary from the fourth orders on,
 * a 350-character ledger line for each court dealt with). No model is called.
 *
 *   node --experimental-strip-types src/batch/src/measure.ts --games 10 --seed 1 [--dump DIR] [--per-audience]
 *
 * --per-audience holds every court one audience at a time (as before "One call per wake-up"), for comparison.
 *
 * Tokens are characters divided by 3.6 (no tokenizer is at hand), the same before and after.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AllPowers, Dict, newGameConfig, type AudienceView, type HostReply, type Power, type SeatView, type TurnSubmission } from "@amarna/engine";
import { GameRunner, ScriptLeader, ScriptMind, TemplateNarrator, playGame, type ISeat } from "@amarna/game";
import { LlmLeaderSeat, jsonSchema, type CallSpec } from "@amarna/llm";

interface Measured {
  kind: "orders" | "audience";
  game: number;
  /** The reply schema, which leads the request's cached prefix (the tool comes before the system text). */
  schema: string;
  power: Power;
  turn: number;
  sections: Map<string, number>;
  total: number;
}

const filler = (n: number, seed: string): string => {
  const words = `${seed} keeps watch on the river road and the passes; the gold of Egypt must come before the floods, and the envoy to Hatti is to be received with honour but promised nothing until the tribute is paid`.split(" ");
  const out: string[] = [];
  let len = 0;
  for (let i = 0; len < n; i++) {
    out.push(words[i % words.length]);
    len += words[i % words.length].length + 1;
  }
  return out.join(" ").slice(0, n);
};

/** The parts of a request, each character counted once. Headings the request prints start a part; the rest is "view". */
const Heads: [string, RegExp][] = [
  ["sleep line", /^You (slept|gave orders|were woken|have not slept)/],
  ["map, treasury", /^(SEASON|TREASURY|LAND STANDINGS|LANDS|Lands now|YOUR LAND)/],
  ["people", /^(YOUR PEOPLE|OTHER PEOPLE)/],
  ["letters", /^YOUR LETTERS/],
  ["tablets", /^(YOUR ARCHIVE|Tablets you hold)/],
  ["standing, scheduled", /^(ENVOY TRAVEL|YOUR STANDING ORDERS|ORDERS YOU HAVE SCHEDULED|LETTERS YOU SENT FROM)/],
  ["realm in brief", /^YOUR REALM IN BRIEF/],
  ["while you slept", /^WHILE YOU SLEPT/],
  ["news", /^NEWS THIS SEASON/],
  ["ledger", /^YOUR LEDGER OF DEALINGS/],
  ["summary", /^(YOUR RECORD OF EARLIER|YOUR SUMMARY OF EARLIER)/],
  ["notes, past orders", /^turn \d+ (notes|orders|audiences|audience)|^Your notes from|^AUDIENCES YOU HAVE HELD/],
  ["the ask", /^(Now give your orders|AN AUDIENCE|YOUR ORDERS STAND)/],
];

function split(spec: CallSpec): Map<string, number> {
  const m = new Map<string, number>();
  const add = (k: string, n: number): void => void m.set(k, (m.get(k) ?? 0) + n);
  add("rulebook (cached)", spec.sharedSystem.length);
  add("identity", (spec.seatSystem ?? "").length);
  add("schema", JSON.stringify(jsonSchema(spec.schema)).length);
  let part = "view";
  for (const line of spec.user.split("\n")) {
    for (const [k, re] of Heads) if (re.test(line)) part = k;
    add(part, line.length + 1);
  }
  return m;
}

class ShadowKing implements ISeat {
  readonly label = "Shadow model king";
  readonly canSleep = true;
  private readonly llm: LlmLeaderSeat;
  private orders = 0;
  private readonly courts = new Set<Power>();
  private readonly power: Power;
  private readonly script: ScriptLeader;
  private readonly out: Measured[];
  private readonly dump: string | null;
  private readonly game: number;
  constructor(power: Power, script: ScriptLeader, out: Measured[], dump: string | null, game: number) {
    this.game = game;
    this.power = power;
    this.script = script;
    this.out = out;
    this.dump = dump;
    this.llm = new LlmLeaderSeat(power, { askJson: () => Promise.reject(new Error("no calls")) }, "claude-sonnet-5-5", "medium", true, newGameConfig());
  }

  private measure(kind: Measured["kind"], turn: number, spec: CallSpec): void {
    const sections = split(spec);
    const total = [...sections.values()].reduce((a, b) => a + b, 0);
    this.out.push({ kind, game: this.game, schema: JSON.stringify(jsonSchema(spec.schema)), power: this.power, turn, sections, total });
    if (this.dump !== null && (turn === 3 || turn === 12 || turn === 30)) writeFileSync(join(this.dump, `${spec.key.replaceAll("/", "_")}.txt`), `${spec.seatSystem}\n----\n${spec.user}`);
  }

  async decide(view: SeatView): Promise<TurnSubmission> {
    this.measure("orders", view.turn, this.llm.ordersCall(view));
    const sub = await this.script.decide(view);
    this.orders++;
    for (const l of view.letters) this.courts.add(l.to);
    const record = {
      ...sub,
      notes: filler(1800, `${this.power} at turn ${view.turn}`),
      summary: this.orders >= 4 ? filler(1800, `Summary of ${this.power}`) : "",
      ledger: [...this.courts].map((court) => ({ court, entry: filler(350, `${court} promised`) })),
    };
    this.llm.journal.record(view.turn, record);
    this.llm.journal.readTablets(view.tablets.map((t) => t.tabletId));
    return sub;
  }

  /** With --per-audience, the court is held one audience at a time, as before item 6b. */
  get holdCourt(): ((views: AudienceView[], court: SeatView) => Promise<(HostReply | null)[]>) | undefined {
    return perAudience ? undefined : (views, court) => this.court(views, court);
  }

  private async court(views: AudienceView[], court: SeatView): Promise<(HostReply | null)[]> {
    this.measure("audience", views[0].turn, this.llm.courtCall(views, court));
    const replies: HostReply[] = [];
    for (const view of views) {
      const reply = await this.script.hostAudience(view, court);
      this.courts.add(view.from);
      this.llm.journal.audience(view.turn, view.from, view.envoy.name, reply.speech, []);
      replies.push(reply);
    }
    return replies;
  }

  async hostAudience(view: AudienceView, court: SeatView): Promise<HostReply> {
    this.measure("audience", view.turn, this.llm.audienceCall(view, court));
    const reply = await this.script.hostAudience(view, court);
    this.courts.add(view.from);
    this.llm.journal.audience(view.turn, view.from, view.envoy.name, reply.speech, []);
    return reply;
  }
}

const args = process.argv.slice(2);
const opt = (name: string, d: string): string => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : d;
};
const games = Number(opt("--games", "10"));
const seed = Number(opt("--seed", "1"));
const dump = args.includes("--dump") ? opt("--dump", "") : null;
const perAudience = args.includes("--per-audience");
if (dump !== null) mkdirSync(dump, { recursive: true });

const all: Measured[] = [];
for (let g = 0; g < games; g++) {
  const s = seed + g;
  await playGame(
    s,
    (state) => {
      const script = new ScriptLeader(state.seed);
      const seats = new Dict<Power, ISeat>(AllPowers.map((p) => [p, new ShadowKing(p, script, all, g === 0 ? dump : null, s)] as const));
      return new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator());
    },
    false,
  );
}

const tok = (chars: number): string => String(Math.round(chars / 3.6));
for (const kind of ["orders", "audience"] as const) {
  const rows = all.filter((m) => m.kind === kind);
  if (rows.length === 0) continue;
  const groups: [string, Measured[]][] = [
    ["all", rows],
    ["turns 1-8", rows.filter((m) => m.turn <= 8)],
    ["turns 9-24", rows.filter((m) => m.turn > 8 && m.turn <= 24)],
    ["turns 25+", rows.filter((m) => m.turn > 24)],
  ];
  const keys = [...new Set(rows.flatMap((m) => [...m.sections.keys()]))];
  console.log(`\n${kind} requests: ${rows.length} in ${games} games; mean tokens (characters / 3.6) by part`);
  console.log(["part".padEnd(20), ...groups.map(([n, r]) => `${n} (${r.length})`.padStart(16))].join(""));
  for (const k of [...keys, "total"]) {
    const cells = groups.map(([, r]) => (r.length === 0 ? "-" : tok(r.reduce((a, m) => a + (k === "total" ? m.total : (m.sections.get(k) ?? 0)), 0) / r.length)).padStart(16));
    console.log([k.padEnd(20), ...cells].join(""));
  }
  const uncached = rows.reduce((a, m) => a + m.total - (m.sections.get("rulebook (cached)") ?? 0), 0);
  const variants = [...new Set(rows.map((m) => m.game))].map((g) => new Set(rows.filter((m) => m.game === g).map((m) => m.schema)).size);
  console.log(`  distinct ${kind} schemas (cached prefixes) per game: mean ${(variants.reduce((a, b) => a + b, 0) / variants.length).toFixed(1)}, at most ${Math.max(...variants)}`);
  console.log(`  all ${kind} requests together: ${tok(rows.reduce((a, m) => a + m.total, 0))} tokens, of which outside the cached rulebook ${tok(uncached)}`);
}
