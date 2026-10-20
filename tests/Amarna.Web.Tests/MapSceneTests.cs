using System.Text.Json;
using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;
using Amarna.Web.Components;
using Amarna.Web.Services;

namespace Amarna.Web.Tests;

/// <summary>
/// The web map's view of a game (the visual overhaul, Build order item 2): what each court's map may show, the fog
/// drawn from its own earlier sights, and frames that agree with the snapshots they stand for. Games of script kings,
/// played as the web app plays them.
/// </summary>
public class MapSceneTests
{
    private sealed record Played(GameRunner Runner, SeasonFrames Frames);

    private static readonly Dictionary<ulong, Played> Cache = new();

    /// <summary>A game of script kings with a frame taken after every season, as the web session takes them.</summary>
    private static Played Play(ulong seed, int turns)
    {
        lock (Cache)
        {
            if (Cache.TryGetValue(seed, out var done)) return done;
            var state = GameFactory.NewGame(seed);
            var seats = Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(seed));
            var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
            var frames = new SeasonFrames();
            runner.Changed += () => frames.CatchUp(runner);
            runner.PrepareAsync().GetAwaiter().GetResult();
            for (var i = 0; i < turns && !state.Ended; i++) runner.PlayTurnAsync().GetAwaiter().GetResult();
            return Cache[seed] = new Played(runner, frames);
        }
    }

    public static IEnumerable<object[]> Seeds => [[3UL], [7UL]];

    [Fact]
    public async Task A_caught_spy_is_marked_on_its_captors_map_only_with_the_master_it_confessed_to()
    {
        async Task<ScenePerson> Drawn(Power? confessed)
        {
            var state = GameFactory.NewGame(5);
            var spy = state.Characters.First(c => c.Employer == Power.Babylonia);
            // Caught at Assyria's court, as the engine catches a spy.
            (spy.Status, spy.HeldBy, spy.Duty, spy.At, spy.SecretMaster) = (CharacterStatus.Captured, Power.Assyria, Duty.None, Power.Assyria, null);
            state.Losses.Add(new LossAbroad { Turn = 1, Kind = LossKind.Captured, CharacterId = spy.Id, Court = Power.Assyria, Master = confessed });
            var seats = Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(5));
            var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
            await runner.PrepareAsync();
            var frames = new SeasonFrames();
            frames.CatchUp(runner);
            var person = MapScene.Build(frames, 0, Power.Assyria).People.Single(x => x.Id == spy.Id);
            Assert.Equal(PersonKind.Captive, person.Kind);
            Assert.Equal(confessed, Views.For(state, Power.Assyria).Known.Single(x => x.Id == spy.Id).Employer);
            return person;
        }

        Assert.Null((await Drawn(null)).Owner);
        Assert.Equal(Power.Babylonia, (await Drawn(Power.Babylonia)).Owner);
    }

    [Fact]
    public async Task A_spy_a_court_has_not_caught_is_neither_drawn_nor_followed_there()
    {
        var state = GameFactory.NewGame(5);
        var spy = state.Characters.First(c => c.Employer == Power.Babylonia);
        // Posted at Assyria's court, watching it in secret.
        (spy.Duty, spy.At, spy.MissionTarget, spy.SecretMaster) = (Duty.SpyPosted, Power.Assyria, Power.Assyria, null);
        var seats = Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(5));
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await runner.PrepareAsync();
        var frames = new SeasonFrames();
        frames.CatchUp(runner);

        Assert.DoesNotContain(MapScene.Build(frames, 0, Power.Assyria).People, x => x.Id == spy.Id);
        // The People panel lists the court's view; the follow view knows nothing of the spy.
        var view = Views.For(state, Power.Assyria);
        Assert.DoesNotContain(view.Court.Concat(view.Known), x => x.Id == spy.Id);
        var life = LifeRecord.Build(frames, i => MapScene.Build(frames, i, Power.Assyria), 0, state, Power.Assyria, spy.Id);
        Assert.False(life.Known);
        Assert.Null(life.Employer);
        // Its master follows it to its post.
        var own = LifeRecord.Build(frames, i => MapScene.Build(frames, i, Power.Babylonia), 0, state, Power.Babylonia, spy.Id);
        Assert.True(own.Known);
        Assert.Equal(Power.Babylonia, own.Employer);
    }

    [Theory]
    [MemberData(nameof(Seeds))]
    public void A_court_sees_only_its_own_people_and_foreign_envoys_at_its_court(ulong seed)
    {
        var (runner, frames) = Play(seed, 16);
        var shown = 0;
        for (var k = 0; k < frames.Count; k++)
        {
            var f = frames[k];
            var state = runner.StateAt(k)!;
            foreach (var p in Powers.All.Where(state.IsAlive))
            {
                var scene = MapScene.Build(frames, k, p);
                var view = Views.For(state, p);
                var known = view.Court.Concat(view.Known).Select(c => c.Id).ToHashSet();
                foreach (var person in scene.People)
                {
                    shown++;
                    var c = f.People[person.Id];
                    // Every person drawn is one the engine's own view of that court lists.
                    Assert.True(known.Contains(person.Id), $"seed {seed}, after turn {k}: {p} shown {c.Name}, whom its view does not list");
                    var own = c.Employer == p || c.CoverOf(p) is not null;
                    var held = c.HeldBy == p;
                    var envoyHere = c.Duty == Duty.EnvoyAtCourt && c.At == p;
                    Assert.True(own || held || envoyHere, $"seed {seed}, after turn {k}: {p} shown {c.Name} ({c.Duty} at {c.At}, serving {c.Employer})");
                    Assert.False(!own && !held && c.Duty == Duty.SpyPosted, $"{p} shown a foreign spy, {c.Name}");
                    // A foreign person is marked with no other master than the view names (a captive: the one it confessed to).
                    if (!own) Assert.Equal(view.Known.Single(x => x.Id == person.Id).Employer, person.Owner);
                }
                foreach (var t in scene.Travellers)
                {
                    shown++;
                    if (t.Kind == TravellerKind.Gold)
                    {
                        Assert.Equal(p, t.Owner);
                        continue;
                    }
                    var c = f.People[t.CharacterId!];
                    Assert.True(c.Employer == p || c.CoverOf(p) is not null, $"{p} shown {c.Name} on the road, who does not serve it");
                }
            }
        }
        Assert.True(shown > 0, "the games put nobody on a court's map");
    }

    [Theory]
    [MemberData(nameof(Seeds))]
    public void The_fog_is_clear_exactly_where_the_court_sees_and_ghosts_stand_only_out_of_sight(ulong seed)
    {
        var (runner, frames) = Play(seed, 16);
        var ghosts = 0;
        for (var k = 0; k < frames.Count; k++)
        {
            var state = runner.StateAt(k)!;
            foreach (var p in Powers.All.Where(state.IsAlive))
            {
                var scene = MapScene.Build(frames, k, p);
                var view = Views.For(state, p);
                var visible = view.Visible.ToHashSet();
                foreach (var prov in WorldMap.Default.Provinces)
                {
                    var age = scene.FogAge.TryGetValue(prov.Id, out var a) ? a : -1;
                    Assert.Equal(visible.Contains(prov.Id), age == 0);
                }
                // The units drawn as seen now are exactly the units in the court's view.
                var now = scene.Units.Where(u => !u.Ghost).SelectMany(u => Enumerable.Repeat((u.Power, u.Kind, u.Province), u.Count)).OrderBy(x => x.ToString()).ToList();
                var engine = view.Units.Select(u => (u.Power, u.Kind, u.Province)).OrderBy(x => x.ToString()).ToList();
                Assert.Equal(engine, now);
                foreach (var g in scene.Units.Where(u => u.Ghost))
                {
                    ghosts++;
                    Assert.DoesNotContain(g.Province, visible);
                    Assert.True(g.Age >= 1 && g.SeenAt == k - g.Age);
                    // A ghost is a unit the court really saw there, in that season's sight.
                    Assert.Contains(g.Province, frames[g.SeenAt].Sight[p]);
                    Assert.Contains(frames[g.SeenAt].Units, u => u.Province == g.Province && u.Power == g.Power && u.Kind == g.Kind);
                }
            }
        }
        Assert.True(ghosts > 0, "the games left no ghost to check");
    }

    [Fact]
    public void God_view_shows_every_unit_and_no_fog()
    {
        var (runner, frames) = Play(7, 16);
        for (var k = 0; k < frames.Count; k++)
        {
            var scene = MapScene.Build(frames, k, null);
            Assert.Empty(scene.FogAge);
            Assert.Equal(runner.StateAt(k)!.Units.Count, scene.Units.Sum(u => u.Count));
            Assert.DoesNotContain(scene.Units, u => u.Ghost);
        }
    }

    [Fact]
    public void A_court_draws_the_walls_standing_only_where_it_sees_and_god_view_draws_them_all()
    {
        var (runner, frames) = Play(7, 16);
        var differ = 0;
        for (var k = 0; k < frames.Count; k++)
        {
            var f = frames[k];
            Assert.Equal(f.Walls.OrderBy(x => x.Key), MapScene.Build(frames, k, null).Walls.OrderBy(x => x.Key));
            foreach (var p in Powers.All.Where(runner.StateAt(k)!.IsAlive))
            {
                var walls = MapScene.Build(frames, k, p).Walls;
                Assert.Equal(f.KnownWalls[p].OrderBy(x => x.Key), walls.OrderBy(x => x.Key));
                foreach (var id in f.Sight[p].Where(id => !WorldMap.Default[id].IsSea))
                    Assert.Equal(f.Walls.GetValueOrDefault(id), walls.GetValueOrDefault(id));
                differ += WorldMap.Default.LandProvinces.Count(x => f.Walls.GetValueOrDefault(x.Id) != walls.GetValueOrDefault(x.Id));
            }
        }
        Assert.True(differ > 0, "no court's walls ever differed from the truth out of its sight, so nothing was checked");
    }

    [Fact]
    public void A_frame_from_the_live_state_matches_one_read_back_from_its_snapshot()
    {
        var (runner, frames) = Play(7, 16);
        var options = new JsonSerializerOptions { WriteIndented = false };
        for (var k = 0; k < frames.Count; k++)
        {
            var again = SeasonFrame.From(runner.StateAt(k)!, k, k > 0 ? frames[k - 1] : null);
            var live = frames[k];
            Assert.Equal(JsonSerializer.Serialize(live.Units, options), JsonSerializer.Serialize(again.Units, options));
            Assert.Equal(JsonSerializer.Serialize(live.Moves, options), JsonSerializer.Serialize(again.Moves, options));
            Assert.Equal(JsonSerializer.Serialize(live.Journeys, options), JsonSerializer.Serialize(again.Journeys, options));
            Assert.Equal(JsonSerializer.Serialize(live.News, options), JsonSerializer.Serialize(again.News, options));
            Assert.Equal(live.Owner.OrderBy(x => x.Key), again.Owner.OrderBy(x => x.Key));
            foreach (var p in Powers.All) Assert.Equal(live.Sight[p].OrderBy(x => x), again.Sight[p].OrderBy(x => x));
            foreach (var p in Powers.All) Assert.Equal(live.KnownWalls[p].OrderBy(x => x.Key), again.KnownWalls[p].OrderBy(x => x.Key));
        }
    }

    [Fact]
    public void Every_move_of_a_season_is_in_the_god_view_and_a_court_draws_only_what_it_saw()
    {
        var (runner, frames) = Play(3, 16);
        for (var k = 1; k < frames.Count; k++)
        {
            var state = runner.StateAt(k)!;
            var god = MapScene.Build(frames, k, null);
            // Every order seen by a court standing as the season began is among the season's moves.
            foreach (var p in Powers.All.Where(runner.StateAt(k - 1)!.IsAlive))
                foreach (var o in state.LastSeen.GetValueOrDefault(p) ?? [])
                    Assert.Contains(frames[k].Moves, m => m.Power == o.Power && m.From == o.Province && m.Order == o.Order);
            foreach (var p in Powers.All.Where(state.IsAlive))
            {
                var seen = state.LastSeen.GetValueOrDefault(p) ?? [];
                var scene = MapScene.Build(frames, k, p);
                foreach (var m in scene.Moves)
                    Assert.Contains(seen, o => o.Power == m.Power && o.Province == m.From);
                Assert.True(scene.Moves.Count <= god.Moves.Count);
            }
        }
    }

    public static IEnumerable<object[]> ManySeeds => [[1UL], [3UL], [5UL], [7UL], [9UL]];

    [Theory]
    [MemberData(nameof(ManySeeds))]
    public void A_court_learns_how_land_changed_hands_only_from_moves_it_saw(ulong seed)
    {
        var (runner, frames) = Play(seed, 16);
        var captures = 0;
        for (var k = 1; k < frames.Count; k++)
        {
            var state = runner.StateAt(k)!;
            var prev = frames[k - 1];
            var god = MapScene.Build(frames, k, null);
            foreach (var c in god.Captures)
            {
                var marched = frames[k].Moves.Any(m => m.IsMove && m.Succeeded && m.Target == c.Province && m.Power == c.To);
                Assert.Equal(marched ? CaptureHow.Taken : CaptureHow.Passed, c.How);
            }
            foreach (var p in Powers.All.Where(state.IsAlive))
            {
                var seen = state.LastSeen.GetValueOrDefault(p) ?? [];
                var scene = MapScene.Build(frames, k, p);
                // Who holds each province is public, so every view lists the same changes of hands.
                Assert.Equal(god.Captures.Select(c => (c.Province, c.From, c.To)), scene.Captures.Select(c => (c.Province, c.From, c.To)));
                foreach (var (c, truth) in scene.Captures.Zip(god.Captures))
                {
                    captures++;
                    // How it changed hands is not: "taken" only when the court saw the new owner's troops march in.
                    var sawIt = seen.Any(o => o.Order == "move" && o.Succeeded && o.Target == c.Province && o.Power == c.To);
                    Assert.True(sawIt == (c.How == CaptureHow.Taken), $"seed {seed}, after turn {k}: {p} reads {c.Province} to {c.To} as {c.How}, saw the move: {sawIt}");
                    // A court on either side is told the truth; any other that saw no march, only who holds it now.
                    var party = c.From == p || c.To == p;
                    Assert.Equal(party || sawIt ? truth.How : CaptureHow.Unseen, c.How);
                }
                // An attack is called one only from what the court could tell: the target's owner, its walls, or a
                // foreign unit standing there in its sight.
                var sight = prev.Sight[p];
                foreach (var m in scene.Moves.Where(m => m.Style == MoveStyle.Attack || m.Text.EndsWith("(an attack)")))
                {
                    var o = seen.First(o => o.Power == m.Power && o.Province == m.From && o.Order == "move" && o.Target == m.To);
                    var foreignLand = o.TargetOwner is { } owner && owner != m.Power;
                    var walls = o.TargetOwner != m.Power && MapScene.WallsIn(prev, p).ContainsKey(m.To);
                    Assert.True(foreignLand || walls || sight.Contains(m.To), $"seed {seed}, after turn {k}: {p} told of an attack on {m.To}, out of its sight");
                }
            }
        }
        Assert.True(captures > 0, "the games changed no hands");
    }

    [Fact]
    public void A_life_read_in_a_court_holds_only_the_messages_that_court_sent_or_heard()
    {
        var (runner, frames) = Play(7, 16);
        var k = frames.Count - 1;
        var state = runner.StateAt(k)!;
        var read = 0;
        var received = 0;
        foreach (var p in Powers.All.Where(state.IsAlive))
        {
            var view = Views.For(state, p);
            foreach (var c in view.Court.Concat(view.Known))
            {
                var life = LifeRecord.Build(frames, i => MapScene.Build(frames, i, p), k, state, p, c.Id);
                Assert.True(life.Known);
                var missions = life.Sections.FirstOrDefault(s => s.Title.StartsWith("Missions"));
                var expected = state.Trails.Where(t => t.EnvoyId == c.Id && (t.From == p || t.To == p && t.AudienceTurn is not null)).OrderBy(t => t.Turn).ToList();
                Assert.Equal(expected.Count, missions?.Entries.Count ?? 0);
                foreach (var (e, t) in (missions?.Entries ?? []).Zip(expected))
                {
                    // The sender's dates run from sending to the report home; a court that only received the envoy
                    // knows the audience it gave, not when or whether the envoy reported home.
                    Assert.Equal(t.From == p ? t.Turn : t.AudienceTurn, e.From);
                    Assert.Equal(t.From == p ? t.ReportTurn : null, e.Until);
                    if (t.From != p) received++;
                }
                // No hidden traits or memory outside god view.
                Assert.DoesNotContain(life.Sections, s => s.Title.StartsWith("Hidden") || s.Title.StartsWith("Their own memory"));
                read++;
            }
        }
        Assert.True(read > 0);
        Assert.True(received > 0, "no court read a mission it only received");
        // God view reads everyone's whole record.
        var anyone = state.Characters.First(c => state.Trails.Any(t => t.EnvoyId == c.Id));
        var full = LifeRecord.Build(frames, i => MapScene.Build(frames, i, null), k, state, null, anyone.Id);
        Assert.Contains(full.Sections, s => s.Title.StartsWith("Hidden"));
    }

    [Fact]
    public void Engine_texts_get_their_date_label_for_display()
    {
        Assert.Equal("set out in Akhet, 1345 BCE (turn 1) for Hatti; due back about Peret, 1344 BCE (turn 5)",
            Ui.Dated("set out in turn 1 for Hatti; due back about turn 5", Power.Egypt));
        Assert.Equal("serves at 8 a season through season 3, 1342 BCE (turn 12)", Ui.Dated("serves at 8 a season through turn 12", null));
        Assert.Equal("Turn them", Ui.Dated("Turn them", null));
        // A spy's report dates what it saw by "season of turn N": the label alone names the season.
        Assert.Equal("From Arzawa, the second season, 1343 BCE (turn 8).", Ui.Dated("From Arzawa, season of turn 8.", Power.Hatti));
        Assert.Equal("From Arzawa, season 2, 1343 BCE (turn 8).", Ui.Dated("From Arzawa, season of turn 8.", null));
        Assert.Equal("Season 2, 1343 BCE (turn 8) was quiet", Ui.Dated("Turn 8 was quiet", null));
    }

    [Fact]
    public async Task A_fallen_court_s_last_orders_are_not_drawn_again()
    {
        // Seed 1, with Alashiya's island given to Egypt by decree after the second season, as a test: Alashiya falls in the
        // third (since the siege package walls make a fall in the first seasons rare).
        var state = GameFactory.NewGame(1);
        var seats = Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(1));
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        var frames = new SeasonFrames();
        runner.Changed += () => frames.CatchUp(runner);
        await runner.PrepareAsync();
        for (var i = 0; i < 8 && !state.Ended; i++)
        {
            if (i == 2)
            {
                state.Owner["enkomi"] = Power.Egypt;
                state.Owner["tamassos"] = Power.Egypt;
                state.Units.RemoveAll(u => u.Power == Power.Alashiya);
            }
            await runner.PlayTurnAsync();
        }
        var after = 0;
        for (var k = 1; k < frames.Count; k++)
        {
            // Every order of the season was given by a unit standing where it was given from as the season began.
            foreach (var m in frames[k].Moves)
                Assert.Contains(frames[k - 1].Units, u => u.Province == m.From && u.Power == m.Power && u.Kind == m.Kind);
            if (frames[k - 1].Eliminated.Count > 0) after++;
        }
        Assert.True(after > 0, "no court fell early enough in the game to check");
    }
}
