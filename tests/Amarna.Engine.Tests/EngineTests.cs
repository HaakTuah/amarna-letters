using Amarna.Engine;

namespace Amarna.Engine.Tests;

public class EngineTests
{
    /// <summary>Plays a game with seeded random legal orders and placeholder text, for determinism checks.</summary>
    internal static GameState PlayRandom(ulong seed, int turns, GameConfig? config = null)
    {
        var s = GameFactory.NewGame(seed, config ?? new GameConfig { MinTurns = 99, MaxTurns = 99 });
        var map = WorldMap.Default;
        for (var i = 0; i < turns && !s.Ended; i++)
        {
            var e = new TurnEngine(s);
            e.BeginTurn();
            foreach (var req in e.MindRequests.ToList()) e.Fulfil(req, new MindReply { Text = $"text for {req.Task}", Number = 20 });
            foreach (var a in s.Audiences.ToList())
                e.ApplyAudience(new AudienceRecord { AudienceId = a.Id, Delivered = a.Dispatch.Letter, Rounds = [new AudienceRound { Host = new HostReply { Speech = "Welcome.", SealProposal = true } }] });

            var subs = new Dictionary<Power, TurnSubmission>();
            foreach (var p in s.Alive)
            {
                var rng = Rng.For(seed, s.Turn, "test-orders", p.ToString());
                var sub = new TurnSubmission();
                foreach (var u in s.Units.Where(u => u.Power == p).OrderBy(u => u.Id))
                {
                    var moves = map.MovesFrom(u.Kind, u.Province).ToList();
                    if (moves.Count > 0 && rng.Chance(0.7)) sub.Orders.Add(new MoveOrder(u.Province, rng.Pick(moves)));
                }
                var home = map.HomeOf(p).Where(x => s.Owner[x.Id] == p && s.UnitAt(x.Id) is null).ToList();
                if (home.Count > 0 && s.Treasuries[p].Gold > 300) sub.Orders.Add(new RaiseOrder(home[0].Id, UnitKind.Army));
                var envoy = s.Characters.FirstOrDefault(c => c.Employer == p && c.Duty == Duty.None && c.At == p && c.Status == CharacterStatus.Employed);
                if (envoy is not null && rng.Chance(0.3))
                {
                    var to = rng.Pick(s.Alive.Where(x => x != p).ToList());
                    sub.Orders.Add(new DispatchOrder(envoy.Id, to, "Greetings, brother.", Gold: 30, Proposal: new TabletProposal { Text = "Peace between us." }));
                }
                subs[p] = sub;
            }
            e.Resolve(subs);
        }
        return s;
    }

    [Fact]
    public void Same_seed_and_orders_give_the_same_game()
    {
        var a = PlayRandom(42, 30);
        var b = PlayRandom(42, 30);
        Assert.Equal(Json.Hash(a), Json.Hash(b));
        var c = PlayRandom(43, 30);
        Assert.NotEqual(Json.Hash(a), Json.Hash(c));
    }

    [Fact]
    public void State_survives_a_json_round_trip()
    {
        var a = PlayRandom(7, 12);
        var copy = Json.Clone(a);
        Assert.Equal(Json.Hash(a), Json.Hash(copy));
    }

    [Fact]
    public void New_game_matches_the_starting_tiers()
    {
        var s = GameFactory.NewGame(1);
        var e = new TurnEngine(s);
        Assert.Equal(16, s.Units.Count);
        Assert.Equal(12, s.Garrisons.Count);
        Assert.Equal(18, s.Characters.Count);
        Assert.All(Powers.All, p => Assert.Equal(2, s.Characters.Count(c => c.Employer == p)));
        Assert.True(e.Strength(Power.Egypt) > e.Strength(Power.Mitanni));
        Assert.True(e.Strength(Power.Mitanni) > e.Strength(Power.Arzawa));
        Assert.Equal(2, s.Characters.Count(c => c.SecretMaster is not null));
    }

    [Fact]
    public void Travel_takes_one_to_three_seasons_and_is_symmetric()
    {
        var e = new TurnEngine(GameFactory.NewGame(1));
        foreach (var a in Powers.All)
            foreach (var b in Powers.All.Where(b => b != a))
            {
                var t = e.TravelTurns(a, b);
                Assert.InRange(t, 1, 3);
                Assert.Equal(t, e.TravelTurns(b, a));
            }
    }

    [Fact]
    public void Income_and_upkeep_are_paid_each_season()
    {
        var s = GameFactory.NewGame(1);
        var e = new TurnEngine(s);
        var before = s.Treasuries[Power.Egypt].Gold;
        var expected = before + e.Income(Power.Egypt) - e.Upkeep(Power.Egypt) - e.Wages(Power.Egypt);
        e.BeginTurn();
        Assert.Equal(expected, s.Treasuries[Power.Egypt].Gold);
    }

