using Amarna.Engine;

namespace Amarna.Engine.Tests;

public class AdjudicatorTests
{
    private sealed class Board
    {
        public List<Unit> Units { get; } = new();
        public Dictionary<string, int> Walls { get; } = new();
        public Dictionary<string, Power?> Owners { get; } = new();
        public Dictionary<string, Order> Orders { get; } = new();

        public Board A(Power p, string at) { Units.Add(new Unit { Id = "u" + Units.Count, Power = p, Kind = UnitKind.Army, Province = at }); return this; }
        public Board F(Power p, string at) { Units.Add(new Unit { Id = "u" + Units.Count, Power = p, Kind = UnitKind.Fleet, Province = at }); return this; }
        public Board Move(string at, string to) { Orders[at] = new MoveOrder(at, to); return this; }
        public Board Support(string at, string supported, string? to = null) { Orders[at] = new SupportOrder(at, supported, to); return this; }
        public Board Convoy(string at, string army, string to) { Orders[at] = new ConvoyOrder(at, army, to); return this; }

        public AdjudicationResult Run() => new Adjudicator(WorldMap.Default).Run(Units, Orders, Owners, Walls);

        public string? Where(AdjudicationResult r, string startProvince)
        {
            var u = Units.First(x => x.Province == startProvince);
            return r.NewPositions.TryGetValue(u.Id, out var p) ? p : null;
        }
    }

    [Fact]
    public void Equal_moves_into_an_empty_province_bounce()
    {
        var b = new Board().A(Power.Mitanni, "washukanni").A(Power.Assyria, "ashur")
            .Move("washukanni", "terqa").Move("ashur", "terqa");
        var r = b.Run();
        Assert.Equal("washukanni", b.Where(r, "washukanni"));
        Assert.Equal("ashur", b.Where(r, "ashur"));
        Assert.Empty(r.DislodgedUnitIds);
    }

    [Fact]
    public void Unsupported_attack_on_a_holding_unit_fails()
    {
        var b = new Board().A(Power.Mitanni, "terqa").A(Power.Assyria, "ashur").Move("ashur", "terqa");
        var r = b.Run();
        Assert.Equal("ashur", b.Where(r, "ashur"));
        Assert.Equal("terqa", b.Where(r, "terqa"));
    }

    [Fact]
    public void Supported_attack_dislodges_and_the_loser_is_destroyed()
    {
        var b = new Board().A(Power.Mitanni, "terqa").A(Power.Assyria, "ashur").A(Power.Assyria, "ekallatum")
            .Move("ashur", "terqa").Support("ekallatum", "ashur", "terqa");
        var r = b.Run();
        Assert.Equal("terqa", b.Where(r, "ashur"));
        Assert.Single(r.DislodgedUnitIds);
        Assert.Null(b.Where(r, "terqa"));
    }

    [Fact]
    public void Support_from_another_power_counts()
    {
        var b = new Board().A(Power.Mitanni, "terqa").A(Power.Assyria, "ashur").A(Power.Babylonia, "ekallatum")
            .Move("ashur", "terqa").Support("ekallatum", "ashur", "terqa");
        Assert.Equal("terqa", b.Where(b.Run(), "ashur"));
    }

    [Fact]
    public void Support_is_cut_by_an_attack_from_elsewhere()
    {
        var b = new Board().A(Power.Mitanni, "terqa").A(Power.Assyria, "ashur").A(Power.Assyria, "ekallatum").A(Power.Babylonia, "sippar")
            .Move("ashur", "terqa").Support("ekallatum", "ashur", "terqa").Move("sippar", "ekallatum");
        var r = b.Run();
        Assert.Equal("ashur", b.Where(r, "ashur"));
        Assert.Contains("ekallatum", r.CutSupports);
    }

    [Fact]
    public void Support_is_not_cut_by_an_attack_from_the_province_it_supports_into()
    {
        // Ekallatum supports Ashur into Terqa; Terqa's unit attacks Ekallatum: the support still stands.
        var b = new Board().A(Power.Mitanni, "terqa").A(Power.Assyria, "ashur").A(Power.Assyria, "ekallatum")
            .Move("ashur", "terqa").Support("ekallatum", "ashur", "terqa").Move("terqa", "ekallatum");
        var r = b.Run();
        Assert.Equal("terqa", b.Where(r, "ashur"));
        Assert.Equal("ekallatum", b.Where(r, "ekallatum"));
        Assert.Single(r.DislodgedUnitIds);
    }

