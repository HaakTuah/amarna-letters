using Amarna.Engine;
using Amarna.Game.Batch;
using Amarna.Game.Bots;

namespace Amarna.Game.Tests;

/// <summary>
/// Script kings and terrain (Build order item 5; "Every feature is every seat's"): they count the ground's help to a troop
/// that stands its ground when they attack or defend, picture a troop that stood against them standing again, weigh the
/// desert's cost, and in play both hold by the ground and beat it.
/// </summary>
public class TerrainBotTests
{
    [Fact]
    public void A_board_reckons_the_ground_and_the_desert_as_the_rules_do()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        var hatti = new Board(Views.For(s, Power.Hatti));
        Assert.Equal(1, hatti.Ground("tuwanuwa", "mira"));
        Assert.Equal(1, hatti.Ground("tuwanuwa", "kizzuwatna"));
        Assert.Equal(0, hatti.Ground("lukka", "kizzuwatna"));
        // A move from a province not next to the target comes by sea: a landing.
        Assert.Equal(1, hatti.Ground("byblos", "delta"));
        // Against a blow from several sides, a crossing helps only if every side crosses one; rough ground helps against any.
        Assert.Equal(0, hatti.Ground(["tuwanuwa", "lukka"], "kizzuwatna"));
        Assert.Equal(1, hatti.Ground(["tuwanuwa", "kanesh"], "kizzuwatna"));
        Assert.Equal(1, hatti.Ground(["apasa", "seha"], "mira"));
        // The Sinai costs Hatti's armies supplies; Egypt, who holds it, crosses it freely.
        Assert.Equal(30, hatti.DesertCost("sinai"));
        Assert.Equal(0, new Board(Views.For(s, Power.Egypt)).DesertCost("sinai"));

        var off = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0, TerrainDefence = 0, DesertUpkeep = 0 });
        var flat = new Board(Views.For(off, Power.Hatti));
        Assert.Equal(0, flat.Ground("tuwanuwa", "mira"));
        Assert.Equal(0, flat.DesertCost("sinai"));
    }

    [Fact]
    public void A_script_king_brings_a_support_more_against_a_troop_on_rough_ground()
    {
        // Egypt's army holds Mira, with no troop of Egypt's near; Hatti, at war with Egypt and at peace with Arzawa, has three
        // armies round it (Tuwanuwa, Lukka and the Seha River Land).
        int Supports(int terrain)
        {
            var s = GameFactory.NewGame(4, new GameConfig { CatastropheChance = 0, TerrainDefence = terrain });
            s.Units.RemoveAll(u => u.Power == Power.Arzawa && u.Province != "apasa");
            s.Owner["mira"] = Power.Egypt;
            s.Units.Add(new Unit { Id = "u90", Power = Power.Egypt, Kind = UnitKind.Army, Province = "mira" });
            foreach (var (id, at) in new[] { ("u91", "tuwanuwa"), ("u92", "lukka"), ("u93", "seha") })
            {
                s.Owner[at] = Power.Hatti;
                s.Units.Add(new Unit { Id = id, Power = Power.Hatti, Kind = UnitKind.Army, Province = at });
            }
            s.Units.RemoveAll(u => u.Power == Power.Hatti && u.Province == "hattusa");
            var view = Views.For(s, Power.Hatti);
            var brain = new Brain(Power.Hatti, 4);
            brain.Learn(view, new Board(view));
            brain.WarTarget = Power.Egypt;
            brain.Rel[Power.Egypt].Grudge = 6;
            brain.Rel[Power.Egypt].Trust = -0.8;
            brain.Rel[Power.Arzawa].Treaty = true;
            brain.Rel[Power.Arzawa].Trust = 0.6;
            var plan = Tactics.Make(new Board(view, brain.Remembered(view)), brain);
            var move = Assert.Single(plan.Orders.Values.OfType<MoveOrder>(), m => m.To == "mira");
            return plan.Orders.Values.OfType<SupportOrder>().Count(x => x.Supported == move.Unit && x.To == "mira");
        }
        // 1 + 1 for the rough ground: three to dislodge it. Without terrain, two.
        Assert.Equal(2, Supports(terrain: 1));
        Assert.Equal(1, Supports(terrain: 0));
    }

    [Fact]
    public void A_troop_that_stood_its_ground_against_us_last_season_is_pictured_standing_again()
    {
        var s = GameFactory.NewGame(1, new GameConfig { CatastropheChance = 0 });
        s.Units.Single(u => u.Province == "hattusa").Province = "tuwanuwa";
        s.Units.Single(u => u.Province == "kanesh").Province = "lukka";
        s.Walls.Remove("lukka");
        s.Owner["lukka"] = Power.Hatti;
        var e = new TurnEngine(s);
        e.Resolve(new Dictionary<Power, TurnSubmission>
        {
            [Power.Hatti] = new() { Orders = [new MoveOrder("tuwanuwa", "mira"), new SupportOrder("lukka", "tuwanuwa", "mira")] },
        });
        e.BeginTurn();
        Assert.Equal(["mira"], Search.StoodAgainstUs(new Board(Views.For(s, Power.Hatti))));
        // Arzawa, whose army stood, has nothing of the kind.
        Assert.Empty(Search.StoodAgainstUs(new Board(Views.For(s, Power.Arzawa))));
    }

    [Fact]
    public async Task Script_kings_hold_by_the_ground_and_beat_it_in_play_and_the_games_replay_exactly()
    {
        var held = 0;
        var beaten = 0;
        // Seeds from 1 until both have been seen (at most 40): a blow that beats the ground is rare, and which games hold one
        // changes with every change to the script kings (until the script players' audit of the siege package this played
        // seeds 15 to 18).
        for (ulong seed = 1; seed <= 40 && (held == 0 || beaten == 0); seed++)
        {
            var summary = await BatchRunner.PlayAsync(seed, st =>
                new GameRunner(st, Powers.All.ToDictionary(p => p, _ => (ISeat)new ScriptLeader(st.Seed)), new ScriptMind(), new TemplateNarrator()) { WriteChronicles = false },
                verifyReplay: true, config: new GameConfig { MaxTurns = 20 });
            Assert.True(summary.ReplayMatches, $"seed {seed}");
            held += summary.Signals.GetValueOrDefault("terrain-held");
            beaten += summary.Signals.GetValueOrDefault("terrain-beaten");
        }
        Assert.True(held > 0, "no troop of a script king held by the ground");
        Assert.True(beaten > 0, "no script king beat a troop the ground helped");
    }
}
