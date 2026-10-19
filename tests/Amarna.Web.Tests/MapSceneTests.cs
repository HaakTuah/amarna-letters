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
            // Every power's own orders are among the season's moves.
            foreach (var p in Powers.All)
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

    [Fact]
    public void A_life_read_in_a_court_holds_only_the_messages_that_court_took_part_in()
    {
        var (runner, frames) = Play(7, 16);
        var k = frames.Count - 1;
        var state = runner.StateAt(k)!;
        var read = 0;
        foreach (var p in Powers.All.Where(state.IsAlive))
        {
            var view = Views.For(state, p);
            foreach (var c in view.Court.Concat(view.Known))
            {
                var life = LifeRecord.Build(frames, i => MapScene.Build(frames, i, p), k, state, p, c.Id);
                Assert.True(life.Known);
                var missions = life.Sections.FirstOrDefault(s => s.Title.StartsWith("Missions"));
                var expected = state.Trails.Count(t => t.EnvoyId == c.Id && (t.From == p || t.To == p));
                Assert.Equal(expected, missions?.Entries.Count ?? 0);
                // No hidden traits or memory outside god view.
                Assert.DoesNotContain(life.Sections, s => s.Title.StartsWith("Hidden") || s.Title.StartsWith("Their own memory"));
                read++;
            }
        }
        Assert.True(read > 0);
        // God view reads everyone's whole record.
        var anyone = state.Characters.First(c => state.Trails.Any(t => t.EnvoyId == c.Id));
        var full = LifeRecord.Build(frames, i => MapScene.Build(frames, i, null), k, state, null, anyone.Id);
        Assert.Contains(full.Sections, s => s.Title.StartsWith("Hidden"));
    }

    [Fact]
    public void Engine_texts_get_their_date_label_for_display()
    {
        Assert.Equal("set out in Akhet, year 1 (turn 1) for Hatti; due back about Peret, year 2 (turn 5)",
            Ui.Dated("set out in turn 1 for Hatti; due back about turn 5", Power.Egypt));
        Assert.Equal("serves at 8 a season through season 3 of year 4 (turn 12)", Ui.Dated("serves at 8 a season through turn 12", null));
        Assert.Equal("Turn them", Ui.Dated("Turn them", null));
    }
}