    [Fact]
    public void Own_units_cannot_cut_support_or_be_dislodged_by_their_own_side()
    {
        var b = new Board().A(Power.Assyria, "terqa").A(Power.Assyria, "ashur").A(Power.Assyria, "ekallatum")
            .Move("ashur", "terqa").Support("ekallatum", "ashur", "terqa");
        var r = b.Run();
        Assert.Equal("ashur", b.Where(r, "ashur"));
        Assert.Empty(r.DislodgedUnitIds);
    }

    [Fact]
    public void Equal_head_to_head_bounces_and_stronger_side_wins()
    {
        var even = new Board().A(Power.Mitanni, "terqa").A(Power.Assyria, "ashur").Move("terqa", "ashur").Move("ashur", "terqa");
        var r1 = even.Run();
        Assert.Equal("terqa", even.Where(r1, "terqa"));
        Assert.Equal("ashur", even.Where(r1, "ashur"));

        var strong = new Board().A(Power.Mitanni, "terqa").A(Power.Assyria, "ashur").A(Power.Assyria, "ekallatum")
            .Move("terqa", "ashur").Move("ashur", "terqa").Support("ekallatum", "ashur", "terqa");
        var r2 = strong.Run();
        Assert.Equal("terqa", strong.Where(r2, "ashur"));
        Assert.Null(strong.Where(r2, "terqa"));
    }

    [Fact]
    public void Circular_movement_succeeds()
    {
        var b = new Board().A(Power.Mitanni, "harran").A(Power.Mitanni, "washukanni").A(Power.Mitanni, "terqa")
            .Move("harran", "washukanni").Move("washukanni", "terqa").Move("terqa", "harran");
        var r = b.Run();
        Assert.Equal("washukanni", b.Where(r, "harran"));
        Assert.Equal("terqa", b.Where(r, "washukanni"));
        Assert.Equal("harran", b.Where(r, "terqa"));
    }

    [Fact]
    public void Circular_movement_broken_by_an_outside_attack_fails_everywhere()
    {
        var b = new Board().A(Power.Mitanni, "harran").A(Power.Mitanni, "washukanni").A(Power.Mitanni, "terqa").A(Power.Assyria, "ashur")
            .Move("harran", "washukanni").Move("washukanni", "terqa").Move("terqa", "harran").Move("ashur", "terqa");
        var r = b.Run();
        Assert.Equal("harran", b.Where(r, "harran"));
        Assert.Equal("washukanni", b.Where(r, "washukanni"));
        Assert.Equal("terqa", b.Where(r, "terqa"));
        Assert.Equal("ashur", b.Where(r, "ashur"));
    }

    [Fact]
    public void Army_crosses_the_sea_by_convoy()
    {
        var b = new Board().A(Power.Egypt, "delta").F(Power.Egypt, "greatgreen")
            .Move("delta", "tamassos").Convoy("greatgreen", "delta", "tamassos");
        Assert.Equal("tamassos", b.Where(b.Run(), "delta"));
    }

    [Fact]
    public void Army_without_a_convoying_fleet_stays()
    {
        var b = new Board().A(Power.Egypt, "delta").Move("delta", "tamassos");
        Assert.Equal("delta", b.Where(b.Run(), "delta"));
    }

    [Fact]
    public void Dislodged_fleet_breaks_the_convoy()
    {
        var b = new Board().A(Power.Egypt, "delta").F(Power.Egypt, "greatgreen")
            .F(Power.Arzawa, "westsea").F(Power.Arzawa, "lukka")
            .Move("delta", "tamassos").Convoy("greatgreen", "delta", "tamassos")
            .Move("westsea", "greatgreen").Support("lukka", "westsea", "greatgreen");
        var r = b.Run();
        Assert.Equal("delta", b.Where(r, "delta"));
        Assert.Equal("greatgreen", b.Where(r, "westsea"));
        Assert.Null(b.Where(r, "greatgreen"));
    }

