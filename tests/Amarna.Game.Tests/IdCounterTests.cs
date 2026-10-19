using Amarna.Engine;
using Amarna.Game;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>
/// Each kind of object counts its ids on its own (Build order item 4, fix (d)), so a kind of object added later, or more
/// objects of one kind, leaves the ids of every other kind, and with them every roll keyed by an id, where they were.
/// </summary>
public class IdCounterTests
{
    /// <summary>
    /// A kind of object no rule knows, issued during play: at every call to a seat or to a character's mind, which come
    /// between the engine's own steps in a season (arrivals, audiences, resolution). Nothing reads the ids.
    /// </summary>
    private sealed class Dummy(GameState state)
    {
        public const string Prefix = "dummy";
        private readonly object _gate = new();

        public void Issue()
        {
            lock (_gate)
                for (var i = 0; i < 3; i++) state.NewId(Prefix);
        }
    }

    private sealed class DummySeat(ISeat inner, Dummy dummy) : ISeat
    {
        public string Label => inner.Label;
        public bool CanSleep => inner.CanSleep;

        public Task<TurnSubmission> DecideAsync(SeatView view, CancellationToken ct)
        {
            dummy.Issue();
            return inner.DecideAsync(view, ct);
        }

        public Task<HostReply> HostAudienceAsync(AudienceView view, SeatView court, CancellationToken ct)
        {
            dummy.Issue();
            return inner.HostAudienceAsync(view, court, ct);
        }
    }

    private sealed class DummyMind(ICharacterMind inner, Dummy dummy) : ICharacterMind
    {
        public string Label => inner.Label;

        public Task<PresentResult> PresentAsync(EnvoyContext ctx, CancellationToken ct)
        {
            dummy.Issue();
            return inner.PresentAsync(ctx, ct);
        }

        public Task<EnvoyReaction> ReactAsync(EnvoyContext ctx, HostReply host, CancellationToken ct)
        {
            dummy.Issue();
            return inner.ReactAsync(ctx, host, ct);
        }

        public Task<MindReply> WriteAsync(MindContext ctx, CancellationToken ct)
        {
            dummy.Issue();
            return inner.WriteAsync(ctx, ct);
        }
    }

    /// <summary>A whole script game, with or without the dummy kind.</summary>
    private static async Task<GameRunner> Played(ulong seed, bool withDummy)
    {
        var state = GameFactory.NewGame(seed);
        var dummy = new Dummy(state);
        var bot = new ScriptLeader(seed);
        var seats = Powers.All.ToDictionary(p => p, _ => withDummy ? new DummySeat(bot, dummy) : (ISeat)bot);
        ICharacterMind minds = withDummy ? new DummyMind(new ScriptMind(), dummy) : new ScriptMind();
        var r = new GameRunner(state, seats, minds, new TemplateNarrator()) { WriteChronicles = false };
        await r.PrepareAsync();
        while (await r.PlayTurnAsync()) { }
        return r;
    }

    /// <summary>The whole state, without the dummy kind's counter, its counters in a fixed order.</summary>
    private static string Canonical(GameState s)
    {
        var copy = Json.Deserialize<GameState>(Json.Serialize(s))!;
        copy.IdCounters = copy.IdCounters.Where(x => x.Key != Dummy.Prefix).OrderBy(x => x.Key, StringComparer.Ordinal).ToDictionary();
        return Json.Serialize(copy);
    }

    [Theory]
    [InlineData(1ul)]
    [InlineData(2ul)]
    [InlineData(3ul)]
    public async Task A_new_kind_of_object_made_during_play_leaves_the_game_unchanged(ulong seed)
    {
        var plain = await Played(seed, withDummy: false);
        var dummy = await Played(seed, withDummy: true);

        // The dummy kind was really issued, many times in every season.
        Assert.False(plain.State.IdCounters.ContainsKey(Dummy.Prefix));
        Assert.True(dummy.State.IdCounters[Dummy.Prefix] > 10 * dummy.State.Turn, $"only {dummy.State.IdCounters[Dummy.Prefix]} dummy ids");

        // The same log of every order, audience and decision, the same outcomes, winner and length, and the same world.
        Assert.Equal(plain.Log.ToJsonl(), dummy.Log.ToJsonl());
        Assert.Equal(Json.Serialize(plain.State.Events), Json.Serialize(dummy.State.Events));
        Assert.Equal(plain.State.Winners, dummy.State.Winners);
        Assert.Equal(plain.State.Turn, dummy.State.Turn);
        Assert.Equal(Canonical(plain.State), Canonical(dummy.State));
    }

