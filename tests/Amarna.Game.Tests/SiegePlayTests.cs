using Amarna.Engine;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>
/// The script players' audit of the siege package (Build order item 5, "Every feature is every seat's"): weaknesses found in
/// script games on the new rules, each patched and tested here.
/// </summary>
public class SiegePlayTests
{
    /// <summary>
    /// Seed 1: Babylonia's army besieges Ashur (walls 3), just begun, with a second army in Ekallatum to support it, and Assyria's
    /// envoy is sure to be caught leaving.
    /// </summary>
    private static (GameState S, Character Envoy) AshurBesieged()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0, SiegeCatchMin = 100, SiegeCatchMax = 100 });
        s.Units.RemoveAll(u => u.Province is "ashur" or "ekallatum");
        var army = new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "ashur" };
        s.Units.Add(army);
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "ekallatum" });
        s.Owner["ekallatum"] = Power.Babylonia;
        s.Sieges.Add(new Siege { Province = "ashur", Power = Power.Babylonia, UnitId = army.Id, Progress = 0, Since = 1 });
        var envoy = s.Characters.First(c => c.Employer == Power.Assyria && c.SecretMaster is null);
        envoy.Traits.Courage = 100;
        return (s, envoy);
    }

    private static void Season(GameState s, Dictionary<Power, TurnSubmission> orders)
    {
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(orders);
    }

    /// <summary>A tablet two kings sealed, with a copy in each archive: a treaty, or an alliance.</summary>
    private static void Treaty(GameState s, Power a, Power b, bool alliance)
    {
        var t = new Tablet
        {
            Id = s.NewId("t"), Text = alliance ? Statecraft.AllianceTablet(a, b) : Statecraft.PeaceTablet(a, b), ProposedBy = a, Partner = b,
            Seals = [a, b], CreatedTurn = 1, SealedTurn = 1, AllianceOath = alliance,
        };
        s.Tablets.Add(t);
        foreach (var holder in new[] { a, b })
            s.Copies.Add(new TabletCopy { Id = s.NewId("k"), TabletId = t.Id, Holder = holder, AcquiredTurn = 1, Source = "sealed at audience" });
    }

    /// <summary>
    /// Seed 1, turn 5: Babylonia's army besieges Ashur (walls 3), alone; Mitanni, Assyria's ally, has armies in Terqa and in
    /// Nineveh (taken from Assyria for the test), both next to Ashur.
    /// </summary>
    private static GameState AllyBesieged()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        s.Turn = 5;
        s.Units.RemoveAll(u => u.Province is "ashur" or "nineveh");
        var army = new Unit { Id = s.NewId("u"), Power = Power.Babylonia, Kind = UnitKind.Army, Province = "ashur" };
        s.Units.Add(army);
        s.Units.Add(new Unit { Id = s.NewId("u"), Power = Power.Mitanni, Kind = UnitKind.Army, Province = "nineveh" });
        s.Owner["nineveh"] = Power.Mitanni;
        s.Sieges.Add(new Siege { Province = "ashur", Power = Power.Babylonia, UnitId = army.Id, Progress = 1, Since = 4 });
        Treaty(s, Power.Mitanni, Power.Assyria, alliance: true);
        return s;
    }

    [Fact]
    public async Task A_script_king_drives_the_besiegers_out_of_an_ally_s_city_without_storming_it()
    {
        var s = AllyBesieged();
        var sub = await new ScriptLeader(1).DecideAsync(Views.For(s, Power.Mitanni), default);
        var move = Assert.Single(sub.Orders.OfType<MoveOrder>(), m => m.To == "ashur");
        var supports = sub.Orders.OfType<SupportOrder>().Count(x => x.Supported == move.Unit && x.To == "ashur");
        // Enough to beat the besieger standing alone (strength 2 against 1); never enough to storm the walls of 3, with the
        // walls' sally of 1 counted, so the city stays Assyria's.
        Assert.InRange(1 + supports, 2, 3);
        Assert.DoesNotContain(new OrderValidator(s).Validate(Power.Mitanni, sub).Rejected, r => r.Order is MoveOrder or SupportOrder);

        // Assyria's walls sally for its ally's troop next to Ashur, when Assyria makes no move of its own into it.
        var v = Views.For(s, Power.Assyria);
        var brain = new Brain(Power.Assyria, 1);
        brain.Learn(v, new Board(v));
        Assert.Equal([new SallyOrder("ashur", "nineveh")], Tactics.Sallies(new Board(v), [], brain));
        Assert.Empty(Tactics.Sallies(new Board(v), []));

        // Played out: the besiegers are driven out, Ashur stays Assyria's, and Assyria counts its ally's blow no wrong.
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Mitanni] = new() { Orders = [new MoveOrder("nineveh", "ashur"), new SupportOrder("terqa", "nineveh", "ashur")] },
            [Power.Babylonia] = new() { Orders = [new BesiegeOrder("ashur")] },
            [Power.Assyria] = new() { Orders = [new SallyOrder("ashur", "nineveh")] },
        });
        Assert.Equal(Power.Assyria, s.Owner["ashur"]);
        Assert.Empty(s.Sieges);
        Assert.Equal(Power.Mitanni, s.Units.Single(u => u.Province == "ashur").Power);
        var after = Views.For(s, Power.Assyria);
        brain.Learn(after, new Board(after));
        Assert.Equal((0, 0.0), (brain.Rel[Power.Mitanni].OathsBroken, brain.Rel[Power.Mitanni].Grudge));
        Assert.True(brain.IsFriend(Power.Mitanni));
    }

    [Fact]
    public async Task A_besieged_script_king_pleads_with_its_ally_and_the_ally_hears_the_plea()
    {
        var s = AllyBesieged();
        var sub = await new ScriptLeader(1).DecideAsync(Views.For(s, Power.Assyria), default);
        var plea = Assert.Single(sub.Orders.OfType<DispatchOrder>(), d => d.To == Power.Mitanni);
        Assert.StartsWith("My brother, the troops of Babylonia besiege my city of Ashur. Come to my aid: send your troops to drive them out, and my walls will sally to meet them.", plea.Letter);
        Assert.Equal(0, plea.Gold);
        // The ally reads it, as it would a model king's words.
        var b = new Board(Views.For(s, Power.Mitanni));
        Assert.Equal([("ashur", Power.Babylonia)], Statecraft.PleasIn(plea.Letter, b, Power.Assyria, Power.Mitanni).ToList());
        Assert.Equal([("ashur", Power.Babylonia)], Statecraft.PleasIn("Hear me, brother! Ashur is besieged by the Babylonians, and my people starve.", b, Power.Assyria, Power.Mitanni).ToList());
        // Not a plea: no siege, or no besieger named, or the host himself named as the besieger.
        Assert.Empty(Statecraft.PleasIn("Ashur stands strong, and Babylonia is far away.", b, Power.Assyria, Power.Mitanni));
        Assert.Empty(Statecraft.PleasIn("Ashur is besieged.", b, Power.Assyria, Power.Mitanni));
        Assert.Empty(Statecraft.PleasIn("Your troops of Mitanni besiege my city of Ashur.", b, Power.Assyria, Power.Mitanni));
    }

    [Theory]
    [InlineData(5, 0, true)]
    // In the first year its gold goes to cities first.
    [InlineData(2, 0, false)]
    // A further level adds nothing against fleets, which never take walls of any height.
    [InlineData(5, 1, false)]
    public async Task A_script_king_walls_an_open_coast_that_only_a_fleet_threatens(int turn, int walls, bool fortifies)
    {
        // Egypt's fleet stands next to Alashiya's Tamassos, which has no troop; no army can reach the island.
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        s.Turn = turn;
        s.Treasuries[Power.Alashiya].Gold = 2000;
        s.Units.Single(u => u.Province == "delta").Province = "greatgreen";
        if (walls > 0) s.Walls["tamassos"] = walls;
        var sub = await new ScriptLeader(1).DecideAsync(Views.For(s, Power.Alashiya), default);
        Assert.Equal(fortifies, sub.Orders.Contains(new FortifyOrder("tamassos")));
    }

    [Fact]
    public async Task A_script_king_takes_a_host_s_offer_to_its_envoy_as_a_slight_and_trusts_the_envoy_that_refused()
    {
        // Egypt's two envoys are home; one reports that the king of Karduniash offered it a post, and it refused.
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        s.Turn = 4;
        s.Treasuries[Power.Egypt].Gold = 3000;
        var envoys = s.Characters.Where(c => c.Employer == Power.Egypt && c.SecretMaster is null).OrderBy(c => c.Id, StringComparer.Ordinal).ToList();
        var loyal = envoys[^1];
        void Report(string body) => s.InboxOf(Power.Egypt).Add(new InboxItem { Turn = 4, Kind = InboxKind.EnvoyReport, Title = $"{loyal.Name} returns", Body = body, Subject = loyal.Id });
        const string plain = "At the court of Karduniash the king received me. He said: \"I have heard his words.\"";
        Report(plain);
        var v = Views.For(s, Power.Egypt);
        var before = new Brain(Power.Egypt, 1);
        before.Learn(v, new Board(v));

        s.InboxOf(Power.Egypt).Clear();
        Report(plain + " The king of Karduniash offered me a post in his service, and I refused it: I serve you alone.");
        v = Views.For(s, Power.Egypt);
        var after = new Brain(Power.Egypt, 1);
        after.Learn(v, new Board(v));
        Assert.Equal(before.Rel[Power.Babylonia].Trust - 0.05, after.Rel[Power.Babylonia].Trust, 6);
        Assert.Contains(loyal.Id, after.ProvenLoyal);
        Assert.DoesNotContain(loyal.Id, before.ProvenLoyal);

        // Among the equally reliable it is the first sent with a tablet or gold: here, with a gift to a friend, or a peace tablet.
        Treaty(s, Power.Egypt, Power.Hatti, alliance: false);
        var sub = await new ScriptLeader(1).DecideAsync(Views.For(s, Power.Egypt), default);
        var trusted = sub.Orders.OfType<DispatchOrder>().Where(d => d.Proposal is not null || d.Gold > 0).ToList();
        Assert.NotEmpty(trusted);
        Assert.Equal(loyal.Id, trusted[0].Envoy);
    }

    [Fact]
    public void The_look_ahead_counts_a_foreign_army_within_its_own_capital_as_a_kingdom_at_stake()
    {
        // A foreign army that just got within walls of 3: a ninth of a city's worth, but a quarter of our capital's, which holds
        // the kingdom (its worth counts all the rest of our land).
        Assert.Equal(0.45 * 0.5 / 4, Search.Stake(false, 0, 0, 3), 6);
        Assert.Equal(Search.CapitalAtStake, Search.Stake(true, 0, 0, 3), 6);
        Assert.Equal(0.25, Search.CapitalAtStake);
        // Worn down further, the siege counts as it did.
        Assert.Equal(0.45 * 3.5 / 4, Search.Stake(true, 2, 1, 3), 6);
        Assert.Equal(Search.Stake(false, 2, 1, 3), Search.Stake(true, 2, 1, 3), 6);
    }

    [Fact]
    public async Task A_script_captor_lets_go_at_once_an_envoy_whose_king_has_fallen()
    {
        // The envoy is caught leaving Ashur; the next season Ashur surrenders, and Assyria falls.
        var (s, envoy) = AshurBesieged();
        var press = new TurnSubmission { Orders = [new BesiegeOrder("ashur"), new SupportOrder("ekallatum", "ashur")] };
        Season(s, new() { [Power.Assyria] = new() { Orders = [new DispatchOrder(envoy.Id, Power.Egypt, "Send your armies, brother: Ashur is besieged.", "Promise anything.")] }, [Power.Babylonia] = press });
        Assert.Equal((CharacterStatus.Captured, (Power?)Power.Babylonia), (envoy.Status, envoy.HeldBy));
        Season(s, new() { [Power.Babylonia] = press });
        Assert.Contains(Power.Assyria, s.Eliminated);
        Assert.Equal((CharacterStatus.Captured, (Power?)Power.Babylonia), (envoy.Status, envoy.HeldBy));
        var v = Views.For(s, Power.Babylonia);
        // The captor knows whose envoy it was, and that his kingdom is no more: nobody is left to pay a ransom.
        Assert.Equal(Power.Assyria, v.Known.Single(c => c.Id == envoy.Id).Employer);
        var sub = await new ScriptLeader(1).DecideAsync(v, default);
        // Babylonia's temperament asks a ransom of a captive (honesty above 0.5); for this one it would wait in vain.
        Assert.True(ScriptLeader.Temperament(Power.Babylonia, 1).Honesty > 0.5);
        Assert.Contains(sub.Orders, o => o is CaptiveOrder { Fate: CaptiveFate.Release } c && c.Character == envoy.Id);
        Assert.DoesNotContain(sub.Orders, o => o is CaptiveOrder { Fate: CaptiveFate.Ransom } c && c.Character == envoy.Id);
    }
}