    [Fact]
    public void Convoy_paradox_resolves_by_the_Szykman_rule()
    {
        // The convoyed army attacks the unit supporting the attack on its own convoy.
        var b = new Board().A(Power.Egypt, "delta").F(Power.Egypt, "greatgreen")
            .F(Power.Arzawa, "westsea").F(Power.Arzawa, "lukka")
            .Move("delta", "lukka").Convoy("greatgreen", "delta", "lukka")
            .Move("westsea", "greatgreen").Support("lukka", "westsea", "greatgreen");
        var r = b.Run();
        Assert.Equal("delta", b.Where(r, "delta"));
        Assert.Equal("greatgreen", b.Where(r, "westsea"));
        Assert.Equal("lukka", b.Where(r, "lukka"));
        Assert.Null(b.Where(r, "greatgreen"));
    }

    [Fact]
    public void Walls_add_nothing_to_the_battle_and_are_stormed_only_by_more_than_walls_and_defenders()
    {
        // A lone army gets within empty walls of level 1 but does not storm them: 1 against 1 + 0.
        var single = new Board().A(Power.Hatti, "kanesh").Move("kanesh", "carchemish");
        single.Walls["carchemish"] = 1;
        var r1 = single.Run();
        Assert.Equal("carchemish", single.Where(r1, "kanesh"));
        var a1 = Assert.Single(r1.Assaults);
        Assert.Equal((1, 1, 0, false), (a1.Strength, a1.Walls, a1.Defenders, a1.Stormed));
        Assert.Empty(r1.Stormed);

        // A supported one storms them: 2 against 1 + 0.
        var supported = new Board().A(Power.Hatti, "kanesh").A(Power.Hatti, "kizzuwatna")
            .Move("kanesh", "carchemish").Support("kizzuwatna", "kanesh", "carchemish");
        supported.Walls["carchemish"] = 1;
        var r2 = supported.Run();
        Assert.Equal("carchemish", supported.Where(r2, "kanesh"));
        Assert.Equal(["carchemish"], r2.Stormed);

        // Walls 2 held by an army: 2 dislodges the army but storms nothing (2 against 2 + 1).
        var held = new Board().A(Power.Hatti, "kanesh").A(Power.Hatti, "kizzuwatna").A(Power.Mitanni, "carchemish")
            .Move("kanesh", "carchemish").Support("kizzuwatna", "kanesh", "carchemish");
        held.Walls["carchemish"] = 2;
        held.Owners["carchemish"] = Power.Mitanni;
        var r3 = held.Run();
        Assert.Equal("carchemish", held.Where(r3, "kanesh"));
        Assert.Null(held.Where(r3, "carchemish"));
        Assert.Equal((2, 2, 1, false), (r3.Assaults[0].Strength, r3.Assaults[0].Walls, r3.Assaults[0].Defenders, r3.Assaults[0].Stormed));

        // A move into one's own walled province is no assault.
        var own = new Board().A(Power.Mitanni, "harran").Move("harran", "carchemish");
        own.Walls["carchemish"] = 2;
        own.Owners["carchemish"] = Power.Mitanni;
        var r4 = own.Run();
        Assert.Equal("carchemish", own.Where(r4, "harran"));
        Assert.Empty(r4.Assaults);
    }

    [Fact]
    public void A_fleet_never_storms_walls()
    {
        var b = new Board().F(Power.Hatti, "cilicia").F(Power.Hatti, "kizzuwatna").Move("cilicia", "ugarit").Support("kizzuwatna", "cilicia", "ugarit");
        b.Walls["ugarit"] = 1;
        var r = b.Run();
        Assert.Equal("ugarit", b.Where(r, "cilicia"));
        Assert.False(Assert.Single(r.Assaults).Stormed);
    }

    [Fact]
    public void Mismatched_support_is_void()
    {
        // Ekallatum "supports" Ashur into Terqa, but Ashur actually holds.
        var b = new Board().A(Power.Mitanni, "terqa").A(Power.Assyria, "ashur").A(Power.Assyria, "ekallatum").A(Power.Babylonia, "sippar")
            .Support("ekallatum", "ashur", "terqa").Move("sippar", "ekallatum");
        var r = b.Run();
        Assert.Equal("ekallatum", b.Where(r, "ekallatum"));
        Assert.Equal("sippar", b.Where(r, "sippar"));
    }

    [Fact]
    public void Unit_moving_away_lets_the_attacker_in()
    {
        var b = new Board().A(Power.Mitanni, "terqa").A(Power.Assyria, "ashur")
            .Move("terqa", "mari").Move("ashur", "terqa");
        b.Walls.Remove("mari");
        var r = b.Run();
        Assert.Equal("mari", b.Where(r, "terqa"));
        Assert.Equal("terqa", b.Where(r, "ashur"));
    }
}
