using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// Slow absorption (Build order item 5): land taken by force yields, and counts in its holder's strength, a third of its
/// yield in its first season under him, two thirds in the second, all of it from the third; his own homeland retaken, and
/// land bought or ceded, count in full at once.
/// </summary>
public class AbsorptionTests
{
    private static TurnEngine Season(GameState s, Dictionary<Power, TurnSubmission>? orders = null)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(orders ?? []);
        return e;
    }

    /// <summary>Seed 1, no catastrophes, a Mitanni army in Isuwa next to Hatti's empty Sapinuwa (yield 30).</summary>
    private static GameState Board()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Mitanni, Kind = UnitKind.Army, Province = "isuwa" });
        return s;
    }

    [Fact]
    public void Land_taken_by_force_yields_and_counts_a_third_then_two_thirds_then_all()
    {
        var s = Board();
        var e = Season(s, new() { [Power.Mitanni] = new() { Orders = [new MoveOrder("isuwa", "sapinuwa")] } });
        Assert.Equal(Power.Mitanni, s.Owner["sapinuwa"]);
        Assert.Equal(1, s.Conquered["sapinuwa"]);
        // Its strength counts a third of Sapinuwa's 30 beside its homeland's 145.
        Assert.Equal(s.Config.ProvinceWeight * (145 + 10) + s.Treasuries[Power.Mitanni].Gold - e.BackPayOwed(Power.Mitanni), e.Strength(Power.Mitanni));
        // Its taker sees the mark; no other court does, not even the loser (how land changed hands is not public).
        Assert.Equal(1, Views.For(s, Power.Mitanni).Conquered["sapinuwa"]);
        Assert.Empty(Views.For(s, Power.Hatti).Conquered);
        Assert.Empty(Views.For(s, Power.Egypt).Conquered);

        // Turn 2: it yields a third of its yield; turn 3 two thirds; turn 4 all of it, and the mark is gone.
        Assert.Equal(10, new TurnEngine(s).EffectiveYield("sapinuwa"));
        Season(s);
        Assert.Equal(20, new TurnEngine(s).EffectiveYield("sapinuwa"));
        Season(s);
        Assert.Equal(4, s.Turn);
        new TurnEngine(s).BeginTurn();
        Assert.Equal(30, new TurnEngine(s).EffectiveYield("sapinuwa"));
        Assert.False(s.Conquered.ContainsKey("sapinuwa"));
    }

    [Fact]
    public void A_king_s_own_homeland_retaken_counts_in_full()
    {
        var s = Board();
        Season(s, new() { [Power.Mitanni] = new() { Orders = [new MoveOrder("isuwa", "sapinuwa")] } });
        Assert.True(s.Conquered.ContainsKey("sapinuwa"));
        // Hatti drives the army out and takes Sapinuwa back: its own homeland, in full at once.
        Season(s, new()
        {
            [Power.Hatti] = new() { Orders = [new MoveOrder("hattusa", "sapinuwa"), new SupportOrder("kanesh", "hattusa", "sapinuwa")] },
        });
        Assert.Equal(Power.Hatti, s.Owner["sapinuwa"]);
        Assert.False(s.Conquered.ContainsKey("sapinuwa"));
        Assert.Equal(1.0, new TurnEngine(s).Absorbed("sapinuwa"));
    }

    [Fact]
    public void Land_ceded_is_the_receiver_s_in_full_unless_the_giver_was_still_absorbing_it()
    {
        var s = Board();
        // Mitanni takes Sapinuwa, then cedes it to Assyria the next season: Assyria goes on absorbing it from the season it
        // was taken, so a conquest cannot be laundered through a friend.
        Season(s, new() { [Power.Mitanni] = new() { Orders = [new MoveOrder("isuwa", "sapinuwa")] } });
        Season(s, new() { [Power.Mitanni] = new() { Orders = [new MoveOrder("sapinuwa", "isuwa"), new CedeProvinceOrder("sapinuwa", Power.Assyria)] } });
        Assert.Equal(Power.Assyria, s.Owner["sapinuwa"]);
        Assert.Equal(1, s.Conquered["sapinuwa"]);
        Assert.Equal(2 / 3.0, new TurnEngine(s).Absorbed("sapinuwa"));
        Assert.Equal(1, Views.For(s, Power.Assyria).Conquered["sapinuwa"]);

        // Ceded to the king whose homeland it is, it is his in full at once, as if he had retaken it.
        Season(s, new() { [Power.Assyria] = new() { Orders = [new CedeProvinceOrder("sapinuwa", Power.Hatti)] } });
        Assert.Equal(Power.Hatti, s.Owner["sapinuwa"]);
        Assert.False(s.Conquered.ContainsKey("sapinuwa"));

        // Land that was never taken by force is the receiver's in full at once.
        Season(s, new() { [Power.Hatti] = new() { Orders = [new CedeProvinceOrder("tuwanuwa", Power.Arzawa)] } });
        Assert.Equal(Power.Arzawa, s.Owner["tuwanuwa"]);
        Assert.False(s.Conquered.ContainsKey("tuwanuwa"));
        Assert.Equal(1.0, new TurnEngine(s).Absorbed("tuwanuwa"));
    }

    [Fact]
    public void Land_that_passes_with_a_fallen_kingdom_is_absorbed_slowly()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        s.Units.RemoveAll(u => u.Province == "ashur");
        var besieger = new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "ashur" };
        s.Units.Add(besieger);
        s.Sieges.Add(new Siege { Province = "ashur", Power = Power.Babylonia, UnitId = besieger.Id, Progress = 2, Since = 1 });
        Season(s);
        Assert.All(WorldMap.Default.HomeOf(Power.Assyria), p => Assert.Equal(1, s.Conquered[p.Id]));
        Assert.Equal(1 / 3.0, new TurnEngine(s).Absorbed("nineveh"));
    }
}