    [Fact]
    public void Unpaid_troops_desert_farthest_first()
    {
        var s = GameFactory.NewGame(1);
        s.Treasuries[Power.Egypt].Gold = -1000;
        s.Owner["thebes"] = null; s.Owner["akhetaten"] = null; s.Owner["memphis"] = null; s.Owner["delta"] = null;
        var e = new TurnEngine(s);
        e.BeginTurn();
        Assert.True(s.Units.Count(u => u.Power == Power.Egypt) < 3);
        Assert.Contains(s.InboxOf(Power.Egypt), i => i.Body.Contains("deserted"));
    }

    [Fact]
    public void Validator_rejects_illegal_and_unaffordable_orders()
    {
        var s = GameFactory.NewGame(1);
        var v = new OrderValidator(s);
        var result = v.Validate(Power.Egypt, new TurnSubmission
        {
            Orders =
            [
                new MoveOrder("memphis", "hattusa"),          // not adjacent
                new MoveOrder("hattusa", "kanesh"),           // not Egypt's unit
                new RaiseOrder("babylon", UnitKind.Army),     // not Egypt's homeland
                new RaiseOrder("akhetaten", UnitKind.Fleet),  // no harbour
                new MoveOrder("sinai", "gaza"),
                new MoveOrder("sinai", "megiddo"),            // second order for the same unit
                new RaiseOrder("thebes", UnitKind.Army),
                new RaiseOrder("akhetaten", UnitKind.Army),
                new BuyProvinceOrder("gaza"),                 // 250 shekels: leaves 150
                new BuyProvinceOrder("megiddo"),              // 250 more: more than is left
            ],
        });
        Assert.Equal(4, result.Accepted.Count);
        Assert.Equal(6, result.Rejected.Count);
        Assert.Contains(result.Rejected, r => r.Reason.Contains("not enough gold"));
    }

    [Fact]
    public void A_raised_army_appears_and_costs_gold()
    {
        var s = GameFactory.NewGame(1);
        var e = new TurnEngine(s);
        e.BeginTurn();
        var gold = s.Treasuries[Power.Egypt].Gold;
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Egypt] = new() { Orders = [new RaiseOrder("thebes", UnitKind.Army)] } });
        Assert.NotNull(s.UnitAt("thebes"));
        Assert.Equal(gold - s.Config.ArmyCost, s.Treasuries[Power.Egypt].Gold);
    }

    [Fact]
    public void Buying_a_neutral_city_transfers_it()
    {
        var s = GameFactory.NewGame(1);
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission> { [Power.Egypt] = new() { Orders = [new BuyProvinceOrder("gaza")] } });
        Assert.Equal(Power.Egypt, s.Owner["gaza"]);
        Assert.DoesNotContain("gaza", s.Garrisons);
    }

    [Fact]
    public void Rival_buyers_bounce()
    {
        var s = GameFactory.NewGame(1);
        s.Owner["megiddo"] = Power.Babylonia; s.Garrisons.Remove("megiddo");
        var e = new TurnEngine(s);
        e.BeginTurn();
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Egypt] = new() { Orders = [new BuyProvinceOrder("gaza")] },
            [Power.Babylonia] = new() { Orders = [new BuyProvinceOrder("gaza")] },
        });
        Assert.Null(s.Owner["gaza"]);
    }

    [Fact]
    public void Game_never_ends_before_the_minimum_and_always_by_the_maximum()
    {
        for (ulong seed = 1; seed <= 20; seed++)
        {
            var s = PlayRandom(seed, 200, new GameConfig { MinTurns = 15, MaxTurns = 40 });
            Assert.True(s.Ended);
            var last = s.Scores.Max(x => x.Turn);
            Assert.InRange(last, Math.Min(15, last), 40);
            if (s.Alive.Count() > 1) Assert.True(last >= 15);
            Assert.NotEmpty(s.Winners);
        }
    }

    [Fact]
    public void Greeting_formula_and_deviations()
    {
        var std = Greeting.Render(Power.Mitanni, Power.Egypt, new GreetingOptions());
        Assert.StartsWith("Say to Napkhururiya, Great King, king of Egypt, my brother: thus says Tushratta", std);
        Assert.Contains("your chariots, your horses", std);

        var cold = Greeting.Render(Power.Assyria, Power.Babylonia, new GreetingOptions { CallBrother = false, GrantGreatKing = false, SenderFirst = true });
        Assert.StartsWith("Thus says Ashur-uballit, Great King, king of Assyria: say to Burna-Buriash, king of Karduniash.", cold);
        Assert.Equal("", Greeting.Render(Power.Egypt, Power.Hatti, new GreetingOptions { Omit = true }));
    }

    [Fact]
    public void Money_reads_in_minas_and_shekels()
    {
        Assert.Equal("45 shekels", Money.Format(45));
        Assert.Equal("1 mina", Money.Format(60));
        Assert.Equal("2 minas 15 shekels", Money.Format(135));
    }
}
