using System.Reflection;
using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;
using Amarna.Llm;

namespace Amarna.Game.Tests;

/// <summary>Script kings know only what their seat view shows them, and hold no seed the engine rolls with.</summary>
public class BlindnessTests
{
    /// <summary>A seat that plays as another seat does, under another name.</summary>
    private sealed class Labelled(ISeat inner, string label) : ISeat
    {
        public string Label => label;
        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct) => inner.DecideAsync(view, ct);
        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct) => inner.HostAudienceAsync(view, court, ct);
    }

    private static async Task<(GameRunner Runner, Dictionary<Power, ScriptLeader> Bots)> Played(ulong seed, int turns, Func<Power, ScriptLeader, ISeat>? seat = null)
    {
        var state = GameFactory.NewGame(seed);
        var bots = Powers.All.ToDictionary(p => p, _ => new ScriptLeader(seed));
        var seats = Powers.All.ToDictionary(p => p, p => seat?.Invoke(p, bots[p]) ?? bots[p]);
        var runner = new GameRunner(state, seats, new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        for (var i = 0; i < turns && !state.Ended; i++) await runner.PlayTurnAsync();
        return (runner, bots);
    }

    /// <summary>
    /// Posts a rival's servant (at home, on the road, or watching elsewhere; never one standing at this court) at
    /// <paramref name="p"/>'s court as a spy that court has not caught: it watches in secret. Returns it, or null if no
    /// rival has anyone to send.
    /// </summary>
    private static Character? PostSpy(GameState s, Power p)
    {
        var spy = s.Characters.FirstOrDefault(c => c.Status == CharacterStatus.Employed && c.Employer is { } e && e != p && s.IsAlive(e)
                                                    && c.At != p && c.HeldBy is null && c.Duty != Duty.Detained && c.SecretMaster != p && c.CoverOf(p) is null);
        if (spy is null) return null;
        (spy.Duty, spy.At, spy.MissionTarget, spy.WatchProvince, spy.CurrentTrail) = (Duty.SpyPosted, p, p, null, null);
        // Whatever journey it was on is over: it is at its post.
        s.Journeys.RemoveAll(j => j.CharacterId == spy.Id && j.Kind is JourneyKind.EnvoyOutbound or JourneyKind.EnvoyHomebound or JourneyKind.SpyOutbound or JourneyKind.SpyHomebound);
        return spy;
    }

    /// <summary>
    /// Changes what this king cannot see: rivals' gold, the fine gold in its own unassayed lots, troops out of its sight,
    /// everyone's traits, and a rival's spy posted at its court that it has not caught.
    /// </summary>
    private static void Hide(GameState s, Power p)
    {
        PostSpy(s, p);
        foreach (var q in Powers.All.Where(q => q != p))
        {
            s.Treasuries[q].Gold += 400;
            s.Notify(q, InboxKind.Notice, "A secret", "Only this court knows it.");
        }
        // The ledger counts a lot at its weight: moving fine gold between the treasury and a lot leaves it unchanged.
        foreach (var lot in s.Treasuries[p].Lots.Where(l => l.True >= 10))
        {
            lot.True -= 10;
            s.Treasuries[p].Gold -= 10;
        }
        var sight = Views.Sight(s, WorldMap.Default, p);
        var rival = Powers.All.First(q => q != p && s.IsAlive(q));
        var n = 0;
        foreach (var prov in WorldMap.Default.Provinces.Where(x => !x.IsSea && !sight.Contains(x.Id) && s.UnitAt(x.Id) is null).Take(3))
            s.Units.Add(new Unit { Id = $"u9{n++}", Power = rival, Kind = UnitKind.Army, Province = prov.Id });
        foreach (var c in s.Characters)
        {
            var t = c.Traits;
            (t.Loyalty, t.Greed, t.Competence, t.Ambition, t.Courage) = (100 - t.Loyalty, 100 - t.Greed, 100 - t.Competence, 100 - t.Ambition, 100 - t.Courage);
            t.Sympathy = null;
            t.SympathyStrength = 0;
        }
    }

    [Fact]
    public async Task Hidden_state_outside_the_seat_view_leaves_a_script_kings_orders_unchanged()
    {
        const ulong seed = 6;
        // Two copies of the same game, so that each king has a twin with the same memory.
        var (a, seeing) = await Played(seed, 5);
        var (b, blind) = await Played(seed, 5);
        Assert.Equal(Json.Hash(a.State), Json.Hash(b.State));

        foreach (var p in a.State.Alive)
        {
            var hidden = Json.Deserialize<GameState>(Json.Serialize(a.State))!;
            Hide(hidden, p);
            Assert.NotEqual(Json.Hash(a.State), Json.Hash(hidden));
            var orders = await seeing[p].DecideAsync(Views.For(a.State, p), default);
            var unchanged = await blind[p].DecideAsync(Views.For(hidden, p), default);
            Assert.Equal(Json.Serialize(orders), Json.Serialize(unchanged));
        }
    }

    [Fact]
    public async Task A_foreign_spy_at_a_court_that_has_not_caught_it_changes_nothing_that_court_is_shown()
    {
        var (a, _) = await Played(6, 5);
        foreach (var p in a.State.Alive)
        {
            var posted = Json.Deserialize<GameState>(Json.Serialize(a.State))!;
            var spy = PostSpy(posted, p);
            Assert.NotNull(spy);
            Assert.True(spy.HiddenAt(p));
            // The seat view, field by field, and every text a model or human king reads of it.
            var seen = Views.For(a.State, p);
            var shown = Views.For(posted, p);
            Assert.Equal(Json.Serialize(seen), Json.Serialize(shown));
            Assert.Equal(Prompts.Situation(seen), Prompts.Situation(shown));
        }
    }

    [Fact]
    public async Task A_court_that_caught_a_spy_has_on_record_only_the_master_it_confessed_to()
    {
        // Script games, seed by seed, until a caught spy kept silent. The seeds are searched rather than named, because a
        // change to the rolls (as fix (d)'s id counters made) moves which games have one.
        var silent = 0;
        for (ulong seed = 1; seed <= 80 && silent == 0; seed++)
        {
            var (runner, _) = await Played(seed, 16);
            var s = runner.State;
            foreach (var l in s.Losses.Where(l => l.Kind == LossKind.Captured))
            {
                var name = s.Char(l.CharacterId).Name;
                // What the captor's court has on record (in the web app, its Events and Season panels).
                var line = Assert.Single(s.Events, e => e.Turn == l.Turn && e.Kind == "spy-caught" && e.VisibleTo.Contains(l.Court) && e.Text.Contains(name)).Text;
                if (l.Master is { } master) Assert.Equal($"{l.Court} caught {name}, a spy of {master}.", line);
                else
                {
                    silent++;
                    Assert.Equal($"{l.Court} caught {name}, a spy who will not say whom they serve.", line);
                    Assert.Single(s.Events, e => e.Turn == l.Turn && e.Kind == "spy-caught" && e.VisibleTo.Count == 0 && e.Text.StartsWith($"{l.Court} caught {name}, a spy of "));
                }
            }
        }
        Assert.True(silent > 0, "no caught spy kept silent in these games");
    }

    [Fact]
    public async Task Seat_labels_change_nothing_a_script_king_does()
    {
        var (a, _) = await Played(4, 5);
        var (b, _) = await Played(4, 5, (p, bot) => p is Power.Egypt or Power.Hatti ? new Labelled(bot, "Claude Opus 5.5 leader") : bot);
        Assert.NotEqual(a.Log.Header.Seats[Power.Egypt], b.Log.Header.Seats[Power.Egypt]);
        Assert.Equal(Json.Hash(a.State), Json.Hash(b.State));
    }

    [Fact]
    public async Task No_script_seat_holds_the_seed_the_engine_rolls_with()
    {
        for (ulong seed = 1; seed <= 20; seed++)
        {
            var seats = Powers.All.Select(p => ScriptLeader.SeatSeed(seed, p)).ToList();
            Assert.DoesNotContain(seed, seats);
            Assert.Equal(seats.Count, seats.Distinct().Count());
        }

        const ulong game = 13;
        var state = GameFactory.NewGame(game);
        var bot = new ScriptLeader(game);
        foreach (var p in Powers.All) await bot.DecideAsync(Views.For(state, p), default);

        // Nothing the bot keeps is the game's seed.
        foreach (var f in typeof(ScriptLeader).GetFields(BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public))
        {
            var value = f.GetValue(bot);
            if (value is ulong u) Assert.NotEqual(game, u);
            if (value is Dictionary<Power, ulong> d) Assert.DoesNotContain(game, d.Values);
        }
        foreach (var p in Powers.All)
        {
            var brain = bot.BrainOf(p)!;
            Assert.Equal(ScriptLeader.SeatSeed(game, p), brain.Seed);
            // The god view shows the temperament the seat plays with.
            Assert.Equal(ScriptLeader.Temperament(p, game), brain.P);
            // Rivals it pictures roll from its own seat's stream.
            Assert.NotEmpty(brain.Models);
            Assert.All(brain.Models.Values, m => Assert.Equal(brain.Seed, m.Seed));
        }
    }
}
