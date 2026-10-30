import { describe, test } from "vitest";
import {
  AllPowers,
  type AudienceView,
  type GameConfig,
  type HostReply,
  type Power,
  type SeatView,
  type TurnSubmission,
  newGame,
  newGameConfig,
  newHostReply,
  drawFinalSeason,
  omenLine,
  omenTier,
} from "@amarna/engine";
import { Views, type GameState } from "@amarna/engine";
import { Council, GameLog, GameRunner, type ISeat, ScriptLeader, ScriptMind, TemplateNarrator, titleOf } from "@amarna/game";
import { Assert } from "../../engine/test/support.ts";
import { Near, seasons, smallSeats } from "./small-world.ts";

/** A seat played as a human or model would be (it may sleep, so it hears a council), deciding as a script king does. */
class Hearing implements ISeat {
  readonly label = "Human";
  readonly canSleep = true;
  readonly hearsCouncil = true;
  readonly views: SeatView[] = [];
  private readonly bot: ScriptLeader;
  private readonly choose: (v: SeatView) => string;
  constructor(seed: number, choose: (v: SeatView) => string = () => "") {
    this.bot = new ScriptLeader(seed);
    this.choose = choose;
  }
  decide(view: SeatView): Promise<TurnSubmission> {
    this.views.push(view);
    const sub = this.bot.decideNow(view);
    sub.stayAwake = true;
    sub.council = this.choose(view);
    return Promise.resolve(sub);
  }
  hostAudience(_view: AudienceView, _court: SeatView): Promise<HostReply> {
    return Promise.resolve(newHostReply({ end: true }));
  }
}

async function play(seed: number, seat: Hearing, n: number, config: GameConfig = seasons(n)): Promise<GameRunner> {
  const seats = smallSeats((p) => (p === "Mitanni" ? seat : new ScriptLeader(seed)), Near);
  const runner = Object.assign(new GameRunner(newGame(seed, config), seats, new ScriptMind(), new TemplateNarrator()), { writeChronicles: false });
  await runner.prepare();
  while (await runner.playTurn()) {
    /* the game */
  }
  return runner;
}

