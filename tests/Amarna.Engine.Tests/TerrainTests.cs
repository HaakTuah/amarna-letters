using Amarna.Engine;

namespace Amarna.Engine.Tests;

/// <summary>
/// Terrain (Build order item 5, the siege package; question 5, plan step 14): rough ground, a mountain pass or a great river
/// on the link an attack comes over, and a landing from the sea give a unit that stands its ground 1 more against that attack,
/// at most 1 in all; never a unit that moves or is met head on, never empty land, never walls or a siege's pace.
/// </summary>
public class TerrainTests
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

        public AdjudicationResult Run(int terrain = 1) => new Adjudicator(WorldMap.Default, explain: true, terrain: terrain).Run(Units, Orders, Owners, Walls);

        public string? Where(AdjudicationResult r, string startProvince)
        {
            var u = Units.First(x => x.Province == startProvince);
            return r.NewPositions.TryGetValue(u.Id, out var p) ? p : null;
        }
    }

    [Fact]
    public void The_map_names_the_ground_of_each_attack()
    {
        Assert.Equal(new Ground(GroundKind.Rough, "mira"), Geography.DefenceGround("tuwanuwa", "mira", byConvoy: false));
        Assert.Equal(new Ground(GroundKind.Pass, "the Cilician Gates"), Geography.DefenceGround("tuwanuwa", "kizzuwatna", byConvoy: false));
        // A crossing protects both its sides.
        Assert.Equal(new Ground(GroundKind.Pass, "the Cilician Gates"), Geography.DefenceGround("kizzuwatna", "tuwanuwa", byConvoy: false));
        Assert.Equal(new Ground(GroundKind.River, "the Euphrates"), Geography.DefenceGround("harran", "carchemish", byConvoy: false));
        Assert.Equal(new Ground(GroundKind.Landing, ""), Geography.DefenceGround("byblos", "delta", byConvoy: true));
        // Open ground, attacked over open ground: nothing.
        Assert.Null(Geography.DefenceGround("lukka", "kizzuwatna", byConvoy: false));
        Assert.Null(Geography.DefenceGround("sinai", "delta", byConvoy: false));
        // Rough ground comes first and is the only one named: they never add up.
        Assert.Equal(GroundKind.Rough, Geography.DefenceGround("delta", "tamassos", byConvoy: true)!.Kind);
        Assert.Equal("the rough ground of mira", new Ground(GroundKind.Rough, "mira").Text);
        Assert.Equal("the Cilician Gates, a mountain pass", new Ground(GroundKind.Pass, "the Cilician Gates").Text);
        Assert.Equal("the crossing of the Euphrates", new Ground(GroundKind.River, "the Euphrates").Text);
        Assert.Equal("a landing from the sea", new Ground(GroundKind.Landing, "").Text);
    }

    [Fact]
    public void A_unit_holding_rough_ground_needs_three_to_dislodge_and_empty_rough_land_stays_open()
    {
        // Arzawa holds Mira; Hatti attacks from Tuwanuwa with one support (2 against 1 + 1): it bounces.
        var b = new Board().A(Power.Arzawa, "mira").A(Power.Hatti, "tuwanuwa").A(Power.Hatti, "lukka")
            .Move("tuwanuwa", "mira").Support("lukka", "tuwanuwa", "mira");
        var r = b.Run();
        Assert.Equal("mira", b.Where(r, "mira"));
        Assert.Equal("tuwanuwa", b.Where(r, "tuwanuwa"));
        var fight = Assert.Single(r.GroundFights);
        Assert.True(fight.Decided);
        Assert.False(fight.Won);
        Assert.Equal((2, 2), (fight.Strength, fight.Against));

        // With two supports (3 against 2) it goes in.
        var c = new Board().A(Power.Arzawa, "mira").A(Power.Hatti, "tuwanuwa").A(Power.Hatti, "lukka").A(Power.Hatti, "seha")
            .Move("tuwanuwa", "mira").Support("lukka", "tuwanuwa", "mira").Support("seha", "tuwanuwa", "mira");
        var rc = c.Run();
        Assert.Equal("mira", c.Where(rc, "tuwanuwa"));
        Assert.True(Assert.Single(rc.GroundFights).Won);

        // Empty rough land: one army walks in.
        var d = new Board().A(Power.Hatti, "tuwanuwa").Move("tuwanuwa", "mira");
        var rd = d.Run();
        Assert.Equal("mira", d.Where(rd, "tuwanuwa"));
        Assert.Empty(rd.GroundFights);
    }

    [Fact]
    public void A_pass_helps_against_an_attack_over_it_but_not_against_one_over_open_ground()
    {
        // Hatti's army in Kizzuwatna is attacked from Tuwanuwa, over the Cilician Gates, with one support: it holds.
        var b = new Board().A(Power.Hatti, "kizzuwatna").A(Power.Arzawa, "tuwanuwa").A(Power.Arzawa, "kanesh")
            .Move("tuwanuwa", "kizzuwatna").Support("kanesh", "tuwanuwa", "kizzuwatna");
        Assert.Equal("kizzuwatna", b.Where(b.Run(), "kizzuwatna"));

        // The same attack from Lukka, along the coast: 2 against 1, and the army is destroyed.
        var c = new Board().A(Power.Hatti, "kizzuwatna").A(Power.Arzawa, "lukka").A(Power.Arzawa, "kanesh")
            .Move("lukka", "kizzuwatna").Support("kanesh", "lukka", "kizzuwatna");
        var rc = c.Run();
        Assert.Null(c.Where(rc, "kizzuwatna"));
        Assert.Empty(rc.GroundFights);

        // A great river: an attack on Carchemish from Harran crosses the Euphrates.
        var d = new Board().A(Power.Hatti, "carchemish").A(Power.Mitanni, "harran").A(Power.Mitanni, "isuwa")
            .Move("harran", "carchemish").Support("isuwa", "harran", "carchemish");
        var rd = d.Run();
        Assert.Equal("carchemish", d.Where(rd, "carchemish"));
        Assert.Equal(GroundKind.River, Assert.Single(rd.GroundFights).Ground.Kind);
    }

    [Fact]
    public void A_landing_from_the_sea_counts_as_a_crossing_and_never_adds_to_rough_ground()
    {
        // Hatti's army sails from Byblos to the Delta in its own ships, with a fleet's support: 2 against Egypt's 1 + 1.
        var b = new Board().A(Power.Egypt, "delta").A(Power.Hatti, "byblos").F(Power.Hatti, "levantsea").F(Power.Hatti, "greatgreen")
            .Move("byblos", "delta").Convoy("levantsea", "byblos", "delta").Support("greatgreen", "byblos", "delta");
        var r = b.Run();
        Assert.Equal("delta", b.Where(r, "delta"));
        Assert.Equal("byblos", b.Where(r, "byblos"));
        Assert.Equal(GroundKind.Landing, Assert.Single(r.GroundFights).Ground.Kind);

        // By land from Sinai, the same strength takes it.
        var c = new Board().A(Power.Egypt, "delta").A(Power.Hatti, "sinai").F(Power.Hatti, "greatgreen")
            .Move("sinai", "delta").Support("greatgreen", "sinai", "delta");
        Assert.Equal("delta", c.Where(c.Run(), "sinai"));

        // Tamassos is rough ground, and an army reaches it only by landing: still only 1 more, so three take it.
        var d = new Board().A(Power.Alashiya, "tamassos").A(Power.Egypt, "delta").F(Power.Egypt, "greatgreen").F(Power.Egypt, "cilicia").A(Power.Egypt, "enkomi")
            .Move("delta", "tamassos").Convoy("greatgreen", "delta", "tamassos").Support("cilicia", "delta", "tamassos").Support("enkomi", "delta", "tamassos");
        var rd = d.Run();
        Assert.Equal("tamassos", d.Where(rd, "delta"));
        Assert.Equal((3, 2), (rd.GroundFights[0].Strength, rd.GroundFights[0].Against));
    }

    [Fact]
    public void A_unit_whose_move_fails_keeps_the_ground_and_one_met_head_on_has_none()
    {
        // Arzawa's army in Mira tries for Apasa and bounces off its own king's army: it stays, and the rough ground holds it
        // against Hatti's supported attack.
        var b = new Board().A(Power.Arzawa, "mira").A(Power.Arzawa, "apasa").A(Power.Hatti, "tuwanuwa").A(Power.Hatti, "lukka")
            .Move("mira", "apasa").Move("tuwanuwa", "mira").Support("lukka", "tuwanuwa", "mira");
        Assert.Equal("mira", b.Where(b.Run(), "mira"));

        // Head on across the Cilician Gates: both armies are on the road, and the stronger wins as on open ground.
        var c = new Board().A(Power.Hatti, "kizzuwatna").A(Power.Arzawa, "tuwanuwa").A(Power.Arzawa, "kanesh")
            .Move("kizzuwatna", "tuwanuwa").Move("tuwanuwa", "kizzuwatna").Support("kanesh", "tuwanuwa", "kizzuwatna");
        var rc = c.Run();
        Assert.Equal("kizzuwatna", c.Where(rc, "tuwanuwa"));
        Assert.Null(c.Where(rc, "kizzuwatna"));
        Assert.Empty(rc.GroundFights);
    }

    [Fact]
    public void A_storm_must_beat_the_ground_too_and_an_empty_walled_town_on_rough_ground_needs_only_its_walls()
    {
        // Lukka (walls 1, rough ground), held by Arzawa's army: 3 gets in (against 1 + 1) but storms only above 1 + 2.
        Board Lukka(int supports)
        {
            var b = new Board().A(Power.Arzawa, "lukka").A(Power.Hatti, "tuwanuwa").A(Power.Hatti, "mira").A(Power.Hatti, "kizzuwatna").A(Power.Hatti, "apasa");
            b.Walls["lukka"] = 1;
            b.Owners["lukka"] = Power.Arzawa;
            b.Move("tuwanuwa", "lukka");
            foreach (var s in new[] { "mira", "kizzuwatna", "apasa" }.Take(supports)) b.Support(s, "tuwanuwa", "lukka");
            return b;
        }
        var r = Lukka(2).Run();
        var a = Assert.Single(r.Assaults);
        Assert.Equal((3, 1, 2), (a.Strength, a.Walls, a.Defenders));
        Assert.False(a.Stormed);
        Assert.Equal(GroundKind.Rough, a.Ground!.Kind);
        Assert.True(Assert.Single(Lukka(3).Run().Assaults).Stormed);

        // Empty, the town's walls alone stand: 2 storms them.
        var e = new Board().A(Power.Hatti, "tuwanuwa").A(Power.Hatti, "mira").Move("tuwanuwa", "lukka").Support("mira", "tuwanuwa", "lukka");
        e.Walls["lukka"] = 1;
        var ea = Assert.Single(e.Run().Assaults);
        Assert.True(ea.Stormed);
        Assert.Null(ea.Ground);
    }

    [Fact]
    public void A_besieger_on_rough_ground_has_the_ground_against_a_relief()
    {
        // Hatti's army stands within the walls of Arzawa's Lukka; Arzawa's relief from Mira, with Apasa's support, bounces off
        // it (2 against 1 + 1): the ground helps whoever stands his ground there (a reading; no rule asks who holds the city).
        var b = new Board().A(Power.Hatti, "lukka").A(Power.Arzawa, "mira").A(Power.Arzawa, "apasa")
            .Move("mira", "lukka").Support("apasa", "mira", "lukka");
        b.Walls["lukka"] = 1;
        b.Owners["lukka"] = Power.Arzawa;
        b.Orders["lukka"] = new BesiegeOrder("lukka");
        Assert.Equal("lukka", b.Where(b.Run(), "lukka"));
    }

    [Fact]
    public void Terrain_set_to_nothing_turns_it_off()
    {
        var b = new Board().A(Power.Arzawa, "mira").A(Power.Hatti, "tuwanuwa").A(Power.Hatti, "lukka")
            .Move("tuwanuwa", "mira").Support("lukka", "tuwanuwa", "mira");
        var r = b.Run(terrain: 0);
        Assert.Equal("mira", b.Where(r, "tuwanuwa"));
        Assert.Empty(r.GroundFights);
    }

    [Fact]
    public void The_battle_report_gives_the_grounds_share_and_the_record_marks_what_it_decided()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        // Hatti attacks Arzawa's Mira from Tuwanuwa with Lukka's support; Arzawa's army there holds.
        s.Units.Single(u => u.Province == "hattusa").Province = "tuwanuwa";
        s.Units.Single(u => u.Province == "kanesh").Province = "lukka";
        s.Walls.Remove("lukka");
        s.Owner["lukka"] = Power.Hatti;
        new TurnEngine(s).Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Hatti] = new() { Orders = [new MoveOrder("tuwanuwa", "mira"), new SupportOrder("lukka", "tuwanuwa", "mira")] },
        });
        var hatti = s.InboxOf(Power.Hatti).Single(i => i.Title == "Movements last season").Body;
        Assert.Contains("- A tuwanuwa -> mira: fails: the unit holding mira (Arzawa's army) kept its place; your strength 2 against 2, 1 of it for the rough ground of mira; so your army stays in tuwanuwa", hatti);
        var e = Assert.Single(s.Events, x => x.Kind == "terrain");
        Assert.Equal("terrain-held", e.Signal);
        Assert.Equal("Arzawa's army in Mira held against Hatti's attack from Tuwanuwa by the rough ground of mira (strength 2 against 2).", e.Text);
    }

    [Fact]
    public void A_storm_report_gives_the_grounds_share_of_the_defenders()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        // Hatti, with three armies round Arzawa's Lukka (walls 1, rough ground), gets in but cannot storm it.
        s.Owner["lukka"] = Power.Arzawa;
        s.Units.Add(new Unit { Id = "u90", Power = Power.Arzawa, Kind = UnitKind.Army, Province = "lukka" });
        s.Units.Single(u => u.Province == "hattusa").Province = "tuwanuwa";
        s.Units.Single(u => u.Province == "kanesh").Province = "kizzuwatna";
        s.Units.Single(u => u.Province == "kizzuwatna" && u.Kind == UnitKind.Fleet).Province = "cilicia";
        new TurnEngine(s).Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Hatti] = new() { Orders = [new MoveOrder("tuwanuwa", "lukka"), new SupportOrder("kizzuwatna", "tuwanuwa", "lukka"), new SupportOrder("cilicia", "tuwanuwa", "lukka")] },
        });
        var hatti = s.InboxOf(Power.Hatti).Single(i => i.Title == "Movements last season").Body;
        Assert.Contains("it got within the walls of lukka but did not storm them (strength 3 against walls 1 and defenders 2, 1 of it for the rough ground of lukka)", hatti);
        var arzawa = s.InboxOf(Power.Arzawa).Single(i => i.Title == "Movements last season").Body;
        Assert.Contains("its strength 3 against your walls 1 and defenders 2, 1 of it for the rough ground of lukka", arzawa);
        Assert.Equal(Power.Arzawa, s.Owner["lukka"]);
        Assert.Equal("terrain-beaten", Assert.Single(s.Events, x => x.Kind == "terrain").Signal);
    }
}
