using System.Reflection;
using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;

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

    /// <summary>Changes what this king cannot see: rivals' gold, the fine gold in its own unassayed lots, troops out of its sight, everyone's traits.</summary>
    private static void Hide(GameState s, Power p)
    {
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