describe("The royal council (item 16)", () => {
  test("A seat played by a human or model hears four advisors, compact, with numbers and its court's titles", async () => {
    const seat = new Hearing(3);
    await play(3, seat, 3);
    Assert.true(seat.views.length >= 2);
    for (const v of seat.views) {
      const c = v.council!;
      Assert.notNull(c);
      Assert.equal(["General", "Steward", "Tjaty", "Diviner"], c.advisors.map((a) => a.advisor));
      // Tactics only: troop orders and levies.
      for (const l of [...c.agreed, ...c.advisors.flatMap((a) => a.lines)]) Assert.true(["move", "support", "hold", "convoy", "besiege", "sally", "raise", "disband"].includes(l.order.type));
      // What all four agree on appears once, never again under an advisor.
      for (const a of c.advisors) for (const l of a.lines) Assert.false(c.agreed.some((g) => JSON.stringify(g.order) === JSON.stringify(l.order)));
      for (const a of c.advisors) Assert.true(a.reading.length > 0 && a.tilt.length > 0);
    }
    // Moves carry the pictured seasons behind them.
    const lines = seat.views.flatMap((v) => [...v.council!.agreed, ...v.council!.advisors.flatMap((a) => a.lines)]);
    Assert.true(lines.some((l) => l.order.type === "move" && /\d of 8 pictured seasons/.test(l.text)));
    // A strike never claims a city its troops only reach: walls fall to a storm or a siege.
    for (const l of lines) if (/strikes at .*'s /.test(l.text)) Assert.contains("ours at the end of", l.text);
    // No internal ids in what the king reads.
    for (const l of lines) Assert.false(/\bp\d|\bc\d+\b/.test(l.text));
    // Titles only where the sources grade them A or B; the plain archetype elsewhere.
    Assert.equal("the bārû", titleOf("Babylonia", "Diviner"));
    Assert.equal("the General", titleOf("Assyria", "General"));
    Assert.equal("the vizier (tjaty)", titleOf("Egypt", "Tjaty"));
  });

  test("Script seats never hear a council; a seat that turns it off hears none from the next season, and the log records it", async () => {
    const seat = new Hearing(5, (v) => (v.turn === 1 ? "off" : ""));
    const runner = await play(5, seat, 3);
    Assert.notNull(seat.views[0].council);
    Assert.true(seat.views[0].councilOn);
    for (const v of seat.views.slice(1)) {
      Assert.null(v.council);
      Assert.false(v.councilOn);
    }
    Assert.equal(["Mitanni"], runner.state.councilOff);
    Assert.true(runner.state.events.some((e) => e.kind === "council" && e.visibleTo.includes("Mitanni")));
    // The game replays exactly: the council is advice on the seat's screen, never a roll of the game's.
    const replay = Object.assign(GameRunner.forReplay(GameLog.fromJsonl(runner.log.toJsonl())), { writeChronicles: false });
    await replay.prepare();
    while (await replay.playTurn()) {
      /* the game */
    }
    Assert.equal(JSON.stringify(runner.state.councilOff), JSON.stringify(replay.state.councilOff));
    Assert.equal(runner.state.turn, replay.state.turn);
  });

  test("The council changes nothing in the game: the same seat with it on or off plays the same seasons", async () => {
    const on = new Hearing(7);
    const off = new Hearing(7, () => "off");
    const a = await play(7, on, 3);
    const b = await play(7, off, 3);
    Assert.equal(JSON.stringify([...a.state.owner]), JSON.stringify([...b.state.owner]));
    Assert.equal(
      JSON.stringify(a.state.units.map((u) => [u.power, u.province])),
      JSON.stringify(b.state.units.map((u) => [u.power, u.province])),
    );
  });

  test("The council is deterministic: the same view gives the same counsel", () => {
    const s = newGame(11, seasons(4));
    const one = new Council(11).proposals(viewOf(s, "Hatti"));
    const two = new Council(11).proposals(viewOf(s, "Hatti"));
    Assert.equal(JSON.stringify(one.map((p) => p.orders)), JSON.stringify(two.map((p) => p.orders)));
    Assert.equal(4, one.length);
  });
});

describe("Omens of the end (item 16)", () => {
  const c = newGameConfig();

  test("The signs darken in tiers by the public chance, the darkest from the bottom of the cap's range, and then hold", () => {
    Assert.equal("Quiet", omenTier(1, c, 1));
    Assert.equal("Darkest", omenTier(1, c, c.capMin));
    for (let t = c.capMin; t <= c.capMax; t++) Assert.equal("Darkest", omenTier(1, c, t));
    const order = ["Quiet", "Troubled", "Grave", "Borrowed", "Darkest"];
    let last = 0;
    for (let t = 1; t <= c.capMax; t++) {
      const i = order.indexOf(omenTier(1, c, t)!);
      Assert.true(i >= last);
      last = i;
    }
    // Borrowed time begins at a point drawn past the median, which differs between games.
    const starts = [1, 2, 3, 4, 5, 6, 7, 8].map((seed) => [...Array(c.capMin).keys()].find((t) => omenTier(seed, c, t) === "Borrowed")!);
    Assert.true(new Set(starts).size > 1);
    for (const t of starts) Assert.true(t >= c.endMedian);
  });

  test("Omens never read the drawn last season: games with different last seasons read the same tiers", () => {
    // A game whose drawn last season comes early still reads quiet signs in it: no countdown.
    const seeds = [...Array(400).keys()].map((x) => x + 1);
    const early = seeds.find((seed) => drawFinalSeason(seed, c)!.season <= 8)!;
    Assert.equal("Quiet", omenTier(early, c, drawFinalSeason(early, c)!.season));
    // And a game drawn to run to its cap reads the darkest signs from the bottom of the range, as every other game does.
    const late = seeds.find((seed) => drawFinalSeason(seed, c)!.byCap)!;
    Assert.true(drawFinalSeason(late, c)!.season > 80);
    Assert.equal("Darkest", omenTier(late, c, 80));
  });

  test("Each court speaks in its own diviners' voice, in words, and an open age is silent", () => {
    const turn = 85;
    Assert.contains("liver", omenLine(1, c, turn, "Babylonia"));
    Assert.contains("unfavourable", omenLine(1, c, turn, "Hatti"));
    Assert.contains("turning away from this land", omenLine(1, c, turn, "Egypt"));
    Assert.contains("Nergal", omenLine(1, c, turn, "Alashiya"));
    for (const p of AllPowers) Assert.false(/\d/.test(omenLine(1, c, 30, p)));
    Assert.equal("", omenLine(1, { ...c, openAge: true }, 30, "Egypt"));
  });

  test("Every seat sees the omens whether or not its council is on", () => {
    const s = newGame(1);
    s.councilOff = ["Hatti"];
    const v = viewOf(s, "Hatti");
    Assert.false(v.councilOn);
    Assert.true(v.omens.length > 0);
  });
});

function viewOf(s: GameState, p: Power): SeatView {
  return Views.for(s, p);
}