    [Fact]
    public void Every_kind_has_a_prefix_of_its_own()
    {
        // Letters only, so an id reads back as one prefix and one number, and ids of different kinds never meet.
        Assert.All(IdKinds.All.Keys, p => Assert.Matches("^[a-z]+$", p));
        Assert.Equal(IdKinds.All.Count, IdKinds.All.Keys.Distinct().Count());
        Assert.DoesNotContain(IdKinds.StandingOrder, IdKinds.All.Keys);
        Assert.DoesNotContain(Dummy.Prefix, IdKinds.All.Keys);
    }

    [Theory]
    [InlineData(1ul)]
    [InlineData(5ul)]
    public async Task Every_id_issued_in_play_has_its_kinds_prefix_is_unique_and_counts_up_in_the_order_made(ulong seed)
    {
        var s = (await Played(seed, withDummy: false)).State;
        var kinds = new (string Prefix, List<string> Ids)[]
        {
            ("a", s.Audiences.Select(x => x.Id).ToList()),
            ("c", s.Characters.Select(x => x.Id).ToList()),
            ("f", s.Characters.SelectMany(c => c.Facts).Select(x => x.Id).ToList()),
            ("g", Powers.All.SelectMany(p => s.Treasuries[p].Lots).Select(x => x.Id).ToList()),
            ("j", s.Journeys.Select(x => x.Id).ToList()),
            ("k", s.Copies.Select(x => x.Id).ToList()),
            ("m", s.Trails.Select(x => x.Id).ToList()),
            ("q", s.Tasks.Select(x => x.Id).ToList()),
            ("t", s.Tablets.Select(x => x.Id).ToList()),
            ("u", s.Units.Select(x => x.Id).ToList()),
            ("x", s.Catastrophes.Select(x => x.Id).ToList()),
        };
        // Requests to characters' minds ("r") last one season and are not kept in the state; every other kind is checked here.
        Assert.Equal(IdKinds.All.Keys.Order(StringComparer.Ordinal), kinds.Select(k => k.Prefix).Append("r").Order(StringComparer.Ordinal));
        Assert.All(s.IdCounters.Keys, k => Assert.Contains(k, IdKinds.All.Keys));

        foreach (var (prefix, ids) in kinds)
            Assert.All(ids, id =>
            {
                Assert.Matches($"^{prefix}[1-9][0-9]*$", id);
                Assert.InRange(TurnEngine.IdNumber(id), 1, s.IdCounters[prefix]);
            });
        var all = kinds.SelectMany(k => k.Ids).ToList();
        Assert.Equal(all.Count, all.Distinct().Count());

        // Within a kind, a higher number was made later: the archives' "newest first" and the trail panel rely on it.
        foreach (var made in new[] { kinds.Single(k => k.Prefix == "c").Ids, kinds.Single(k => k.Prefix == "k").Ids, kinds.Single(k => k.Prefix == "m").Ids, kinds.Single(k => k.Prefix == "t").Ids })
            Assert.Equal(made.Select(TurnEngine.IdNumber).Order(), made.Select(TurnEngine.IdNumber));
        Assert.True(s.Copies.Count > 0 && s.Tablets.Count > 0 && s.Trails.Count > 0, "the game made tablets, copies and trails");
    }

    [Fact]
    public async Task The_counters_are_saved_with_the_state_and_carry_on_where_they_stopped()
    {
        var r = new GameRunner(GameFactory.NewGame(4), Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(4)), new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false };
        await r.PrepareAsync();
        for (var i = 0; i < 3; i++) await r.PlayTurnAsync();
        var saved = r.StateAt(3)!;
        Assert.Equal(r.State.IdCounters, saved.IdCounters);
        Assert.Equal(r.State.NewId("t"), saved.NewId("t"));
    }
}
